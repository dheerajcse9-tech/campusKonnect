import type { Prisma } from '@prisma/client';
import type { Actor } from '../../lib/auth-context.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { paginated, toSkipTake } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { notify } from '../notifications/notifications.service.js';
import { publicUserSelect } from '../users/user.mapper.js';
import type { CreatePostInput, ListPostsQuery, UpdatePostInput } from './community.schemas.js';

const authorSelect = {
  select: { id: true, name: true, avatarUrl: true, department: true, year: true },
};

const postSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  tags: true,
  upvoteCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  author: authorSelect,
} satisfies Prisma.PostSelect;

const visiblePost = {
  status: 'ACTIVE',
  author: { status: 'ACTIVE' },
} satisfies Prisma.PostWhereInput;

async function upvotedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const votes = await prisma.postVote.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(votes.map((v) => v.postId));
}

export async function listPosts(actor: Actor, query: ListPostsQuery) {
  const where: Prisma.PostWhereInput = {
    ...visiblePost,
    type: query.type,
    authorId: query.authorId,
    ...(query.tag ? { tags: { has: query.tag } } : {}),
  };
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { body: { contains: query.q, mode: 'insensitive' } },
      { tags: { has: query.q.toLowerCase() } },
    ];
  }
  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    query.sort === 'top'
      ? [{ upvoteCount: 'desc' }, { commentCount: 'desc' }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }];

  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      orderBy: [...orderBy, { id: 'asc' }],
      select: postSelect,
      ...toSkipTake(query),
    }),
    prisma.post.count({ where }),
  ]);
  const upvoted = await upvotedPostIds(
    actor.id,
    posts.map((p) => p.id),
  );
  const items = posts.map((post) => ({ ...post, viewerHasUpvoted: upvoted.has(post.id) }));
  return paginated(items, total, query);
}

/** Most used tags across active posts, for discovery chips in the UI. */
export async function popularTags(limit = 15) {
  return prisma.$queryRaw<{ tag: string; count: number }[]>`
    SELECT tag, COUNT(*)::int AS count
    FROM "Post", unnest(tags) AS tag
    WHERE status = 'ACTIVE'
    GROUP BY tag
    ORDER BY count DESC, tag ASC
    LIMIT ${limit}`;
}

export async function getPost(postId: string, actor: Actor) {
  const post = await prisma.post.findFirst({
    where: { id: postId, ...visiblePost },
    select: postSelect,
  });
  if (!post) throw new NotFoundError('Post');

  // The most helpful answers rise to the top (FR-6.4).
  const comments = await prisma.comment.findMany({
    where: { postId, status: 'ACTIVE', author: { status: 'ACTIVE' } },
    orderBy: [{ upvoteCount: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      body: true,
      upvoteCount: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      author: authorSelect,
    },
  });

  const [postVote, commentVotes] = await Promise.all([
    prisma.postVote.findUnique({ where: { userId_postId: { userId: actor.id, postId } } }),
    prisma.commentVote.findMany({
      where: { userId: actor.id, commentId: { in: comments.map((c) => c.id) } },
      select: { commentId: true },
    }),
  ]);
  const votedComments = new Set(commentVotes.map((v) => v.commentId));

  return {
    ...post,
    viewerHasUpvoted: postVote !== null,
    isAuthor: post.authorId === actor.id,
    comments: comments.map((comment) => ({
      ...comment,
      viewerHasUpvoted: votedComments.has(comment.id),
      isAuthor: comment.authorId === actor.id,
      isPostAuthor: comment.authorId === post.authorId,
    })),
  };
}

export async function createPost(actor: Actor, input: CreatePostInput) {
  return prisma.post.create({
    data: { authorId: actor.id, ...input },
    select: postSelect,
  });
}

async function findOwnPost(postId: string, actor: Actor) {
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'ACTIVE' } });
  if (!post) throw new NotFoundError('Post');
  if (post.authorId !== actor.id) throw new ForbiddenError('Only the author can change this post');
  return post;
}

export async function updatePost(postId: string, actor: Actor, input: UpdatePostInput) {
  await findOwnPost(postId, actor);
  return prisma.post.update({ where: { id: postId }, data: input, select: postSelect });
}

export async function deletePost(postId: string, actor: Actor): Promise<void> {
  await findOwnPost(postId, actor);
  // Soft delete keeps evidence for any open reports.
  await prisma.post.update({ where: { id: postId }, data: { status: 'REMOVED' } });
}

export async function togglePostUpvote(postId: string, actor: Actor) {
  const post = await prisma.post.findFirst({ where: { id: postId, ...visiblePost } });
  if (!post) throw new NotFoundError('Post');
  if (post.authorId === actor.id) throw new BadRequestError("You can't upvote your own post");

  return prisma.$transaction(async (tx) => {
    const removed = await tx.postVote.deleteMany({ where: { userId: actor.id, postId } });
    if (removed.count > 0) {
      const updated = await tx.post.update({
        where: { id: postId },
        data: { upvoteCount: { decrement: 1 } },
      });
      return { upvoted: false, upvoteCount: updated.upvoteCount };
    }
    await tx.postVote.create({ data: { userId: actor.id, postId } });
    const updated = await tx.post.update({
      where: { id: postId },
      data: { upvoteCount: { increment: 1 } },
    });
    return { upvoted: true, upvoteCount: updated.upvoteCount };
  });
}

export async function addComment(postId: string, actor: Actor, body: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, ...visiblePost } });
  if (!post) throw new NotFoundError('Post');

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: { postId, authorId: actor.id, body },
      include: { author: { select: publicUserSelect } },
    });
    await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
    if (post.authorId !== actor.id) {
      await notify(
        {
          userId: post.authorId,
          type: 'NEW_COMMENT',
          title: `${comment.author.name} ${post.type === 'DOUBT' ? 'answered your doubt' : 'commented on your post'}`,
          body: post.title,
          link: `/community/${postId}`,
        },
        tx,
      );
    }
    return comment;
  });
}

async function findOwnComment(commentId: string, actor: Actor) {
  const comment = await prisma.comment.findFirst({ where: { id: commentId, status: 'ACTIVE' } });
  if (!comment) throw new NotFoundError('Comment');
  if (comment.authorId !== actor.id)
    throw new ForbiddenError('Only the author can change this comment');
  return comment;
}

export async function updateComment(commentId: string, actor: Actor, body: string) {
  await findOwnComment(commentId, actor);
  return prisma.comment.update({ where: { id: commentId }, data: { body } });
}

export async function removeComment(commentId: string, actor: Actor): Promise<void> {
  const comment = await findOwnComment(commentId, actor);
  await softDeleteComment(comment);
}

/** Soft-deletes a comment and keeps the post's comment counter in step. Used by authors and admins. */
export async function softDeleteComment(comment: { id: string; postId: string }): Promise<void> {
  await prisma.$transaction([
    prisma.comment.update({ where: { id: comment.id }, data: { status: 'REMOVED' } }),
    prisma.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } }),
  ]);
}

export async function toggleCommentUpvote(commentId: string, actor: Actor) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, status: 'ACTIVE', post: { status: 'ACTIVE' } },
  });
  if (!comment) throw new NotFoundError('Comment');
  if (comment.authorId === actor.id) throw new BadRequestError("You can't upvote your own comment");

  return prisma.$transaction(async (tx) => {
    const removed = await tx.commentVote.deleteMany({ where: { userId: actor.id, commentId } });
    if (removed.count > 0) {
      const updated = await tx.comment.update({
        where: { id: commentId },
        data: { upvoteCount: { decrement: 1 } },
      });
      return { upvoted: false, upvoteCount: updated.upvoteCount };
    }
    await tx.commentVote.create({ data: { userId: actor.id, commentId } });
    const updated = await tx.comment.update({
      where: { id: commentId },
      data: { upvoteCount: { increment: 1 } },
    });
    return { upvoted: true, upvoteCount: updated.upvoteCount };
  });
}
