import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as controller from './admin.controller.js';

export const adminRouter = Router();

// Every admin route requires an authenticated administrator (server-side authorisation).
adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/stats', controller.stats);
adminRouter.get('/users', controller.listUsers);
adminRouter.post('/users/:id/ban', controller.banUser);
adminRouter.post('/users/:id/unban', controller.unbanUser);
adminRouter.get('/reports', controller.listReports);
adminRouter.post('/reports/:id/resolve', controller.resolveReport);
adminRouter.post('/reports/:id/dismiss', controller.dismissReport);
adminRouter.post('/listings/:id/remove', controller.removeListing);
adminRouter.post('/posts/:id/remove', controller.removePost);
adminRouter.post('/comments/:id/remove', controller.removeComment);
adminRouter.get('/audit-logs', controller.auditLogs);
