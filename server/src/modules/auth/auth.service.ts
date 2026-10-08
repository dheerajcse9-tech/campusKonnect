import type { User } from '@prisma/client';
import { env } from '../../config/env.js';
import { generateToken, hashPassword, hashToken, verifyPassword } from '../../lib/crypto.js';
import { emailService } from '../../lib/email/email.service.js';
import { passwordResetEmail, verificationEmail } from '../../lib/email/templates.js';
import { AppError, BadRequestError, ConflictError, UnauthorizedError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { type PrivateUser, toPrivateUser } from '../users/user.mapper.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { refreshTokenExpiry, signAccessToken } from './token.service.js';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: PrivateUser;
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before signing in');
  }
}

export class AccountBannedError extends AppError {
  constructor() {
    super(403, 'ACCOUNT_BANNED', 'This account has been suspended');
  }
}

export function isAllowedCollegeEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  // Accept the domain itself and any subdomain (e.g. cs.college.edu).
  return env.ALLOWED_EMAIL_DOMAINS.some(
    (allowed) => domain === allowed.toLowerCase() || domain.endsWith(`.${allowed.toLowerCase()}`),
  );
}

async function sendVerificationEmail(user: Pick<User, 'id' | 'email' | 'name'>): Promise<void> {
  const token = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });
  const url = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await emailService.send(verificationEmail(user.email, user.name, url));
}

async function issueSession(user: User): Promise<Session> {
  const refreshToken = generateToken(48);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiry() },
  });
  return { accessToken: signAccessToken(user), refreshToken, user: toPrivateUser(user) };
}

export async function register(input: RegisterInput): Promise<PrivateUser> {
  if (!isAllowedCollegeEmail(input.email)) {
    throw new BadRequestError(
      `Please use your college email address (${env.ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(', ')})`,
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('An account with this email already exists');

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      department: input.department,
      year: input.year,
    },
  });

  await sendVerificationEmail(user);
  return toPrivateUser(user);
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new BadRequestError('This verification link is invalid or has expired');
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: now } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: now } }),
  ]);
}

/** Always succeeds from the caller's view so it cannot be used to discover accounts. */
export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt && user.status === 'ACTIVE') {
    await sendVerificationEmail(user);
  }
}

export async function login(input: LoginInput): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same error for unknown email and wrong password, to avoid account enumeration.
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }
  if (user.status === 'BANNED') throw new AccountBannedError();
  if (!user.emailVerifiedAt) throw new EmailNotVerifiedError();

  return issueSession(user);
}

/**
 * Rotates a refresh token. Presenting a token that was already rotated is
 * treated as theft: every session for that user is revoked (ADR-0003).
 * Tokens revoked by logout or a password change are simply rejected.
 */
export async function refresh(rawToken: string | undefined): Promise<Session> {
  if (!rawToken) throw new UnauthorizedError('No session');

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });
  if (!record) throw new UnauthorizedError('Invalid session');

  if (record.rotatedAt) {
    await revokeAllSessions(record.userId);
    logger.warn({ userId: record.userId }, 'Refresh token reuse detected; all sessions revoked');
    throw new UnauthorizedError('Session expired, please sign in again');
  }
  if (record.revokedAt || record.expiresAt < new Date()) {
    throw new UnauthorizedError('Session expired, please sign in again');
  }

  const now = new Date();
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: now, rotatedAt: now },
  });

  if (record.user.status === 'BANNED') {
    await revokeAllSessions(record.userId);
    throw new AccountBannedError();
  }
  return issueSession(record.user);
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Always succeeds from the caller's view so it cannot be used to discover accounts. */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status === 'BANNED') return;

  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await emailService.send(passwordResetEmail(user.email, user.name, url));
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new BadRequestError('This reset link is invalid or has expired');
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: record.userId } });
  const now = new Date();
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: now } }),
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(password),
        // Following a reset link proves ownership of the inbox, so it also verifies it.
        emailVerifiedAt: user.emailVerifiedAt ?? now,
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);
}

/** Changes the password and signs out every other session (the current one is kept). */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentRefreshToken: string | undefined,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new BadRequestError('Current password is incorrect');
  }

  const keepHash = currentRefreshToken ? hashToken(currentRefreshToken) : undefined;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, ...(keepHash ? { tokenHash: { not: keepHash } } : {}) },
      data: { revokedAt: new Date() },
    }),
  ]);
}
