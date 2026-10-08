import type { NotificationType, Prisma } from '@prisma/client';
import { NotFoundError } from '../../lib/errors.js';
import { type PaginationInput, paginated, toSkipTake } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

type Client = Prisma.TransactionClient | typeof prisma;

/**
 * Records in-app notifications. Pass the transaction client when called inside
 * a `$transaction` so the notification commits atomically with the event.
 */
export async function notify(
  input: NotificationInput | NotificationInput[],
  db: Client = prisma,
): Promise<void> {
  const data = Array.isArray(input) ? input : [input];
  if (data.length > 0) await db.notification.createMany({ data });
}

export async function listNotifications(
  userId: string,
  query: PaginationInput & { unread?: boolean },
) {
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(query.unread ? { readAt: null } : {}),
  };
  const [items, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { ...paginated(items, total, query), unreadCount };
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  const { count } = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
  if (count === 0) throw new NotFoundError('Notification');
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
