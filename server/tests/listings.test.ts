import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, createAuthedUser, createListing } from './helpers.js';
import { NOT_AN_IMAGE, PNG_1PX } from './fixtures.js';

const sellFields = {
  title: 'Engineering Mathematics by B.S. Grewal',
  description: '44th edition, a few pencil marks, otherwise clean.',
  type: 'SELL',
  category: 'BOOKS',
  condition: 'GOOD',
  price: '350',
  location: 'Hostel B',
};

function postListing(auth: string, fields: Record<string, string>, images: Buffer[] = []) {
  const req = api().post('/api/listings').set('Authorization', auth);
  for (const [key, value] of Object.entries(fields)) req.field(key, value);
  images.forEach((img, i) =>
    req.attach('images', img, { filename: `p${i}.png`, contentType: 'image/png' }),
  );
  return req;
}

describe('creating listings', () => {
  it('creates a sale listing with images', async () => {
    const { user, auth } = await createAuthedUser();
    const res = await postListing(auth, sellFields, [PNG_1PX, PNG_1PX]);
    expect(res.status).toBe(201);
    expect(res.body.listing).toMatchObject({
      title: sellFields.title,
      type: 'SELL',
      price: 350,
      status: 'ACTIVE',
      rentPeriod: null,
      seller: { id: user.id },
    });
    expect(res.body.listing.images).toHaveLength(2);
    expect(res.body.listing.images[0].position).toBe(0);
  });

  it('creates a rental with terms', async () => {
    const { auth } = await createAuthedUser();
    const res = await postListing(auth, {
      ...sellFields,
      title: 'Scientific calculator fx-991EX',
      type: 'RENT',
      category: 'ELECTRONICS',
      price: '30',
      rentPeriod: 'WEEK',
      deposit: '500',
    });
    expect(res.status).toBe(201);
    expect(res.body.listing).toMatchObject({
      type: 'RENT',
      price: 30,
      rentPeriod: 'WEEK',
      deposit: 500,
    });
  });

  it('requires a rent period for rentals and rejects rental terms on sales', async () => {
    const { auth } = await createAuthedUser();
    expect((await postListing(auth, { ...sellFields, type: 'RENT' })).status).toBe(400);
    expect((await postListing(auth, { ...sellFields, rentPeriod: 'DAY' })).status).toBe(400);
  });

  it('validates fields and rejects non-image uploads', async () => {
    const { auth } = await createAuthedUser();
    const bad = await postListing(auth, {
      ...sellFields,
      title: 'x',
      price: '-5',
      category: 'CARS',
    });
    expect(bad.status).toBe(400);
    const paths = bad.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['title', 'price', 'category']));

    const fake = await postListing(auth, sellFields, [NOT_AN_IMAGE]);
    expect(fake.status).toBe(400);
    expect(await prisma.listing.count()).toBe(0);
  });

  it('limits listings to five images', async () => {
    const { auth } = await createAuthedUser();
    const res = await postListing(auth, sellFields, Array(6).fill(PNG_1PX));
    expect(res.status).toBe(400);
  });
});

describe('browsing the marketplace', () => {
  it('searches, filters, sorts and paginates active listings', async () => {
    const { user: seller } = await createAuthedUser();
    const { auth } = await createAuthedUser();
    await createListing(seller.id, { title: 'Hero cycle', category: 'CYCLES', price: 2500 });
    await createListing(seller.id, { title: 'DSA textbook', category: 'BOOKS', price: 300 });
    await createListing(seller.id, {
      title: 'Data structures notes',
      category: 'BOOKS',
      price: 50,
      description: 'Handwritten, covers trees and graphs.',
    });
    await createListing(seller.id, { title: 'Sold book', category: 'BOOKS', status: 'SOLD' });
    await createListing(seller.id, {
      title: 'Desk lamp',
      category: 'FURNITURE',
      type: 'RENT',
      rentPeriod: 'MONTH',
      price: 100,
    });

    const all = await api().get('/api/listings').set('Authorization', auth);
    expect(all.body.total).toBe(4);

    const books = await api()
      .get('/api/listings?category=BOOKS&sort=price_asc')
      .set('Authorization', auth);
    expect(books.body.items.map((l: { price: number }) => l.price)).toEqual([50, 300]);

    const search = await api().get('/api/listings?q=GRAPHS').set('Authorization', auth);
    expect(search.body.items).toHaveLength(1);
    expect(search.body.items[0].title).toBe('Data structures notes');

    const rentals = await api().get('/api/listings?type=RENT').set('Authorization', auth);
    expect(rentals.body.items).toHaveLength(1);

    const range = await api()
      .get('/api/listings?minPrice=100&maxPrice=1000')
      .set('Authorization', auth);
    expect(range.body.items.map((l: { title: string }) => l.title).sort()).toEqual([
      'DSA textbook',
      'Desk lamp',
    ]);

    const page = await api().get('/api/listings?limit=3&page=2').set('Authorization', auth);
    expect(page.body).toMatchObject({ page: 2, limit: 3, total: 4, totalPages: 2 });
    expect(page.body.items).toHaveLength(1);

    const badRange = await api()
      .get('/api/listings?minPrice=10&maxPrice=1')
      .set('Authorization', auth);
    expect(badRange.status).toBe(400);
  });

  it('hides listings from banned sellers', async () => {
    const { user: seller } = await createAuthedUser({ status: 'BANNED' });
    const { auth } = await createAuthedUser();
    await createListing(seller.id);
    const res = await api().get('/api/listings').set('Authorization', auth);
    expect(res.body.total).toBe(0);
  });

  it('shows the listing detail without seller contact details', async () => {
    const { user: seller } = await createAuthedUser();
    const { auth } = await createAuthedUser();
    const listing = await createListing(seller.id);
    const res = await api().get(`/api/listings/${listing.id}`).set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.listing).toMatchObject({ id: listing.id, isOwner: false, viewerRequest: null });
    expect(res.body.listing.seller.email).toBeUndefined();
    expect(res.body.listing.seller.phone).toBeUndefined();
  });
});

describe('managing own listings', () => {
  it('lets only the owner edit a listing', async () => {
    const { user: seller, auth: sellerAuth } = await createAuthedUser();
    const { auth: otherAuth } = await createAuthedUser();
    const listing = await createListing(seller.id);

    const forbidden = await api()
      .patch(`/api/listings/${listing.id}`)
      .set('Authorization', otherAuth)
      .send({ price: 1 });
    expect(forbidden.status).toBe(403);

    const ok = await api()
      .patch(`/api/listings/${listing.id}`)
      .set('Authorization', sellerAuth)
      .send({ price: 99, title: 'Updated title' });
    expect(ok.status).toBe(200);
    expect(ok.body.listing).toMatchObject({ price: 99, title: 'Updated title' });

    const rentTermsOnSale = await api()
      .patch(`/api/listings/${listing.id}`)
      .set('Authorization', sellerAuth)
      .send({ rentPeriod: 'DAY' });
    expect(rentTermsOnSale.status).toBe(400);
  });

  it('adds and removes images', async () => {
    const { user: seller, auth } = await createAuthedUser();
    const listing = await createListing(seller.id);

    const added = await api()
      .post(`/api/listings/${listing.id}/images`)
      .set('Authorization', auth)
      .attach('images', PNG_1PX, 'a.png')
      .attach('images', PNG_1PX, 'b.png');
    expect(added.status).toBe(200);
    expect(added.body.listing.images.map((i: { position: number }) => i.position)).toEqual([0, 1]);

    const imageId = added.body.listing.images[0].id;
    const removed = await api()
      .delete(`/api/listings/${listing.id}/images/${imageId}`)
      .set('Authorization', auth);
    expect(removed.status).toBe(200);
    expect(removed.body.listing.images).toHaveLength(1);
  });

  it('marks a listing sold and relists it', async () => {
    const { user: seller, auth } = await createAuthedUser();
    const listing = await createListing(seller.id);
    const sold = await api()
      .patch(`/api/listings/${listing.id}/status`)
      .set('Authorization', auth)
      .send({ status: 'SOLD' });
    expect(sold.body.listing.status).toBe('SOLD');

    const mine = await api().get('/api/listings/mine').set('Authorization', auth);
    expect(mine.body.items).toHaveLength(1);

    const relisted = await api()
      .patch(`/api/listings/${listing.id}/status`)
      .set('Authorization', auth)
      .send({ status: 'ACTIVE' });
    expect(relisted.body.listing.status).toBe('ACTIVE');
  });

  it('hard-deletes a listing that never received requests', async () => {
    const { user: seller, auth } = await createAuthedUser();
    const listing = await createListing(seller.id);
    const res = await api().delete(`/api/listings/${listing.id}`).set('Authorization', auth);
    expect(res.status).toBe(204);
    expect(await prisma.listing.findUnique({ where: { id: listing.id } })).toBeNull();
  });

  it('soft-deletes a listing with request history', async () => {
    const { user: seller, auth } = await createAuthedUser();
    const { user: buyer } = await createAuthedUser();
    const listing = await createListing(seller.id);
    await prisma.transactionRequest.create({
      data: {
        listingId: listing.id,
        requesterId: buyer.id,
        sellerId: seller.id,
        type: 'SELL',
        status: 'REJECTED',
      },
    });
    const res = await api().delete(`/api/listings/${listing.id}`).set('Authorization', auth);
    expect(res.status).toBe(204);
    const row = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(row.status).toBe('REMOVED');

    const { auth: otherAuth } = await createAuthedUser();
    expect(
      (await api().get(`/api/listings/${listing.id}`).set('Authorization', otherAuth)).status,
    ).toBe(404);
  });
});
