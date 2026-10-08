import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './notifications.controller.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get('/', controller.list);
notificationsRouter.get('/unread-count', controller.unreadCount);
notificationsRouter.post('/read-all', controller.markAllRead);
notificationsRouter.post('/:id/read', controller.markRead);
