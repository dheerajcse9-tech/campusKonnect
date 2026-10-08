import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env.js';

function limiter(windowMinutes: number, max: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
      });
    },
  });
}

/** Login, registration and password-reset endpoints. */
export const authLimiter = limiter(15, 20);

/** Content-creating endpoints (listings, posts, reports, messages). */
export const writeLimiter = limiter(1, 30);

/** Baseline limit for the whole API. */
export const apiLimiter = limiter(1, 300);
