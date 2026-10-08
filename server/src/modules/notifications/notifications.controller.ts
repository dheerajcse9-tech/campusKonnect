import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser, uuidParam } from '../../lib/http.js';
import { paginationSchema } from '../../lib/pagination.js';
import * as notificationsService from './notifications.service.js';

const listQuerySchema = paginationSchema.extend({
  unread: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export async function list(req: Request, res: Response): Promise<void> {
  const query = listQuerySchema.parse(req.query);
  res.json(await notificationsService.listNotifications(currentUser(req).id, query));
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  res.json({ unreadCount: await notificationsService.unreadCount(currentUser(req).id) });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const { id } = uuidParam.parse(req.params);
  await notificationsService.markRead(currentUser(req).id, id);
  res.status(204).end();
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  await notificationsService.markAllRead(currentUser(req).id);
  res.status(204).end();
}
