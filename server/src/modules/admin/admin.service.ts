import type { Prisma, ReportTargetType } from '@prisma/client';
import { recordAudit } from '../../lib/audit.js';
import type { Actor } from '../../lib/auth-context.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { paginated, toSkipTake } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { notify, type NotificationInput } from '../notifications/notifications.service.js';
import { findReportTarget } from '../reports/report-targets.js';
import { OPEN_REQUEST_STATUSES } from '../transactions/request-state.js';
import { closeOpenRequests } from '../transactions/transactions.service.js';
import type {
  ListAuditQuery,
  ListReportsQuery,
  ListUsersQuery,
  ResolveReportInput,
} from './admin.schemas.js';

type Tx = Prisma.TransactionClient;

// ───────────────────────────── Dashboard ─────────────────────────────

export async function getStats() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    totalUsers,
    bannedUsers,
    newUsersThisWeek,
    activeListings,
    soldListings,
    pendingRequests,
    completedDeals,
    posts,
    comments,
    openReports,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'BANNED' } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.listing.count({ where: { status: 'ACTIVE' } }),
    prisma.listing.count({ where: { status: 'SOLD' } }),
    prisma.transactionRequest.count({ where: { status: 'PENDING' } }),
    prisma.transactionRequest.count({ where: { status: 'COMPLETED' } }),
    prisma.post.count({ where: { status: 'ACTIVE' } }),
    prisma.comment.count({ where: { status: 'ACTIVE' } }),
    prisma.report.count({ where: { status: 'OPEN' } }),
  ]);
  return {
    users: { total: totalUsers, banned: bannedUsers, newThisWeek: newUsersThisWeek },
    listings: { active: activeListings, sold: soldListings },
    requests: { pending: pendingRequests, completed: completedDeals },
    community: { posts, comments },
    reports: { open: openReports },
  };
}

// ─────────────────────────────── Users ───────────────────────────────

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = { status: query.status, role: query.role };
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        year: true,
        role: true,
        status: true,
        banReason: true,
        emailVerifiedAt: true,
        createdAt: true,
        _count: { select: { listings: true, posts: true } },
      },
      ...toSkipTake(query),
    }),
    prisma.user.count({ where }),
  ]);
  return paginated(items, total, query);
}

/**
 * Bans a user: blocks sign-in immediately, revokes sessions, and unwinds their
 * open deals so the other parties aren't left waiting.
 */
async function banUserTx(tx: Tx, actor: Actor, userId: string, reason: string): Promise<void> {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');
  if (user.id === actor.id) throw new BadRequestError("You can't ban yourself");
  if (user.role === 'ADMIN')
    throw new ForbiddenError('Administrators cannot be banned from the dashboard');
  if (user.status === 'BANNED') throw new ConflictError('This user is already banned');

  await tx.user.update({ where: { id: userId }, data: { status: 'BANNED', banReason: reason } });
  await tx.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const openDeals = await tx.transactionRequest.findMany({
    where: {
      status: { in: [...OPEN_REQUEST_STATUSES] },
      OR: [{ requesterId: userId }, { sellerId: userId }],
    },
    include: { listing: { select: { title: true } } },
  });
  if (openDeals.length > 0) {
    await tx.transactionRequest.updateMany({
      where: { id: { in: openDeals.map((d) => d.id) } },
      data: { status: 'CANCELLED', respondedAt: new Date() },
    });
    // Items reserved for the banned buyer go back on the market.
    const reservedForBuyer = openDeals
      .filter((d) => d.requesterId === userId && d.status === 'APPROVED')
      .map((d) => d.listingId);
    await tx.listing.updateMany({
      where: { id: { in: reservedForBuyer }, status: 'RESERVED' },
      data: { status: 'ACTIVE' },
    });
    const notifications: NotificationInput[] = openDeals.map((d) => ({
      userId: d.requesterId === userId ? d.sellerId : d.requesterId,
      type: 'REQUEST_CANCELLED',
      title: `Your deal for "${d.listing.title}" was cancelled because the other account was suspended`,
      link: `/requests/${d.id}`,
    }));
    await notify(notifications, tx);
  }
  // The banned seller's own listings are hidden from the feed; un-reserve them so
  // they come back in a consistent state if the ban is ever lifted.
  await tx.listing.updateMany({
    where: { sellerId: userId, status: 'RESERVED' },
    data: { status: 'ACTIVE' },
  });

  await recordAudit(
    {
      actorId: actor.id,
      action: 'USER_BANNED',
      targetType: 'USER',
      targetId: userId,
      metadata: { reason },
    },
    tx,
  );
}

export async function banUser(actor: Actor, userId: string, reason: string): Promise<void> {
  await prisma.$transaction((tx) => banUserTx(tx, actor, userId, reason));
}

export async function unbanUser(actor: Actor, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (user.status !== 'BANNED') throw new ConflictError('This user is not banned');
    await tx.user.update({ where: { id: userId }, data: { status: 'ACTIVE', banReason: null } });
    await recordAudit(
      { actorId: actor.id, action: 'USER_UNBANNED', targetType: 'USER', targetId: userId },
      tx,
    );
  });
}

// ────────────────────────────── Content ──────────────────────────────

async function removeListingTx(
  tx: Tx,
  actor: Actor,
  listingId: string,
  reason: string,
): Promise<void> {
  const listing = await tx.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new NotFoundError('Listing');
  if (listing.status === 'REMOVED') throw new ConflictError('This listing was already removed');

  await closeOpenRequests(tx, listingId, 'CANCELLED', 'was removed by the moderators');
  await tx.listing.update({ where: { id: listingId }, data: { status: 'REMOVED' } });
  await notify(
    {
      userId: listing.sellerId,
      type: 'SYSTEM',
      title: `Your listing "${listing.title}" was removed by the moderators`,
      body: reason,
    },
    tx,
  );
  await recordAudit(
    {
      actorId: actor.id,
      action: 'LISTING_REMOVED',
      targetType: 'LISTING',
      targetId: listingId,
      metadata: { reason },
    },
    tx,
  );
}

async function removePostTx(tx: Tx, actor: Actor, postId: string, reason: string): Promise<void> {
  const post = await tx.post.findUnique({ where: { id: postId } });
  if (!post) throw new NotFoundError('Post');
  if (post.status === 'REMOVED') throw new ConflictError('This post was already removed');

  await tx.post.update({ where: { id: postId }, data: { status: 'REMOVED' } });
  await notify(
    {
      userId: post.authorId,
      type: 'SYSTEM',
      title: `Your post "${post.title}" was removed by the moderators`,
      body: reason,
    },
    tx,
  );
  await recordAudit(
    {
      actorId: actor.id,
      action: 'POST_REMOVED',
      targetType: 'POST',
      targetId: postId,
      metadata: { reason },
    },
    tx,
  );
}

async function removeCommentTx(
  tx: Tx,
  actor: Actor,
  commentId: string,
  reason: string,
): Promise<void> {
  const comment = await tx.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new NotFoundError('Comment');
  if (comment.status === 'REMOVED') throw new ConflictError('This comment was already removed');

  await tx.comment.update({ where: { id: commentId }, data: { status: 'REMOVED' } });
  await tx.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } });
  await notify(
    {
      userId: comment.authorId,
      type: 'SYSTEM',
      title: 'One of your comments was removed by the moderators',
      body: reason,
      link: `/community/${comment.postId}`,
    },
    tx,
  );
  await recordAudit(
    {
      actorId: actor.id,
      action: 'COMMENT_REMOVED',
      targetType: 'COMMENT',
      targetId: commentId,
      metadata: { reason },
    },
    tx,
  );
}

export async function removeContent(
  actor: Actor,
  type: Exclude<ReportTargetType, 'USER'>,
  id: string,
  reason: string,
): Promise<void> {
  await prisma.$transaction((tx) => {
    if (type === 'LISTING') return removeListingTx(tx, actor, id, reason);
    if (type === 'POST') return removePostTx(tx, actor, id, reason);
    return removeCommentTx(tx, actor, id, reason);
  });
}

// ────────────────────────────── Reports ──────────────────────────────

export async function listReports(query: ListReportsQuery) {
  const where: Prisma.ReportWhereInput = { status: query.status, targetType: query.targetType };
  const [reports, total] = await prisma.$transaction([
    prisma.report.findMany({
      where,
      // Oldest open reports first, so nothing waits too long.
      orderBy: { createdAt: query.status === 'OPEN' ? 'asc' : 'desc' },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
      ...toSkipTake(query),
    }),
    prisma.report.count({ where }),
  ]);

  const items = await Promise.all(
    reports.map(async (report) => {
      const target = await findReportTarget(report.targetType, report.targetId);
      const sameTargetOpen = await prisma.report.count({
        where: { targetType: report.targetType, targetId: report.targetId, status: 'OPEN' },
      });
      return { ...report, target, openReportsOnTarget: sameTargetOpen };
    }),
  );
  return paginated(items, total, query);
}

/**
 * Resolves a report, optionally removing the content and/or banning its owner,
 * all in one transaction. Every other open report on the same target is resolved
 * with it, and every reporter is told action was taken.
 */
export async function resolveReport(actor: Actor, reportId: string, input: ResolveReportInput) {
  await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError('Report');
    if (report.status !== 'OPEN') throw new ConflictError('This report has already been handled');

    const target = await findReportTarget(report.targetType, report.targetId);
    if (!target) throw new NotFoundError('Reported item');
    const reason =
      input.note ?? `Violation reported for ${report.reason.toLowerCase().replace('_', ' ')}`;

    if (input.removeContent) {
      if (report.targetType === 'USER')
        throw new BadRequestError('To act on a user, ban them instead');
      if (target.active) {
        if (report.targetType === 'LISTING') await removeListingTx(tx, actor, target.id, reason);
        if (report.targetType === 'POST') await removePostTx(tx, actor, target.id, reason);
        if (report.targetType === 'COMMENT') await removeCommentTx(tx, actor, target.id, reason);
      }
    }
    if (input.banUser) {
      const owner = await tx.user.findUniqueOrThrow({ where: { id: target.ownerId } });
      if (owner.status !== 'BANNED') await banUserTx(tx, actor, owner.id, reason);
    }

    const related = await tx.report.findMany({
      where: { targetType: report.targetType, targetId: report.targetId, status: 'OPEN' },
      select: { id: true, reporterId: true },
    });
    await tx.report.updateMany({
      where: { id: { in: related.map((r) => r.id) } },
      data: {
        status: 'RESOLVED',
        resolvedById: actor.id,
        resolutionNote: input.note ?? null,
        resolvedAt: new Date(),
      },
    });
    await notify(
      [...new Set(related.map((r) => r.reporterId))].map((reporterId) => ({
        userId: reporterId,
        type: 'REPORT_UPDATE' as const,
        title: 'Thanks for your report. Our moderators have taken action.',
      })),
      tx,
    );
    await recordAudit(
      {
        actorId: actor.id,
        action: 'REPORT_RESOLVED',
        targetType: 'REPORT',
        targetId: reportId,
        metadata: {
          reportTargetType: report.targetType,
          reportTargetId: report.targetId,
          removeContent: input.removeContent,
          banUser: input.banUser,
          note: input.note ?? null,
          reportsClosed: related.length,
        },
      },
      tx,
    );
  });
}

export async function dismissReport(actor: Actor, reportId: string, note?: string) {
  await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError('Report');
    if (report.status !== 'OPEN') throw new ConflictError('This report has already been handled');

    await tx.report.update({
      where: { id: reportId },
      data: {
        status: 'DISMISSED',
        resolvedById: actor.id,
        resolutionNote: note ?? null,
        resolvedAt: new Date(),
      },
    });
    await notify(
      {
        userId: report.reporterId,
        type: 'REPORT_UPDATE',
        title: 'Thanks for your report. Our moderators reviewed it and found no violation.',
      },
      tx,
    );
    await recordAudit(
      {
        actorId: actor.id,
        action: 'REPORT_DISMISSED',
        targetType: 'REPORT',
        targetId: reportId,
        metadata: { note: note ?? null },
      },
      tx,
    );
  });
}

// ─────────────────────────────── Audit ───────────────────────────────

export async function listAuditLogs(query: ListAuditQuery) {
  const where: Prisma.AuditLogWhereInput = { action: query.action, actorId: query.actorId };
  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true, email: true } } },
      ...toSkipTake(query),
    }),
    prisma.auditLog.count({ where }),
  ]);
  return paginated(items, total, query);
}
