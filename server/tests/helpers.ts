import type { Role, User } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/lib/crypto.js';
import { ConsoleEmailService, emailService } from '../src/lib/email/email.service.js';
import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/modules/auth/token.service.js';

export const app = createApp();
export const api = () => request(app);

export const DEFAULT_PASSWORD = 'Password123';

let counter = 0;

export async function createUser(
  overrides: Partial<Pick<User, 'name' | 'email' | 'phone' | 'status'>> & {
    role?: Role;
    verified?: boolean;
    password?: string;
  } = {},
): Promise<User> {
  counter += 1;
  const { verified = true, password = DEFAULT_PASSWORD, ...rest } = overrides;
  return prisma.user.create({
    data: {
      name: rest.name ?? `Student ${counter}`,
      email: rest.email ?? `student${counter}@college.edu`,
      phone: rest.phone ?? `90000000${String(counter).padStart(2, '0')}`,
      role: rest.role ?? 'STUDENT',
      status: rest.status ?? 'ACTIVE',
      passwordHash: await hashPassword(password),
      emailVerifiedAt: verified ? new Date() : null,
    },
  });
}

/** Creates a user and returns them with a ready-to-use Authorization header value. */
export async function createAuthedUser(overrides: Parameters<typeof createUser>[0] = {}) {
  const user = await createUser(overrides);
  return { user, auth: `Bearer ${signAccessToken(user)}` };
}

export function outbox() {
  if (!(emailService instanceof ConsoleEmailService)) throw new Error('Expected console email adapter');
  return emailService.outbox;
}

/** Extracts the `token` query parameter from the most recent email sent to `to`. */
export function lastEmailToken(to: string): string {
  const message = [...outbox()].reverse().find((m) => m.to === to);
  if (!message) throw new Error(`No email sent to ${to}`);
  const match = message.text.match(/token=([^\s&]+)/);
  if (!match) throw new Error('No token in email');
  return decodeURIComponent(match[1]);
}

export function refreshCookie(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith('ck_refresh='));
  if (!cookie) throw new Error('No refresh cookie set');
  return cookie.split(';')[0];
}
