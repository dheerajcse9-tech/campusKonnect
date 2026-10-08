import { describe, expect, it } from 'vitest';
import { isAllowedCollegeEmail } from '../src/modules/auth/auth.service.js';
import {
  DEFAULT_PASSWORD,
  api,
  createUser,
  lastEmailToken,
  refreshCookie,
} from './helpers.js';

const newStudent = {
  name: 'Asha Rao',
  email: 'Asha.Rao@College.edu',
  password: 'Secret123',
  department: 'CSE',
  year: 2,
};

describe('college email domain check', () => {
  it('accepts the domain and its subdomains only', () => {
    expect(isAllowedCollegeEmail('a@college.edu')).toBe(true);
    expect(isAllowedCollegeEmail('a@cs.college.edu')).toBe(true);
    expect(isAllowedCollegeEmail('a@gmail.com')).toBe(false);
    expect(isAllowedCollegeEmail('a@evilcollege.edu')).toBe(false);
  });
});

describe('registration and email verification', () => {
  it('registers, verifies the email, then allows login', async () => {
    const reg = await api().post('/api/auth/register').send(newStudent);
    expect(reg.status).toBe(201);
    expect(reg.body.user).toMatchObject({ email: 'asha.rao@college.edu', emailVerified: false });
    expect(reg.body.user.passwordHash).toBeUndefined();

    const blocked = await api()
      .post('/api/auth/login')
      .send({ email: newStudent.email, password: newStudent.password });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('EMAIL_NOT_VERIFIED');

    const token = lastEmailToken('asha.rao@college.edu');
    const verify = await api().post('/api/auth/verify-email').send({ token });
    expect(verify.status).toBe(200);

    const reuse = await api().post('/api/auth/verify-email').send({ token });
    expect(reuse.status).toBe(400);

    const login = await api()
      .post('/api/auth/login')
      .send({ email: newStudent.email, password: newStudent.password });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toEqual(expect.any(String));
    expect(login.body.user.emailVerified).toBe(true);
    expect(refreshCookie(login)).toMatch(/^ck_refresh=/);
  });

  it('rejects non-college email domains', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newStudent, email: 'someone@gmail.com' });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate emails', async () => {
    await createUser({ email: 'asha.rao@college.edu' });
    const res = await api().post('/api/auth/register').send(newStudent);
    expect(res.status).toBe(409);
  });

  it('validates the password policy', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newStudent, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('resends verification without revealing whether an account exists', async () => {
    await createUser({ email: 'pending@college.edu', verified: false });
    const known = await api().post('/api/auth/resend-verification').send({ email: 'pending@college.edu' });
    const unknown = await api().post('/api/auth/resend-verification').send({ email: 'nobody@college.edu' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(lastEmailToken('pending@college.edu')).toBeTruthy();
  });
});

describe('login', () => {
  it('uses the same error for unknown email and wrong password', async () => {
    await createUser({ email: 'known@college.edu' });
    const wrongPw = await api().post('/api/auth/login').send({ email: 'known@college.edu', password: 'nope' });
    const unknown = await api().post('/api/auth/login').send({ email: 'x@college.edu', password: 'nope' });
    expect(wrongPw.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPw.body.error.message).toBe(unknown.body.error.message);
  });

  it('blocks banned users', async () => {
    await createUser({ email: 'banned@college.edu', status: 'BANNED' });
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'banned@college.edu', password: DEFAULT_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BANNED');
  });
});

describe('refresh token rotation', () => {
  async function loginCookie() {
    await createUser({ email: 'rotate@college.edu' });
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'rotate@college.edu', password: DEFAULT_PASSWORD });
    return refreshCookie(res);
  }

  it('issues a new access token and rotates the refresh cookie', async () => {
    const cookie = await loginCookie();
    const res = await api().post('/api/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(res)).not.toBe(cookie);
  });

  it('revokes every session when a rotated token is reused', async () => {
    const original = await loginCookie();
    const rotated = refreshCookie(await api().post('/api/auth/refresh').set('Cookie', original));

    const replay = await api().post('/api/auth/refresh').set('Cookie', original);
    expect(replay.status).toBe(401);

    // The legitimately rotated token was revoked too.
    const afterTheft = await api().post('/api/auth/refresh').set('Cookie', rotated);
    expect(afterTheft.status).toBe(401);
  });

  it('rejects refresh without a cookie', async () => {
    const res = await api().post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const cookie = await loginCookie();
    const out = await api().post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(204);
    const res = await api().post('/api/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

describe('password reset', () => {
  it('resets the password and revokes existing sessions', async () => {
    await createUser({ email: 'forgetful@college.edu' });
    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'forgetful@college.edu', password: DEFAULT_PASSWORD });
    const cookie = refreshCookie(login);

    const forgot = await api().post('/api/auth/forgot-password').send({ email: 'forgetful@college.edu' });
    expect(forgot.status).toBe(200);

    const token = lastEmailToken('forgetful@college.edu');
    const reset = await api().post('/api/auth/reset-password').send({ token, password: 'BrandNew99' });
    expect(reset.status).toBe(200);

    expect((await api().post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
    const oldPw = await api()
      .post('/api/auth/login')
      .send({ email: 'forgetful@college.edu', password: DEFAULT_PASSWORD });
    expect(oldPw.status).toBe(401);
    const newPw = await api()
      .post('/api/auth/login')
      .send({ email: 'forgetful@college.edu', password: 'BrandNew99' });
    expect(newPw.status).toBe(200);
  });

  it('rejects an invalid reset token', async () => {
    const res = await api()
      .post('/api/auth/reset-password')
      .send({ token: 'not-a-real-token', password: 'BrandNew99' });
    expect(res.status).toBe(400);
  });
});
