import type { Prisma, RequestStatus, TransactionRequest } from '@prisma/client';
import { type Actor, isAdmin } from '../../lib/auth-context.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { listingCardSelect } from '../listings/listing.mapper.js';
import { type NotificationInput, notify } from '../notifications/notifications.service.js';
import { publicUserSelect } from '../users/user.mapper.js';
import {
  OPEN_REQUEST_STATUSES,
  type RequestAction,
  isConnected,
  nextStatus,
} from './request-state.js';
import type { CreateRequestInput, ListRequestsQuery } from './transactions.schemas.js';

type Tx = Prisma.TransactionClient;

const requestSummarySelect = {
  id: true,
  type: true,
  status: true,
  message: true,
  rentStartDate: true,
  rentEndDate: true,
  createdAt: true,
  updatedAt: true,
  respondedAt: true,
  completedAt: true,
  requesterId: true,
  sellerId: true,
  listing: { select: listingCardSelect },
  requester: { select: publicUserSelect },
  seller: { select: publicUserSelect },
  conversation: { select: { id: true } },
} satisfies Prisma.TransactionRequestSelect;

const link = (requestId: string) => `/requests/${requestId}`;

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function createRequest(actor: Actor, input: CreateRequestInput) {
  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    include: { seller: { select: { status: true } } },
  });
  if (!listing || listing.status === 'REMOVED' || listing.seller.status !== 'ACTIVE') {
    throw new NotFoundError('Listing');
  }
  if (listing.sellerId === actor.id)
    throw new BadRequestError("You can't request your own listing");
  if (listing.status !== 'ACTIVE') throw new ConflictError('This item is no longer available');

  if (listing.type === 'RENT') {
    if (!input.rentStartDate || !input.rentEndDate) {
      throw new BadRequestError('Choose the dates you want to rent this item for');
    }
    if (input.rentStartDate < startOfToday()) {
      throw new BadRequestError('The rental cannot start in the past');
    }
  } else if (input.rentStartDate || input.rentEndDate) {
    throw new BadRequestError('Rental dates only apply to rentals');
  }

  const open = await prisma.transactionRequest.findFirst({
    where: {
      listingId: listing.id,
      requesterId: actor.id,
      status: { in: [...OPEN_REQUEST_STATUSES] },
    },
  });
  if (open) throw new ConflictError('You already have an open request for this item');

  return prisma.$transaction(async (tx) => {
    const request = await tx.transactionRequest.create({
      data: {
        listingId: listing.id,
        requesterId: actor.id,
        sellerId: listing.sellerId,
        type: listing.type,
        message: input.message || null,
        rentStartDate: input.rentStartDate,
        rentEndDate: input.rentEndDate,
      },
      select: requestSummarySelect,
    });
    await notify(
      {
        userId: listing.sellerId,
        type: 'REQUEST_RECEIVED',
        title: `${request.requester.name} wants to ${listing.type === 'RENT' ? 'rent' : 'buy'} "${listing.title}"`,
        body: request.message ?? undefined,
        link: link(request.id),
      },
      tx,
    );
    return request;
  });
}

export async function listRequests(actor: Actor, query: ListRequestsQuery) {
  return prisma.transactionRequest.findMany({
    where: {
      ...(query.role === 'incoming' ? { sellerId: actor.id } : { requesterId: actor.id }),
      status: query.status,
    },
    orderBy: { updatedAt: 'desc' },
    select: requestSummarySelect,
    take: 100,
  });
}

/**
 * Request detail. Contact details of the other party are included only once the
 * seller has approved the request (FR-4.4, NFR-4).
 */
export async function getRequest(requestId: string, actor: Actor) {
  const request = await prisma.transactionRequest.findUnique({
    where: { id: requestId },
    select: requestSummarySelect,
  });
  if (!request) throw new NotFoundError('Request');

  const viewerRole =
    request.sellerId === actor.id
      ? 'seller'
      : request.requesterId === actor.id
        ? 'requester'
        : null;
  if (!viewerRole && !isAdmin(actor)) throw new NotFoundError('Request');

  let contact: { name: string; email: string; phone: string | null } | null = null;
  if (viewerRole && isConnected(request.status)) {
    const counterpartyId = viewerRole === 'seller' ? request.requesterId : request.sellerId;
    contact = await prisma.user.findUniqueOrThrow({
      where: { id: counterpartyId },
      select: { name: true, email: true, phone: true },
    });
  }

  return { ...request, viewerRole, contact };
}

/**
 * Loads a request, checks the actor's permission for the action and that the
 * transition is legal. Returns the request and its next status.
 */
async function prepareTransition(
  requestId: string,
  actor: Actor,
  action: RequestAction,
): Promise<{ request: TransactionRequest & { listing: { title: string } }; to: RequestStatus }> {
  const request = await prisma.transactionRequest.findUnique({
    where: { id: requestId },
    include: { listing: { select: { title: true } } },
  });
  const isSeller = request?.sellerId === actor.id;
  const isRequester = request?.requesterId === actor.id;
  if (!request || (!isSeller && !isRequester)) throw new NotFoundError('Request');

  const sellerOnly = action === 'approve' || action === 'reject' || action === 'complete';
  if (sellerOnly && !isSeller) throw new ForbiddenError('Only the seller can do that');

  return { request, to: nextStatus(request.status, action) };
}

/** Updates the request only if its status hasn't changed underneath us (optimistic concurrency). */
async function applyTransition(
  tx: Tx,
  request: TransactionRequest,
  to: RequestStatus,
  extra: Prisma.TransactionRequestUpdateManyMutationInput = {},
): Promise<void> {
  const { count } = await tx.transactionRequest.updateMany({
    where: { id: request.id, status: request.status },
    data: { status: to, ...extra },
  });
  if (count === 0)
    throw new ConflictError('This request was updated by someone else. Refresh and try again.');
}

export async function approveRequest(requestId: string, actor: Actor) {
  const { request, to } = await prepareTransition(requestId, actor, 'approve');

  await prisma.$transaction(async (tx) => {
    // Reserve the listing atomically; fails if another request was approved first.
    const reserved = await tx.listing.updateMany({
      where: { id: request.listingId, status: 'ACTIVE' },
      data: { status: 'RESERVED' },
    });
    if (reserved.count === 0) {
      throw new ConflictError(
        'This item is already reserved for another request or is no longer available',
      );
    }
    await applyTransition(tx, request, to, { respondedAt: new Date() });
    await tx.conversation.create({ data: { requestId: request.id } });
    await notify(
      {
        userId: request.requesterId,
        type: 'REQUEST_APPROVED',
        title: `Your request for "${request.listing.title}" was approved`,
        body: 'Contact details and chat are now unlocked.',
        link: link(request.id),
      },
      tx,
    );
  });
  return getRequest(requestId, actor);
}

export async function rejectRequest(requestId: string, actor: Actor) {
  const { request, to } = await prepareTransition(requestId, actor, 'reject');
  await prisma.$transaction(async (tx) => {
    await applyTransition(tx, request, to, { respondedAt: new Date() });
    await notify(
      {
        userId: request.requesterId,
        type: 'REQUEST_REJECTED',
        title: `Your request for "${request.listing.title}" was declined`,
        link: link(request.id),
      },
      tx,
    );
  });
  return getRequest(requestId, actor);
}

export async function cancelRequest(requestId: string, actor: Actor) {
  const { request, to } = await prepareTransition(requestId, actor, 'cancel');
  const cancelledBySeller = request.sellerId === actor.id;

  await prisma.$transaction(async (tx) => {
    await applyTransition(tx, request, to);
    if (request.status === 'APPROVED') {
      // The deal fell through: put the item back on the market.
      await tx.listing.updateMany({
        where: { id: request.listingId, status: 'RESERVED' },
        data: { status: 'ACTIVE' },
      });
    }
    await notify(
      {
        userId: cancelledBySeller ? request.requesterId : request.sellerId,
        type: 'REQUEST_CANCELLED',
        title: cancelledBySeller
          ? `The seller cancelled your request for "${request.listing.title}"`
          : `A request for "${request.listing.title}" was cancelled`,
        link: link(request.id),
      },
      tx,
    );
  });
  return getRequest(requestId, actor);
}

export async function completeRequest(requestId: string, actor: Actor) {
  const { request, to } = await prepareTransition(requestId, actor, 'complete');

  await prisma.$transaction(async (tx) => {
    await applyTransition(tx, request, to, { completedAt: new Date() });

    if (request.type === 'SELL') {
      await tx.listing.update({ where: { id: request.listingId }, data: { status: 'SOLD' } });
      await closeOpenRequests(tx, request.listingId, 'REJECTED', 'is no longer available');
    } else {
      // Rental returned: the item can be rented again.
      await tx.listing.update({ where: { id: request.listingId }, data: { status: 'ACTIVE' } });
    }

    await notify(
      {
        userId: request.requesterId,
        type: 'REQUEST_COMPLETED',
        title:
          request.type === 'SELL'
            ? `Deal completed for "${request.listing.title}"`
            : `Rental of "${request.listing.title}" marked as returned`,
        link: link(request.id),
      },
      tx,
    );
  });
  return getRequest(requestId, actor);
}

/**
 * Closes every open request on a listing (e.g. it sold, or was removed) and tells
 * each requester. Must run inside the transaction that changes the listing.
 */
export async function closeOpenRequests(
  tx: Tx,
  listingId: string,
  status: 'REJECTED' | 'CANCELLED',
  reason: string,
): Promise<void> {
  const open = await tx.transactionRequest.findMany({
    where: { listingId, status: { in: [...OPEN_REQUEST_STATUSES] } },
    include: { listing: { select: { title: true } } },
  });
  if (open.length === 0) return;

  await tx.transactionRequest.updateMany({
    where: { id: { in: open.map((r) => r.id) } },
    data: { status, respondedAt: new Date() },
  });
  const notifications: NotificationInput[] = open.map((r) => ({
    userId: r.requesterId,
    type: status === 'REJECTED' ? 'REQUEST_REJECTED' : 'REQUEST_CANCELLED',
    title: `"${r.listing.title}" ${reason}`,
    link: link(r.id),
  }));
  await notify(notifications, tx);
}
