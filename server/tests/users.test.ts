import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { detectImageExtension } from '../src/lib/storage/image.js';
import { DEFAULT_PASSWORD, api, createAuthedUser, refreshCookie } from './helpers.js';
import { NOT_AN_IMAGE, PNG_1PX } from './fixtures.js';

describe('authentication guard', () => {
  it('rejects requests without a token', async () => {
    const res = await api().get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await api().get('/api/users/me').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('blocks a user as soon as they are banned', async () => {
    const { user, auth } = await createAuthedUser();
    expect((await api().get('/api/users/me').set('Authorization', auth)).status).toBe(200);
    await prisma.user.update({ where: { id: user.id }, data: { status: 'BANNED' } });
    const res = await api().get('/api/users/me').set('Authorization', auth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BANNED');
  });
});

describe('own profile', () => {
  it('returns the private profile including contact details', async () => {
    const { user, auth } = await createAuthedUser({ phone: '9876543210' });
    const res = await api().get('/api/users/me').set('Authorization', auth);
    expect(res.body.user).toMatchObject({ id: user.id, email: user.email, phone: '9876543210' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('updates editable fields and clears empty strings', async () => {
    const { auth } = await createAuthedUser();
    const res = await api()
      .patch('/api/users/me')
      .set('Authorization', auth)
      .send({ name: 'New Name', department: 'ECE', year: 3, bio: 'Hello', phone: '' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      name: 'New Name',
      department: 'ECE',
      year: 3,
      phone: null,
    });
  });

  it('refuses to change protected fields such as role', async () => {
    const { auth } = await createAuthedUser();
    const res = await api()
      .patch('/api/users/me')
      .set('Authorization', auth)
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(400);
  });

  it('uploads an avatar after checking the file really is an image', async () => {
    const { auth } = await createAuthedUser();
    const ok = await api()
      .post('/api/users/me/avatar')
      .set('Authorization', auth)
      .attach('image', PNG_1PX, { filename: 'me.png', contentType: 'image/png' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.avatarUrl).toMatch(/\/uploads\/avatars\/.+\.png$/);

    const fake = await api()
      .post('/api/users/me/avatar')
      .set('Authorization', auth)
      .attach('image', NOT_AN_IMAGE, { filename: 'me.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
  });
});

describe('public profile', () => {
  it('hides contact details from other students', async () => {
    const { user: owner } = await createAuthedUser({ phone: '9876543210' });
    const { auth } = await createAuthedUser();
    const res = await api().get(`/api/users/${owner.id}`).set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: owner.id, name: owner.name, listings: [] });
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.phone).toBeUndefined();
  });

  it('returns 404 for unknown and 400 for malformed ids', async () => {
    const { auth } = await createAuthedUser();
    const missing = await api()
      .get('/api/users/00000000-0000-4000-8000-000000000000')
      .set('Authorization', auth);
    expect(missing.status).toBe(404);
    expect((await api().get('/api/users/abc').set('Authorization', auth)).status).toBe(400);
  });
});

describe('change password', () => {
  it('requires the current password and signs out other sessions', async () => {
    const { user, auth } = await createAuthedUser();
    const login = () =>
      api().post('/api/auth/login').send({ email: user.email, password: DEFAULT_PASSWORD });
    const otherDevice = refreshCookie(await login());
    const thisDevice = refreshCookie(await login());

    const wrong = await api()
      .post('/api/auth/change-password')
      .set('X-Requested-With', 'fetch')
      .set('Authorization', auth)
      .send({ currentPassword: 'wrong', newPassword: 'Another123' });
    expect(wrong.status).toBe(400);

    const ok = await api()
      .post('/api/auth/change-password')
      .set('X-Requested-With', 'fetch')
      .set('Authorization', auth)
      .set('Cookie', thisDevice)
      .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'Another123' });
    expect(ok.status).toBe(200);

    expect(
      (
        await api()
          .post('/api/auth/refresh')
          .set('X-Requested-With', 'fetch')
          .set('Cookie', otherDevice)
      ).status,
    ).toBe(401);
    expect(
      (
        await api()
          .post('/api/auth/refresh')
          .set('X-Requested-With', 'fetch')
          .set('Cookie', thisDevice)
      ).status,
    ).toBe(200);
  });
});

describe('image sniffing', () => {
  it('detects formats by magic bytes', () => {
    expect(detectImageExtension(PNG_1PX)).toBe('png');
    expect(detectImageExtension(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
    expect(detectImageExtension(Buffer.from('GIF89a......'))).toBe('gif');
    expect(detectImageExtension(NOT_AN_IMAGE)).toBeNull();
  });
});
