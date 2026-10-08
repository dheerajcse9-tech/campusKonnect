import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, createAuthedUser, createListing } from './helpers.js';

async function approvedDeal() {
  const seller = await createAuthedUser();
  const buyer = await createAuthedUser();
  const listing = await createListing(seller.user.id, { title: 'Study table' });
  const created = await api()
    .post('/api/requests')
    .set('Authorization', buyer.auth)
    .send({ listingId: listing.id });
  const requestId = created.body.request.id;
  const approved = await api()
    .post(`/api/requests/${requestId}/approve`)
    .set('Authorization', seller.auth);
  return {
    seller,
    buyer,
    requestId,
    conversationId: approved.body.request.conversation.id as string,
  };
}

const send = (auth: string, id: string, body: string) =>
  api().post(`/api/conversations/${id}/messages`).set('Authorization', auth).send({ body });

describe('approval-gated messaging', () => {
  it('lets both parties chat once the request is approved', async () => {
    const { seller, buyer, conversationId } = await approvedDeal();

    expect((await send(buyer.auth, conversationId, 'Hi! When can I pick it up?')).status).toBe(201);
    expect((await send(seller.auth, conversationId, 'Tomorrow 5pm at the library')).status).toBe(
      201,
    );

    const sellerInbox = await api().get('/api/conversations').set('Authorization', seller.auth);
    expect(sellerInbox.body.items).toHaveLength(1);
    expect(sellerInbox.body.items[0]).toMatchObject({
      counterpart: { id: buyer.user.id },
      listing: { title: 'Study table' },
      lastMessage: { body: 'Tomorrow 5pm at the library' },
      unreadCount: 1,
    });

    const thread = await api()
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', seller.auth);
    expect(thread.body.messages.map((m: { body: string }) => m.body)).toEqual([
      'Hi! When can I pick it up?',
      'Tomorrow 5pm at the library',
    ]);
    expect(thread.body.conversation).toMatchObject({
      canSend: true,
      counterpart: { id: buyer.user.id },
    });

    // Reading the thread marks incoming messages as read.
    const after = await api().get('/api/conversations').set('Authorization', seller.auth);
    expect(after.body.items[0].unreadCount).toBe(0);
  });

  it('polls only for messages newer than a timestamp', async () => {
    const { seller, buyer, conversationId } = await approvedDeal();
    const first = await send(buyer.auth, conversationId, 'one');
    await send(seller.auth, conversationId, 'two');

    const res = await api()
      .get(`/api/conversations/${conversationId}/messages`)
      .query({ after: first.body.message.createdAt })
      .set('Authorization', buyer.auth);
    expect(res.body.messages.map((m: { body: string }) => m.body)).toEqual(['two']);
  });

  it('keeps conversations private to the two participants', async () => {
    const { conversationId } = await approvedDeal();
    const stranger = await createAuthedUser();
    expect((await send(stranger.auth, conversationId, 'hello')).status).toBe(404);
    const read = await api()
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', stranger.auth);
    expect(read.status).toBe(404);
  });

  it('becomes read-only when the deal is cancelled', async () => {
    const { buyer, requestId, conversationId } = await approvedDeal();
    await api().post(`/api/requests/${requestId}/cancel`).set('Authorization', buyer.auth);
    expect((await send(buyer.auth, conversationId, 'still there?')).status).toBe(403);
    const thread = await api()
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', buyer.auth);
    expect(thread.body.conversation.canSend).toBe(false);
  });

  it('sends at most one unread message notification per conversation', async () => {
    const { seller, buyer, conversationId } = await approvedDeal();
    await send(buyer.auth, conversationId, 'one');
    await send(buyer.auth, conversationId, 'two');
    await send(buyer.auth, conversationId, 'three');
    const count = await prisma.notification.count({
      where: { userId: seller.user.id, type: 'NEW_MESSAGE' },
    });
    expect(count).toBe(1);

    // Opening the chat clears that notification.
    await api()
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', seller.auth);
    const unread = await prisma.notification.count({
      where: { userId: seller.user.id, type: 'NEW_MESSAGE', readAt: null },
    });
    expect(unread).toBe(0);
  });

  it('validates the message body', async () => {
    const { buyer, conversationId } = await approvedDeal();
    expect((await send(buyer.auth, conversationId, '   ')).status).toBe(400);
  });
});
