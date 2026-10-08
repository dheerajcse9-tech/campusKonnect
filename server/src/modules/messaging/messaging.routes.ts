import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rate-limit.js';
import * as controller from './messaging.controller.js';

export const messagingRouter = Router();

messagingRouter.use(requireAuth);
messagingRouter.get('/', controller.list);
messagingRouter.get('/:id/messages', controller.messages);
messagingRouter.post('/:id/messages', writeLimiter, controller.send);
