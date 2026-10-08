import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, createAuthedUser, createListing } from './helpers.js';

const isoDay = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

async function setup(listingOverrides = {}) {
  const seller = await createAuthedUser({ phone: '9000000001' });
  const buyer = await createAuthedUser({ phone: '9000000002' });
  const listing = await createListing(seller.user.id, listingOverrides);
  return { seller, buyer, listing };
}

async function sendRequest(auth: string, body: Record<string, unknown>) {
  return api().post('/api/requests').set('Authorization', auth).send(body);
}

const act = (auth: string, id: string, action: string) =>
  api().post(`/api/requests/${id}/${action}`).set('Authorization', auth);

describe('buy journey: request → approve → connect → complete', () => {
  it('gates contact details behind approval and marks the item sold', async () => {
    const { seller, buyer, listing } = await setup();

    const created = await sendRequest(buyer.auth, {
      listingId: listing.id,
      message: 'Is it available?',
    });
    expect(created.status).toBe(201);
    expect(created.body.request).toMatchObject({ status: 'PENDING', type: 'SELL' });
    const id = created.body.request.id;

    // Seller is notified, buyer sees no contact details yet.
    const sellerNotes = await prisma.notification.findMany({ where: { userId: seller.user.id } });
    expect(sellerNotes).toHaveLength(1);
    expect(sellerNotes[0]).toMatchObject({ type: 'REQUEST_RECEIVED', link: `/requests/${id}` });
    const pending = await api().get(`/api/requests/${id}`).set('Authorization', buyer.auth);
    expect(pending.body.request).toMatchObject({
      viewerRole: 'requester',
      contact: null,
      conversation: null,
    });

    // Listing detail shows the buyer's open request.
    const detail = await api().get(`/api/listings/${listing.id}`).set('Authorization', buyer.auth);
    expect(detail.body.listing.viewerRequest).toMatchObject({ id, status: 'PENDING' });

    const incoming = await api()
      .get('/api/requests?role=incoming')
      .set('Authorization', seller.auth);
    expect(incoming.body.items.map((r: { id: string }) => r.id)).toEqual([id]);

    const approved = await act(seller.auth, id, 'approve');
    expect(approved.status).toBe(200);
    expect(approved.body.request.status).toBe('APPROVED');
    expect(approved.body.request.contact).toMatchObject({
      email: buyer.user.email,
      phone: '9000000002',
    });
    expect(approved.body.request.conversation.id).toEqual(expect.any(String));
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe(
      'RESERVED',
    );

    const buyerView = await api().get(`/api/requests/${id}`).set('Authorization', buyer.auth);
    expect(buyerView.body.request.contact).toMatchObject({
      email: seller.user.email,
      phone: '9000000001',
    });

    const done = await act(seller.auth, id, 'complete');
    expect(done.body.request).toMatchObject({
      status: 'COMPLETED',
      completedAt: expect.any(String),
    });
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe(
      'SOLD',
    );

    const buyerNotes = await prisma.notification.findMany({
      where: { userId: buyer.user.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(buyerNotes.map((n) => n.type)).toEqual(['REQUEST_APPROVED', 'REQUEST_COMPLETED']);
  });

  it('rejects other pending requests when the sale completes', async () => {
    const { seller, buyer, listing } = await setup();
    const other = await createAuthedUser();
    const first = await sendRequest(buyer.auth, { listingId: listing.id });
    const second = await sendRequest(other.auth, { listingId: listing.id });

    await act(seller.auth, first.body.request.id, 'approve');
    await act(seller.auth, first.body.request.id, 'complete');

    const loser = await prisma.transactionRequest.findUniqueOrThrow({
      where: { id: second.body.request.id },
    });
    expect(loser.status).toBe('REJECTED');
    expect(await prisma.notification.count({ where: { userId: other.user.id } })).toBe(1);
  });

  it('allows only one approved request at a time', async () => {
    const { seller, buyer, listing } = await setup();
    const other = await createAuthedUser();
    const first = await sendRequest(buyer.auth, { listingId: listing.id });
    const second = await sendRequest(other.auth, { listingId: listing.id });

    expect((await act(seller.auth, first.body.request.id, 'approve')).status).toBe(200);
    const res = await act(seller.auth, second.body.request.id, 'approve');
    expect(res.status).toBe(409);
    expect(
      (await prisma.transactionRequest.findUniqueOrThrow({ where: { id: second.body.request.id } }))
        .status,
    ).toBe('PENDING');
  });

  it('puts the item back on the market when an approved deal is cancelled', async () => {
    const { seller, buyer, listing } = await setup();
    const { body } = await sendRequest(buyer.auth, { listingId: listing.id });
    await act(seller.auth, body.request.id, 'approve');

    const cancelled = await act(buyer.auth, body.request.id, 'cancel');
    expect(cancelled.body.request.status).toBe('CANCELLED');
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe(
      'ACTIVE',
    );
    expect(cancelled.body.request.contact).toBeNull();

    const sellerNote = await prisma.notification.findFirst({
      where: { userId: seller.user.id, type: 'REQUEST_CANCELLED' },
    });
    expect(sellerNote).not.toBeNull();
  });
});

describe('request rules and permissions', () => {
  it('blocks requesting your own listing, duplicates, and unavailable items', async () => {
    const { seller, buyer, listing } = await setup();
    expect((await sendRequest(seller.auth, { listingId: listing.id })).status).toBe(400);

    expect((await sendRequest(buyer.auth, { listingId: listing.id })).status).toBe(201);
    expect((await sendRequest(buyer.auth, { listingId: listing.id })).status).toBe(409);

    const sold = await createListing(seller.user.id, { status: 'SOLD' });
    expect((await sendRequest(buyer.auth, { listingId: sold.id })).status).toBe(409);

    const missing = await sendRequest(buyer.auth, {
      listingId: '00000000-0000-4000-8000-000000000000',
    });
    expect(missing.status).toBe(404);
  });

  it('only lets the seller approve, reject or complete', async () => {
    const { seller, buyer, listing } = await setup();
    const { body } = await sendRequest(buyer.auth, { listingId: listing.id });
    const id = body.request.id;

    expect((await act(buyer.auth, id, 'approve')).status).toBe(403);
    expect((await act(buyer.auth, id, 'reject')).status).toBe(403);
    expect((await act(seller.auth, id, 'complete')).status).toBe(409); // not approved yet

    const stranger = await createAuthedUser();
    expect((await act(stranger.auth, id, 'cancel')).status).toBe(404);
    expect(
      (await api().get(`/api/requests/${id}`).set('Authorization', stranger.auth)).status,
    ).toBe(404);

    const rejected = await act(seller.auth, id, 'reject');
    expect(rejected.body.request.status).toBe('REJECTED');
    expect((await act(seller.auth, id, 'approve')).status).toBe(409);
  });

  it('closes open requests when the seller marks the item sold elsewhere or removes it', async () => {
    const { seller, buyer, listing } = await setup();
    const { body } = await sendRequest(buyer.auth, { listingId: listing.id });
    await api()
      .patch(`/api/listings/${listing.id}/status`)
      .set('Authorization', seller.auth)
      .send({ status: 'SOLD' });
    const closed = await prisma.transactionRequest.findUniqueOrThrow({
      where: { id: body.request.id },
    });
    expect(closed.status).toBe('REJECTED');

    const another = await createListing(seller.user.id);
    const second = await sendRequest(buyer.auth, { listingId: another.id });
    await api().delete(`/api/listings/${another.id}`).set('Authorization', seller.auth);
    const removed = await prisma.transactionRequest.findUniqueOrThrow({
      where: { id: second.body.request.id },
    });
    expect(removed.status).toBe('CANCELLED');
  });

  it('locks the price while a deal is in progress but still allows typo fixes', async () => {
    const { seller, buyer, listing } = await setup();
    const { body } = await sendRequest(buyer.auth, { listingId: listing.id });
    await act(seller.auth, body.request.id, 'approve');
    const patch = (data: Record<string, unknown>) =>
      api().patch(`/api/listings/${listing.id}`).set('Authorization', seller.auth).send(data);

    expect((await patch({ price: listing.price + 500 })).status).toBe(409);
    expect((await patch({ price: listing.price, title: 'Fixed typo in title' })).status).toBe(200);
  });

  it('refuses to mark a reserved listing sold without completing the request', async () => {
    const { seller, buyer, listing } = await setup();
    const { body } = await sendRequest(buyer.auth, { listingId: listing.id });
    await act(seller.auth, body.request.id, 'approve');
    const res = await api()
      .patch(`/api/listings/${listing.id}/status`)
      .set('Authorization', seller.auth)
      .send({ status: 'SOLD' });
    expect(res.status).toBe(409);
  });
});

describe('rent journey', () => {
  it('requires valid dates and returns the item to the market when completed', async () => {
    const { seller, buyer, listing } = await setup({
      type: 'RENT',
      rentPeriod: 'DAY',
      deposit: 200,
    });

    expect((await sendRequest(buyer.auth, { listingId: listing.id })).status).toBe(400);
    expect(
      (
        await sendRequest(buyer.auth, {
          listingId: listing.id,
          rentStartDate: isoDay(-3),
          rentEndDate: isoDay(1),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await sendRequest(buyer.auth, {
          listingId: listing.id,
          rentStartDate: isoDay(5),
          rentEndDate: isoDay(2),
        })
      ).status,
    ).toBe(400);

    const ok = await sendRequest(buyer.auth, {
      listingId: listing.id,
      rentStartDate: isoDay(1),
      rentEndDate: isoDay(4),
      message: 'Need it for the lab exam week',
    });
    expect(ok.status).toBe(201);
    expect(ok.body.request).toMatchObject({ type: 'RENT', rentStartDate: expect.any(String) });

    const id = ok.body.request.id;
    await act(seller.auth, id, 'approve');
    const returned = await act(seller.auth, id, 'complete');
    expect(returned.body.request.status).toBe('COMPLETED');
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe(
      'ACTIVE',
    );
  });

  it('rejects rental dates on a sale listing', async () => {
    const { buyer, listing } = await setup();
    const res = await sendRequest(buyer.auth, {
      listingId: listing.id,
      rentStartDate: isoDay(1),
      rentEndDate: isoDay(2),
    });
    expect(res.status).toBe(400);
  });
});
