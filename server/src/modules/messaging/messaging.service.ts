import type { Prisma } from '@prisma/client';
import type { Actor } from '../../lib/auth-context.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { notify } from '../notifications/notifications.service.js';
import { isConnected } from '../transactions/request-state.js';

const MESSAGE_PAGE = 200;

const participantFilter = (userId: string): Prisma.ConversationWhereInput => ({
  request: { OR: [{ requesterId: userId }, { sellerId: userId }] },
});

const conversationLink = (id: string) => `/messages/${id}`;

async function loadConversation(conversationId: string, actor: Actor) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, ...participantFilter(actor.id) },
    include: {
      request: {
        select: {
          id: true,
          status: true,
          type: true,
          requesterId: true,
          sellerId: true,
          listing: {
            select: {
              id: true,
              title: true,
              price: true,
              images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
            },
          },
          requester: { select: { id: true, name: true, avatarUrl: true } },
          seller: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!conversation) throw new NotFoundError('Conversation');
  return conversation;
}

export async function listConversations(actor: Actor) {
  const conversations = await prisma.conversation.findMany({
    where: participantFilter(actor.id),
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      updatedAt: true,
      request: {
        select: {
          id: true,
          status: true,
          requesterId: true,
          listing: {
            select: {
              id: true,
              title: true,
              images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
            },
          },
          requester: { select: { id: true, name: true, avatarUrl: true } },
          seller: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: { where: { readAt: null, senderId: { not: actor.id } } } } },
    },
  });

  return conversations.map(({ request, messages, _count, ...conversation }) => ({
    ...conversation,
    request: { id: request.id, status: request.status },
    listing: request.listing,
    counterpart: request.requesterId === actor.id ? request.seller : request.requester,
    lastMessage: messages[0] ?? null,
    unreadCount: _count.messages,
  }));
}

/** Returns messages (oldest first) and marks the ones sent to the viewer as read. */
export async function getMessages(conversationId: string, actor: Actor, after?: Date) {
  const conversation = await loadConversation(conversationId, actor);

  const messages = after
    ? await prisma.message.findMany({
        where: { conversationId, createdAt: { gt: after } },
        orderBy: { createdAt: 'asc' },
        take: MESSAGE_PAGE,
      })
    : (
        await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          take: MESSAGE_PAGE,
        })
      ).reverse();

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: actor.id }, readAt: null },
    data: { readAt: new Date() },
  });

  const { request } = conversation;
  return {
    conversation: {
      id: conversation.id,
      request: { id: request.id, status: request.status, type: request.type },
      listing: request.listing,
      counterpart: request.requesterId === actor.id ? request.seller : request.requester,
      canSend: isConnected(request.status),
    },
    messages,
  };
}

export async function sendMessage(conversationId: string, actor: Actor, body: string) {
  const conversation = await loadConversation(conversationId, actor);
  const { request } = conversation;
  if (!isConnected(request.status)) {
    throw new ForbiddenError('This conversation is closed because the request is no longer active');
  }
  const recipientId = request.requesterId === actor.id ? request.sellerId : request.requesterId;
  const sender = request.requesterId === actor.id ? request.requester : request.seller;

  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({ data: { conversationId, senderId: actor.id, body } });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // One unread "new message" notification per conversation is enough; don't flood the bell.
    const pending = await tx.notification.findFirst({
      where: {
        userId: recipientId,
        type: 'NEW_MESSAGE',
        link: conversationLink(conversationId),
        readAt: null,
      },
    });
    if (!pending) {
      await notify(
        {
          userId: recipientId,
          type: 'NEW_MESSAGE',
          title: `New message from ${sender.name}`,
          body: `About "${request.listing.title}"`,
          link: conversationLink(conversationId),
        },
        tx,
      );
    }
    return message;
  });
}
