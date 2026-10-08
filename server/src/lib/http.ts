import type { Request } from 'express';
import { z } from 'zod';
import { UnauthorizedError } from './errors.js';

export const uuidParam = z.object({ id: z.string().uuid() });

/** Returns the authenticated user, or throws if the route was not protected. */
export function currentUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
