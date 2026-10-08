import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { ForbiddenError } from '../lib/errors.js';

/** Header the web client sends on every request. Browsers only allow it cross-origin after a CORS preflight. */
export const CSRF_HEADER = 'x-requested-with';

/**
 * CSRF protection for endpoints authenticated by the refresh cookie.
 * A forged cross-site form or fetch cannot set a custom header without passing
 * CORS, and any Origin it sends must be one of ours.
 */
export const requireSameOriginClient: RequestHandler = (req, _res, next) => {
  const origin = req.headers.origin;
  if (origin && !env.CLIENT_ORIGIN.includes(origin)) {
    throw new ForbiddenError('Request origin not allowed');
  }
  if (!req.headers[CSRF_HEADER]) {
    throw new ForbiddenError('Missing request header');
  }
  next();
};
