import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rate-limit.js';
import * as controller from './transactions.controller.js';

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);
transactionsRouter.post('/', writeLimiter, controller.create);
transactionsRouter.get('/', controller.list);
transactionsRouter.get('/:id', controller.get);
transactionsRouter.post('/:id/approve', controller.approve);
transactionsRouter.post('/:id/reject', controller.reject);
transactionsRouter.post('/:id/cancel', controller.cancel);
transactionsRouter.post('/:id/complete', controller.complete);
