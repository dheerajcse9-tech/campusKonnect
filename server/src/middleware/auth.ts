import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { AccountBannedError } from '../modules/auth/auth.service.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';

/**
 * Verifies the Bearer access token and loads the user. The user's status is
 * re-read on every request so a ban takes effect immediately.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) throw new UnauthorizedError();

  const payload = verifyAccessToken(token);
  if (!payload) throw new UnauthorizedError('Session expired');

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!user || user.status === 'DELETED') throw new UnauthorizedError();
  if (user.status === 'BANNED') throw new AccountBannedError();

  req.user = { id: user.id, email: user.email, role: user.role };
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
}
