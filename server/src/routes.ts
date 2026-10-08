import { Router } from 'express';
import { adminRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { commentsRouter, postsRouter } from './modules/community/community.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { listingsRouter } from './modules/listings/listings.routes.js';
import { messagingRouter } from './modules/messaging/messaging.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
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
  api.use('/posts', postsRouter);
  api.use('/comments', commentsRouter);
  api.use('/reports', reportsRouter);
  api.use('/admin', adminRouter);
  return api;
}
