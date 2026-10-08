import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { notify } from '../src/modules/notifications/notifications.service.js';
import { api, createAuthedUser } from './helpers.js';

describe('notifications', () => {
  it('lists newest first with an unread count, and marks them read', async () => {
    const { user, auth } = await createAuthedUser();
    const { user: other } = await createAuthedUser();
    await notify({ userId: user.id, type: 'SYSTEM', title: 'First' });
    await notify([
      { userId: user.id, type: 'SYSTEM', title: 'Second', link: '/requests' },
      { userId: other.id, type: 'SYSTEM', title: 'Not yours' },
    ]);

    const list = await api().get('/api/notifications').set('Authorization', auth);
    expect(list.status).toBe(200);
    expect(list.body.items.map((n: { title: string }) => n.title)).toEqual(['Second', 'First']);
    expect(list.body.unreadCount).toBe(2);

    const firstId = list.body.items[1].id;
    expect(
      (await api().post(`/api/notifications/${firstId}/read`).set('Authorization', auth)).status,
    ).toBe(204);
    const count = await api().get('/api/notifications/unread-count').set('Authorization', auth);
    expect(count.body.unreadCount).toBe(1);

    const unreadOnly = await api().get('/api/notifications?unread=true').set('Authorization', auth);
    expect(unreadOnly.body.items).toHaveLength(1);

    await api().post('/api/notifications/read-all').set('Authorization', auth);
    const after = await api().get('/api/notifications/unread-count').set('Authorization', auth);
    expect(after.body.unreadCount).toBe(0);
  });

  it("cannot mark someone else's notification as read", async () => {
    const { user: owner } = await createAuthedUser();
    const { auth } = await createAuthedUser();
    await notify({ userId: owner.id, type: 'SYSTEM', title: 'Private' });
    const { id } = await prisma.notification.findFirstOrThrow({ where: { userId: owner.id } });
    const res = await api().post(`/api/notifications/${id}/read`).set('Authorization', auth);
    expect(res.status).toBe(404);
  });
});
