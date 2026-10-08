import type { CookieOptions, Request, Response } from 'express';
import { env, isProduction } from '../../config/env.js';
import {
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from './auth.schemas.js';
import * as authService from './auth.service.js';

export const REFRESH_COOKIE = 'ck_refresh';

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // SameSite=None requires Secure; cross-site deployments (Vercel + Render) need both.
    secure: isProduction || env.COOKIE_SAMESITE === 'none',
    sameSite: env.COOKIE_SAMESITE,
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function sendSession(res: Response, session: authService.Session): void {
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
  res.json({ accessToken: session.accessToken, user: session.user });
}

function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

export async function register(req: Request, res: Response): Promise<void> {
  const user = await authService.register(registerSchema.parse(req.body));
  res.status(201).json({
    user,
    message: 'Account created. Check your college inbox for a verification link.',
  });
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = tokenSchema.parse(req.body);
  await authService.verifyEmail(token);
  res.json({ message: 'Email verified. You can now sign in.' });
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  const { email } = emailOnlySchema.parse(req.body);
  await authService.resendVerification(email);
  res.json({ message: 'If that account needs verification, a new link is on its way.' });
}

export async function login(req: Request, res: Response): Promise<void> {
  sendSession(res, await authService.login(loginSchema.parse(req.body)));
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    sendSession(res, await authService.refresh(readRefreshCookie(req)));
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    throw err;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(readRefreshCookie(req));
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  res.status(204).end();
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = emailOnlySchema.parse(req.body);
  await authService.forgotPassword(email);
  res.json({ message: 'If an account exists for that email, a reset link is on its way.' });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, password);
  res.json({ message: 'Password updated. Please sign in with your new password.' });
}
