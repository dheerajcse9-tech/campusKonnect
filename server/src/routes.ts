import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { listingsRouter } from './modules/listings/listings.routes.js';
import { messagingRouter } from './modules/messaging/messaging.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

/** Mounts every feature module under /api. */
export function buildApiRouter(): Router {
  const api = Router();
  api.use('/health', healthRouter);
  api.use('/auth', authRouter);
  api.use('/users', usersRouter);
  api.use('/listings', listingsRouter);
  api.use('/requests', transactionsRouter);
  api.use('/conversations', messagingRouter);
  api.use('/notifications', notificationsRouter);
  return api;
}
