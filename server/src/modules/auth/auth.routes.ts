import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireSameOriginClient } from '../../middleware/csrf.js';
import { authLimiter, emailSendLimiter, loginAccountLimiter } from '../../middleware/rate-limit.js';
import * as controller from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, controller.register);
authRouter.post('/verify-email', authLimiter, controller.verifyEmail);
authRouter.post(
  '/resend-verification',
  authLimiter,
  emailSendLimiter,
  controller.resendVerification,
);
authRouter.post('/login', authLimiter, loginAccountLimiter, controller.login);
authRouter.post('/refresh', requireSameOriginClient, controller.refresh);
authRouter.post('/logout', requireSameOriginClient, controller.logout);
authRouter.post('/forgot-password', authLimiter, emailSendLimiter, controller.forgotPassword);
authRouter.post('/reset-password', authLimiter, controller.resetPassword);
authRouter.post(
  '/change-password',
  authLimiter,
  requireSameOriginClient,
  requireAuth,
  controller.changePassword,
);
