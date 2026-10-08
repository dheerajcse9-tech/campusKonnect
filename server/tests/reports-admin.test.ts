import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import {
  DEFAULT_PASSWORD,
  api,
  createAuthedUser,
  createListing,
  refreshCookie,
} from './helpers.js';

const report = (auth: string, body: Record<string, unknown>) =>
  api().post('/api/reports').set('Authorization', auth).send(body);

async function createPostFor(authorId: string, title = 'Selling exam answers, DM me') {
  return prisma.post.create({
    data: { authorId, title, body: 'Suspicious content body', tags: [] },
  });
}

describe('reporting', () => {
  it('lets students report content, but not twice and not their own', async () => {
    const offender = await createAuthedUser();
    const reporter = await createAuthedUser();
    const listing = await createListing(offender.user.id);

    const ok = await report(reporter.auth, {
      targetType: 'LISTING',
      targetId: listing.id,
      reason: 'SCAM',
    });
    expect(ok.status).toBe(201);
    expect(ok.body.report.status).toBe('OPEN');

    const dup = await report(reporter.auth, {
      targetType: 'LISTING',
      targetId: listing.id,
      reason: 'SPAM',
    });
    expect(dup.status).toBe(409);

    const own = await report(offender.auth, {
      targetType: 'LISTING',
      targetId: listing.id,
      reason: 'SPAM',
    });
    expect(own.status).toBe(400);

    const self = await report(reporter.auth, {
      targetType: 'USER',
      targetId: reporter.user.id,
      reason: 'SPAM',
    });
    expect(self.status).toBe(400);
  });

  it('requires details for "other" and an existing target', async () => {
    const offender = await createAuthedUser();
    const reporter = await createAuthedUser();
    const other = await report(reporter.auth, {
      targetType: 'USER',
      targetId: offender.user.id,
      reason: 'OTHER',
    });
    expect(other.status).toBe(400);
    const missing = await report(reporter.auth, {
      targetType: 'POST',
      targetId: '00000000-0000-4000-8000-000000000000',
      reason: 'SPAM',
    });
    expect(missing.status).toBe(404);
  });
});

describe('admin authorisation', () => {
  it('rejects students on every admin route', async () => {
    const student = await createAuthedUser();
    const target = await createAuthedUser();
    const routes: [string, string][] = [
      ['get', '/api/admin/stats'],
      ['get', '/api/admin/users'],
      ['get', '/api/admin/reports'],
      ['get', '/api/admin/audit-logs'],
      ['post', `/api/admin/users/${target.user.id}/ban`],
    ];
    for (const [method, path] of routes) {
      const res = await (
        method === 'get' ? api().get(path) : api().post(path).send({ reason: 'testing' })
      ).set('Authorization', student.auth);
      expect(res.status, `${method} ${path}`).toBe(403);
    }
    expect((await api().get('/api/admin/stats')).status).toBe(401);
  });
});

describe('banning users', () => {
  it('blocks the user, revokes sessions, unwinds deals and audits the action', async () => {
    const admin = await createAuthedUser({ role: 'ADMIN' });
    const seller = await createAuthedUser();
    const buyer = await createAuthedUser();

    const login = await api()
      .post('/api/auth/login')
      .send({ email: buyer.user.email, password: DEFAULT_PASSWORD });
    const buyerCookie = refreshCookie(login);

    const listing = await createListing(seller.user.id);
    const created = await api()
      .post('/api/requests')
      .set('Authorization', buyer.auth)
      .send({ listingId: listing.id });
    await api()
      .post(`/api/requests/${created.body.request.id}/approve`)
      .set('Authorization', seller.auth);

    const banned = await api()
      .post(`/api/admin/users/${buyer.user.id}/ban`)
      .set('Authorization', admin.auth)
      .send({ reason: 'Repeated scam attempts' });
    expect(banned.status).toBe(204);

    expect((await api().get('/api/users/me').set('Authorization', buyer.auth)).status).toBe(403);
    expect(
      (
        await api()
          .post('/api/auth/refresh')
          .set('X-Requested-With', 'fetch')
          .set('Cookie', buyerCookie)
      ).status,
    ).toBe(401);

    const request = await prisma.transactionRequest.findUniqueOrThrow({
      where: { id: created.body.request.id },
    });
    expect(request.status).toBe('CANCELLED');
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe(
      'ACTIVE',
    );
    expect(
      await prisma.notification.count({
        where: { userId: seller.user.id, type: 'REQUEST_CANCELLED' },
      }),
    ).toBe(1);

    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: 'USER_BANNED' } });
    expect(log).toMatchObject({ actorId: admin.user.id, targetId: buyer.user.id });
    expect(log.metadata).toEqual({ reason: 'Repeated scam attempts' });

    const again = await api()
      .post(`/api/admin/users/${buyer.user.id}/ban`)
      .set('Authorization', admin.auth)
      .send({ reason: 'Repeated scam attempts' });
    expect(again.status).toBe(409);

    const unban = await api()
      .post(`/api/admin/users/${buyer.user.id}/unban`)
      .set('Authorization', admin.auth);
    expect(unban.status).toBe(204);
    expect((await api().get('/api/users/me').set('Authorization', buyer.auth)).status).toBe(200);
  });

  it('cannot ban yourself or another admin', async () => {
    const admin = await createAuthedUser({ role: 'ADMIN' });
    const otherAdmin = await createAuthedUser({ role: 'ADMIN' });
    const self = await api()
      .post(`/api/admin/users/${admin.user.id}/ban`)
      .set('Authorization', admin.auth)
      .send({ reason: 'oops oops' });
    expect(self.status).toBe(400);
    const peer = await api()
      .post(`/api/admin/users/${otherAdmin.user.id}/ban`)
      .set('Authorization', admin.auth)
      .send({ reason: 'power grab' });
    expect(peer.status).toBe(403);
  });

  it('lists and searches users', async () => {
    const admin = await createAuthedUser({ role: 'ADMIN' });
    await createAuthedUser({ name: 'Ravi Kumar' });
    await createAuthedUser({ name: 'Meera', status: 'BANNED' });
    const search = await api().get('/api/admin/users?q=ravi').set('Authorization', admin.auth);
    expect(search.body.items.map((u: { name: string }) => u.name)).toEqual(['Ravi Kumar']);
    const banned = await api()
      .get('/api/admin/users?status=BANNED')
      .set('Authorization', admin.auth);
    expect(banned.body.total).toBe(1);
  });
});

describe('report queue', () => {
  it('resolving removes content, bans the owner and closes every report on the target', async () => {
    const admin = await createAuthedUser({ role: 'ADMIN' });
    const offender = await createAuthedUser();
    const r1 = await createAuthedUser();
    const r2 = await createAuthedUser();
    const post = await createPostFor(offender.user.id);

    const first = await report(r1.auth, { targetType: 'POST', targetId: post.id, reason: 'SCAM' });
    await report(r2.auth, { targetType: 'POST', targetId: post.id, reason: 'INAPPROPRIATE' });

    const queue = await api().get('/api/admin/reports').set('Authorization', admin.auth);
    expect(queue.body.total).toBe(2);
    expect(queue.body.items[0]).toMatchObject({
      target: { type: 'POST', ownerId: offender.user.id, label: post.title, active: true },
      openReportsOnTarget: 2,
      reporter: { id: r1.user.id },
    });

    const resolved = await api()
      .post(`/api/admin/reports/${first.body.report.id}/resolve`)
      .set('Authorization', admin.auth)
      .send({ note: 'Academic dishonesty', removeContent: true, banUser: true });
    expect(resolved.status).toBe(204);

    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).status).toBe(
      'REMOVED',
    );
    expect((await prisma.user.findUniqueOrThrow({ where: { id: offender.user.id } })).status).toBe(
      'BANNED',
    );
    expect(await prisma.report.count({ where: { status: 'RESOLVED' } })).toBe(2);
    for (const reporter of [r1, r2]) {
      expect(
        await prisma.notification.count({
          where: { userId: reporter.user.id, type: 'REPORT_UPDATE' },
        }),
      ).toBe(1);
    }

    const actions = (await prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } })).map(
      (l) => l.action,
    );
    expect(actions).toEqual(['POST_REMOVED', 'USER_BANNED', 'REPORT_RESOLVED']);

    const twice = await api()
      .post(`/api/admin/reports/${first.body.report.id}/resolve`)
      .set('Authorization', admin.auth)
      .send({});
    expect(twice.status).toBe(409);
  });

  it('rolls back everything if any part of a resolution fails', async () => {
    const admin = await createAuthedUser({ role: 'ADMIN' });
    const target = await createAuthedUser();
    const reporter = await createAuthedUser();
    const filed = await report(reporter.auth, {
      targetType: 'USER',
      targetId: target.user.id,
      reason: 'HARASSMENT',
    });

    // removeContent is invalid for a USER target, so nothing should change.
    const res = await api()
      .post(`/api/admin/reports/${filed.body.report.id}/resolve`)
      .set('Authorization', admin.auth)
      .send({ removeContent: true });
    expect(res.status).toBe(400);
    expect(
      (await prisma.report.findUniqueOrThrow({ where: { id: filed.body.report.id } })).status,
    ).toBe('OPEN');
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it('dismisses a report and tells the reporter', async () => {
    const admin = await createAuthedUser({ role: 'ADMIN' });
    const author = await createAuthedUser();
    const reporter = await createAuthedUser();
    const post = await createPostFor(author.user.id, 'Perfectly fine post');
    const filed = await report(reporter.auth, {
      targetType: 'POST',
      targetId: post.id,
      reason: 'SPAM',
    });

    const res = await api()
      .post(`/api/admin/reports/${filed.body.report.id}/dismiss`)
      .set('Authorization', admin.auth)
      .send({ note: 'Not spam' });
    expect(res.status).toBe(204);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).status).toBe('ACTIVE');
    const dismissed = await api()
      .get('/api/admin/reports?status=DISMISSED')
      .set('Authorization', admin.auth);
    expect(dismissed.body.items[0]).toMatchObject({
      resolutionNote: 'Not spam',
      resolvedBy: { id: admin.user.id },
    });
  });
});

describe('direct content removal', () => {
  it('removes a reserved listing, cancels its deal and notifies everyone', async () => {
    const admin = await createAuthedUser({ role: 'ADMIN' });
    const seller = await createAuthedUser();
    const buyer = await createAuthedUser();
    const listing = await createListing(seller.user.id);
    const created = await api()
      .post('/api/requests')
      .set('Authorization', buyer.auth)
      .send({ listingId: listing.id });
    await api()
      .post(`/api/requests/${created.body.request.id}/approve`)
      .set('Authorization', seller.auth);

    const res = await api()
      .post(`/api/admin/listings/${listing.id}/remove`)
      .set('Authorization', admin.auth)
      .send({ reason: 'Prohibited item' });
    expect(res.status).toBe(204);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe(
      'REMOVED',
    );
    expect(
      (
        await prisma.transactionRequest.findUniqueOrThrow({
          where: { id: created.body.request.id },
        })
      ).status,
    ).toBe('CANCELLED');
    expect(
      await prisma.notification.count({ where: { userId: seller.user.id, type: 'SYSTEM' } }),
    ).toBe(1);

    const audit = await api().get('/api/admin/audit-logs').set('Authorization', admin.auth);
    expect(audit.body.items[0]).toMatchObject({
      action: 'LISTING_REMOVED',
      targetId: listing.id,
      actor: { id: admin.user.id },
    });
  });

  it('removes a comment and keeps the counter in step', async () => {
    const admin = await createAuthedUser({ role: 'ADMIN' });
    const author = await createAuthedUser();
    const post = await createPostFor(author.user.id, 'A normal question');
    const comment = await prisma.comment.create({
      data: { postId: post.id, authorId: author.user.id, body: 'rude' },
    });
    await prisma.post.update({ where: { id: post.id }, data: { commentCount: 1 } });

    const res = await api()
      .post(`/api/admin/comments/${comment.id}/remove`)
      .set('Authorization', admin.auth)
      .send({ reason: 'Harassment' });
    expect(res.status).toBe(204);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).commentCount).toBe(0);
  });

  it('reports dashboard statistics', async () => {
    const admin = await createAuthedUser({ role: 'ADMIN' });
    const seller = await createAuthedUser();
    await createListing(seller.user.id);
    const res = await api().get('/api/admin/stats').set('Authorization', admin.auth);
    expect(res.body).toMatchObject({
      users: { total: 2, banned: 0 },
      listings: { active: 1, sold: 0 },
      reports: { open: 0 },
    });
  });
});
