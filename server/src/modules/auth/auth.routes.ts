import { Router } from 'express';
import { authLimiter } from '../../middleware/rate-limit.js';
import * as controller from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, controller.register);
authRouter.post('/verify-email', authLimiter, controller.verifyEmail);
authRouter.post('/resend-verification', authLimiter, controller.resendVerification);
authRouter.post('/login', authLimiter, controller.login);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.post('/forgot-password', authLimiter, controller.forgotPassword);
authRouter.post('/reset-password', authLimiter, controller.resetPassword);
