import type { ReportTargetType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  /** The user responsible for the content (or the user themself). */
  ownerId: string;
  /** Short human-readable description for the moderation queue. */
  label: string;
  /** Where an admin can look at it in the web app. */
  link: string;
  /** Whether the content is still visible on the platform. */
  active: boolean;
}

/** Resolves a polymorphic report target to its owner and a summary, or null if it doesn't exist. */
export async function findReportTarget(
  type: ReportTargetType,
  id: string,
): Promise<ReportTarget | null> {
  switch (type) {
    case 'USER': {
      const user = await prisma.user.findUnique({ where: { id } });
      return user
        ? {
            type,
            id,
            ownerId: user.id,
            label: `${user.name} (${user.email})`,
            link: `/users/${user.id}`,
            active: user.status === 'ACTIVE',
          }
        : null;
    }
    case 'LISTING': {
      const listing = await prisma.listing.findUnique({ where: { id } });
      return listing
        ? {
            type,
            id,
            ownerId: listing.sellerId,
            label: listing.title,
            link: `/listings/${listing.id}`,
            active: listing.status !== 'REMOVED',
          }
        : null;
    }
    case 'POST': {
      const post = await prisma.post.findUnique({ where: { id } });
      return post
        ? {
            type,
            id,
            ownerId: post.authorId,
            label: post.title,
            link: `/community/${post.id}`,
            active: post.status === 'ACTIVE',
          }
        : null;
    }
    case 'COMMENT': {
      const comment = await prisma.comment.findUnique({ where: { id } });
      return comment
        ? {
            type,
            id,
            ownerId: comment.authorId,
            label: comment.body.length > 120 ? `${comment.body.slice(0, 117)}...` : comment.body,
            link: `/community/${comment.postId}`,
            active: comment.status === 'ACTIVE',
          }
        : null;
    }
  }
}
