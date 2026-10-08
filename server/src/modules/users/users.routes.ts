import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rate-limit.js';
import { imageUpload } from '../../middleware/upload.js';
import * as controller from './users.controller.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.get('/me', controller.getMe);
usersRouter.patch('/me', controller.updateMe);
usersRouter.post('/me/delete', authLimiter, controller.deleteAccount);
usersRouter.post('/me/avatar', imageUpload.single('image'), controller.updateAvatar);
usersRouter.get('/:id', controller.getProfile);
