import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, createAuthedUser } from './helpers.js';

const doubt = {
  type: 'DOUBT',
  title: 'Which elective is better for ML: DL or NLP?',
  body: 'I am in 3rd year CSE and want to get into ML research. Which elective helps more?',
  tags: ['Electives', '#machine learning', 'electives'],
};

async function createPost(auth: string, body: Record<string, unknown> = doubt) {
  return api().post('/api/posts').set('Authorization', auth).send(body);
}

describe('Ask-a-Senior journey', () => {
  it('post a doubt → seniors reply → best answer rises → stays searchable', async () => {
    const junior = await createAuthedUser({ name: 'Junior' });
    const senior1 = await createAuthedUser({ name: 'Senior One' });
    const senior2 = await createAuthedUser({ name: 'Senior Two' });
    const voter = await createAuthedUser();

    const created = await createPost(junior.auth);
    expect(created.status).toBe(201);
    expect(created.body.post).toMatchObject({
      type: 'DOUBT',
      tags: ['electives', 'machine-learning'],
    });
    const postId = created.body.post.id;

    const reply = (auth: string, body: string) =>
      api().post(`/api/posts/${postId}/comments`).set('Authorization', auth).send({ body });
    const first = await reply(senior1.auth, 'Take DL, it covers the fundamentals.');
    const second = await reply(senior2.auth, 'NLP if you like language; the prof is great.');
    expect(first.status).toBe(201);

    // The junior is notified about each answer.
    const notes = await prisma.notification.findMany({ where: { userId: junior.user.id } });
    expect(notes).toHaveLength(2);
    expect(notes[0].title).toContain('answered your doubt');

    // Upvoting the second answer moves it to the top.
    const up = await api()
      .post(`/api/comments/${second.body.comment.id}/upvote`)
      .set('Authorization', voter.auth);
    expect(up.body).toEqual({ upvoted: true, upvoteCount: 1 });

    const detail = await api().get(`/api/posts/${postId}`).set('Authorization', voter.auth);
    expect(detail.body.post.commentCount).toBe(2);
    expect(detail.body.post.comments.map((c: { body: string }) => c.body)).toEqual([
      'NLP if you like language; the prof is great.',
      'Take DL, it covers the fundamentals.',
    ]);
    expect(detail.body.post.comments[0].viewerHasUpvoted).toBe(true);

    // A later junior finds it by search, by tag, and by type.
    const later = await createAuthedUser();
    const search = await api().get('/api/posts?q=elective').set('Authorization', later.auth);
    expect(search.body.items.map((p: { id: string }) => p.id)).toEqual([postId]);
    const byTag = await api()
      .get('/api/posts?tag=machine-learning')
      .set('Authorization', later.auth);
    expect(byTag.body.total).toBe(1);
    const discussions = await api()
      .get('/api/posts?type=DISCUSSION')
      .set('Authorization', later.auth);
    expect(discussions.body.total).toBe(0);
  });
});

describe('posts', () => {
  it('sorts by newest or top and reports popular tags', async () => {
    const a = await createAuthedUser();
    const b = await createAuthedUser();
    const older = await createPost(a.auth, {
      ...doubt,
      title: 'Older but popular post',
      tags: ['hostel'],
    });
    await createPost(a.auth, {
      ...doubt,
      title: 'Newer post with no votes',
      tags: ['hostel', 'food'],
    });
    await api().post(`/api/posts/${older.body.post.id}/upvote`).set('Authorization', b.auth);

    const newest = await api().get('/api/posts').set('Authorization', b.auth);
    expect(newest.body.items[0].title).toBe('Newer post with no votes');
    expect(newest.body.items[1].viewerHasUpvoted).toBe(true);

    const top = await api().get('/api/posts?sort=top').set('Authorization', b.auth);
    expect(top.body.items[0].title).toBe('Older but popular post');

    const tags = await api().get('/api/posts/tags').set('Authorization', b.auth);
    expect(tags.body.items[0]).toEqual({ tag: 'hostel', count: 2 });
  });

  it('toggles upvotes and forbids upvoting your own post', async () => {
    const author = await createAuthedUser();
    const fan = await createAuthedUser();
    const { body } = await createPost(author.auth);
    const id = body.post.id;

    expect(
      (await api().post(`/api/posts/${id}/upvote`).set('Authorization', author.auth)).status,
    ).toBe(400);
    const on = await api().post(`/api/posts/${id}/upvote`).set('Authorization', fan.auth);
    expect(on.body).toEqual({ upvoted: true, upvoteCount: 1 });
    const off = await api().post(`/api/posts/${id}/upvote`).set('Authorization', fan.auth);
    expect(off.body).toEqual({ upvoted: false, upvoteCount: 0 });
  });

  it('lets only the author edit or delete, and hides deleted posts', async () => {
    const author = await createAuthedUser();
    const other = await createAuthedUser();
    const { body } = await createPost(author.auth);
    const id = body.post.id;

    const forbidden = await api()
      .patch(`/api/posts/${id}`)
      .set('Authorization', other.auth)
      .send({ title: 'Hijacked title' });
    expect(forbidden.status).toBe(403);

    const edited = await api()
      .patch(`/api/posts/${id}`)
      .set('Authorization', author.auth)
      .send({ title: 'Edited title here', type: 'DISCUSSION' });
    expect(edited.body.post).toMatchObject({ title: 'Edited title here', type: 'DISCUSSION' });

    expect((await api().delete(`/api/posts/${id}`).set('Authorization', other.auth)).status).toBe(
      403,
    );
    expect((await api().delete(`/api/posts/${id}`).set('Authorization', author.auth)).status).toBe(
      204,
    );
    expect((await api().get(`/api/posts/${id}`).set('Authorization', other.auth)).status).toBe(404);
    expect((await api().get('/api/posts').set('Authorization', other.auth)).body.total).toBe(0);
  });

  it('validates input', async () => {
    const { auth } = await createAuthedUser();
    const res = await createPost(auth, {
      title: 'Hi',
      body: 'short',
      tags: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    expect(res.status).toBe(400);
  });
});

describe('comments', () => {
  it('edits and deletes own comments and keeps the counter in step', async () => {
    const author = await createAuthedUser();
    const commenter = await createAuthedUser();
    const { body } = await createPost(author.auth);
    const postId = body.post.id;
    const created = await api()
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', commenter.auth)
      .send({ body: 'First!' });
    const commentId = created.body.comment.id;

    expect(
      (
        await api()
          .patch(`/api/comments/${commentId}`)
          .set('Authorization', author.auth)
          .send({ body: 'x' })
      ).status,
    ).toBe(403);
    const edited = await api()
      .patch(`/api/comments/${commentId}`)
      .set('Authorization', commenter.auth)
      .send({ body: 'Edited answer' });
    expect(edited.body.comment.body).toBe('Edited answer');

    expect(
      (await api().delete(`/api/comments/${commentId}`).set('Authorization', commenter.auth))
        .status,
    ).toBe(204);
    const post = await api().get(`/api/posts/${postId}`).set('Authorization', author.auth);
    expect(post.body.post).toMatchObject({ commentCount: 0, comments: [] });
  });

  it('does not notify authors about their own comments', async () => {
    const author = await createAuthedUser();
    const { body } = await createPost(author.auth);
    await api()
      .post(`/api/posts/${body.post.id}/comments`)
      .set('Authorization', author.auth)
      .send({ body: 'Update: still looking for advice' });
    expect(await prisma.notification.count({ where: { userId: author.user.id } })).toBe(0);
  });
});
