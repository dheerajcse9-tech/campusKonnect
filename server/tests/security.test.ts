import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emailService } from '../src/lib/email/email.service.js';
import { escapeHtml, verificationEmail } from '../src/lib/email/templates.js';
import { prisma } from '../src/lib/prisma.js';
import { createLimiter, emailKey, userOrIpKey } from '../src/middleware/rate-limit.js';
import { signAccessToken } from '../src/modules/auth/token.service.js';
import {
  DEFAULT_PASSWORD,
  api,
  createAuthedUser,
  createListing,
  createUser,
  lastEmailToken,
  refreshCookie,
} from './helpers.js';

afterEach(() => {
  vi.restoreAllMocks();
});

async function loginCookie(email: string) {
  return refreshCookie(
    await api().post('/api/auth/login').send({ email, password: DEFAULT_PASSWORD }),
  );
}

describe('CSRF protection on cookie-authenticated endpoints', () => {
  it('rejects refresh without the client header', async () => {
    const user = await createUser();
    const cookie = await loginCookie(user.email);
    const res = await api().post('/api/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('rejects refresh and logout from a foreign origin', async () => {
    const user = await createUser();
    const cookie = await loginCookie(user.email);
    for (const path of ['/api/auth/refresh', '/api/auth/logout']) {
      const res = await api()
        .post(path)
        .set('Cookie', cookie)
        .set('Origin', 'https://evil.example.com')
        .set('X-Requested-With', 'fetch');
      expect(res.status, path).toBe(403);
    }
    // The session survived both attempts.
    const ok = await api()
      .post('/api/auth/refresh')
      .set('Cookie', cookie)
      .set('Origin', 'http://localhost:5173')
      .set('X-Requested-With', 'fetch');
    expect(ok.status).toBe(200);
  });
});

describe('email safety', () => {
  it('escapes user-controlled names in HTML emails', () => {
    const message = verificationEmail(
      'a@college.edu',
      '<img src=x onerror=alert(1)>',
      'https://x/y?a=1&b=2',
    );
    expect(message.html).not.toContain('<img');
    expect(message.html).toContain('&lt;img');
    expect(escapeHtml(`"'&<>`)).toBe('&quot;&#39;&amp;&lt;&gt;');
  });

  it('still creates the account if the email provider is down', async () => {
    vi.spyOn(emailService, 'send').mockRejectedValueOnce(new Error('provider outage'));
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Outage Test', email: 'outage@college.edu', password: 'Secret123' });
    expect(res.status).toBe(201);
    // The student can ask for the email again once the provider recovers.
    await api().post('/api/auth/resend-verification').send({ email: 'outage@college.edu' });
    expect(lastEmailToken('outage@college.edu')).toBeTruthy();
  });

  it('invalidates every outstanding reset link once one is used', async () => {
    const user = await createUser();
    await api().post('/api/auth/forgot-password').send({ email: user.email });
    const first = lastEmailToken(user.email);
    await api().post('/api/auth/forgot-password').send({ email: user.email });
    const second = lastEmailToken(user.email);

    expect(
      (await api().post('/api/auth/reset-password').send({ token: second, password: 'NewPass123' }))
        .status,
    ).toBe(200);
    expect(
      (await api().post('/api/auth/reset-password').send({ token: first, password: 'Other1234' }))
        .status,
    ).toBe(400);
  });
});

describe('rate limiting', () => {
  function appWith(limiter: express.RequestHandler) {
    const app = express();
    app.use(express.json());
    app.post('/', limiter, (_req, res) => {
      res.json({ ok: true });
    });
    return app;
  }

  it('limits login attempts per account regardless of IP', async () => {
    const app = appWith(
      createLimiter({ windowMinutes: 1, max: 2, keyGenerator: emailKey, enabledInTests: true }),
    );
    const attempt = (email: string) => request(app).post('/').send({ email });
    expect((await attempt('Victim@college.edu')).status).toBe(200);
    expect((await attempt('victim@college.edu ')).status).toBe(200);
    const blocked = await attempt('victim@college.edu');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    // Another student on the same campus IP is unaffected.
    expect((await attempt('someone-else@college.edu')).status).toBe(200);
  });

  it('keys signed-in traffic by user so students behind one campus IP do not share a budget', async () => {
    const app = appWith(
      createLimiter({ windowMinutes: 1, max: 1, keyGenerator: userOrIpKey, enabledInTests: true }),
    );
    const a = signAccessToken({ id: '11111111-1111-4111-8111-111111111111', role: 'STUDENT' });
    const b = signAccessToken({ id: '22222222-2222-4222-8222-222222222222', role: 'STUDENT' });
    expect((await request(app).post('/').set('Authorization', `Bearer ${a}`)).status).toBe(200);
    expect((await request(app).post('/').set('Authorization', `Bearer ${b}`)).status).toBe(200);
    expect((await request(app).post('/').set('Authorization', `Bearer ${a}`)).status).toBe(429);
  });
});

describe('concurrency', () => {
  it('creates only one request when the button is double-tapped', async () => {
    const seller = await createAuthedUser();
    const buyer = await createAuthedUser();
    const listing = await createListing(seller.user.id);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        api()
          .post('/api/requests')
          .set('Authorization', buyer.auth)
          .send({ listingId: listing.id }),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect(await prisma.transactionRequest.count()).toBe(1);
  });
});

describe('hidden sellers', () => {
  it("hides a banned seller's listing detail from students but not from admins", async () => {
    const seller = await createAuthedUser({ status: 'BANNED' });
    const student = await createAuthedUser();
    const admin = await createAuthedUser({ role: 'ADMIN' });
    const listing = await createListing(seller.user.id);
    expect(
      (await api().get(`/api/listings/${listing.id}`).set('Authorization', student.auth)).status,
    ).toBe(404);
    expect(
      (await api().get(`/api/listings/${listing.id}`).set('Authorization', admin.auth)).status,
    ).toBe(200);
  });
});

describe('account deletion', () => {
  it('erases personal data, removes content, unwinds deals and frees the email', async () => {
    const leaving = await createAuthedUser({ phone: '9999999999' });
    const buyer = await createAuthedUser();
    const listing = await createListing(leaving.user.id);
    const req = await api()
      .post('/api/requests')
      .set('Authorization', buyer.auth)
      .send({ listingId: listing.id });
    await api()
      .post(`/api/requests/${req.body.request.id}/approve`)
      .set('Authorization', leaving.auth);
    await prisma.post.create({
      data: {
        authorId: leaving.user.id,
        title: 'My old post',
        body: 'Some content here',
        tags: [],
      },
    });

    const wrong = await api()
      .post('/api/users/me/delete')
      .set('Authorization', leaving.auth)
      .send({ password: 'wrong', confirm: 'DELETE' });
    expect(wrong.status).toBe(400);
    const unconfirmed = await api()
      .post('/api/users/me/delete')
      .set('Authorization', leaving.auth)
      .send({ password: DEFAULT_PASSWORD, confirm: 'yes' });
    expect(unconfirmed.status).toBe(400);

    const res = await api()
      .post('/api/users/me/delete')
      .set('Authorization', leaving.auth)
      .send({ password: DEFAULT_PASSWORD, confirm: 'DELETE' });
    expect(res.status).toBe(204);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: leaving.user.id } });
    expect(row).toMatchObject({
      status: 'DELETED',
      name: 'Deleted user',
      phone: null,
      emailVerifiedAt: null,
    });
    expect(row.email).not.toBe(leaving.user.email);

    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe(
      'REMOVED',
    );
    expect(
      (await prisma.transactionRequest.findUniqueOrThrow({ where: { id: req.body.request.id } }))
        .status,
    ).toBe('CANCELLED');
    expect((await api().get('/api/posts').set('Authorization', buyer.auth)).body.total).toBe(0);

    // The old token and credentials no longer work.
    expect((await api().get('/api/users/me').set('Authorization', leaving.auth)).status).toBe(401);
    expect(
      (
        await api()
          .post('/api/auth/login')
          .send({ email: leaving.user.email, password: DEFAULT_PASSWORD })
      ).status,
    ).toBe(401);

    // The student can register again with the same college email.
    const again = await api()
      .post('/api/auth/register')
      .send({ name: 'Back Again', email: leaving.user.email, password: 'Secret123' });
    expect(again.status).toBe(201);
  });

  it('does not let an admin delete their account while still an admin', async () => {
    const admin = await createAuthedUser({ role: 'ADMIN' });
    const res = await api()
      .post('/api/users/me/delete')
      .set('Authorization', admin.auth)
      .send({ password: DEFAULT_PASSWORD, confirm: 'DELETE' });
    expect(res.status).toBe(403);
  });
});
