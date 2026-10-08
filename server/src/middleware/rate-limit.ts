import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import { isTest } from '../config/env.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';

type KeyRequest = Parameters<NonNullable<Options['keyGenerator']>>[0];

interface LimiterOptions {
  windowMinutes: number;
  max: Options['limit'];
  keyGenerator?: Options['keyGenerator'];
  /** The shared limiters are disabled in tests so suites don't trip them. */
  enabledInTests?: boolean;
}

export function createLimiter({
  windowMinutes,
  max,
  keyGenerator,
  enabledInTests = false,
}: LimiterOptions) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator,
    skip: () => isTest && !enabledInTests,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please wait a few minutes and try again.',
        },
      });
    },
  });
}

const ipKey = (req: KeyRequest) => `ip:${ipKeyGenerator(req.ip ?? '')}`;

/**
 * Keys signed-in traffic by user rather than IP. Campus Wi-Fi typically puts
 * hundreds of students behind a handful of NAT addresses, so per-IP limits
 * alone would throttle everyone at once.
 */
export function userOrIpKey(req: KeyRequest): string {
  if (req.user) return `user:${req.user.id}`;
  const header = req.headers.authorization;
  const payload = header?.startsWith('Bearer ') ? verifyAccessToken(header.slice(7)) : null;
  return payload ? `user:${payload.sub}` : ipKey(req);
}

/**
 * Per-IP limit for unauthenticated auth endpoints. Deliberately generous because
 * of campus NAT; brute force is handled per account by `loginAccountLimiter`.
 */
export const authLimiter = createLimiter({ windowMinutes: 15, max: 300 });

/** Normalises the email in the body so attempts on one account are counted together. */
export function emailKey(req: KeyRequest): string {
  const email: unknown = req.body?.email;
  return typeof email === 'string' && email.trim()
    ? `email:${email.trim().toLowerCase()}`
    : ipKey(req);
}

/**
 * Per-account login limit, so password guessing against one student is slowed
 * down even when it comes from many IP addresses.
 */
export const loginAccountLimiter = createLimiter({
  windowMinutes: 15,
  max: 10,
  keyGenerator: emailKey,
});

/**
 * Endpoints that send an email to the address in the body (password reset,
 * resend verification). Limited per address so nobody can flood a student's
 * inbox, even with spoofed or rotating IPs.
 */
export const emailSendLimiter = createLimiter({
  windowMinutes: 60,
  max: 5,
  keyGenerator: emailKey,
});

/** Content-creating endpoints (listings, posts, reports, messages), per user. */
export const writeLimiter = createLimiter({ windowMinutes: 1, max: 20, keyGenerator: userOrIpKey });

/** Baseline limit for the whole API: per user when signed in, per IP (shared by a campus) otherwise. */
export const apiLimiter = createLimiter({
  windowMinutes: 1,
  max: (req) => (userOrIpKey(req).startsWith('user:') ? 300 : 3000),
  keyGenerator: userOrIpKey,
});
