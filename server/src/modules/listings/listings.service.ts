import type { Listing, Prisma } from '@prisma/client';
import { type Actor, isAdmin } from '../../lib/auth-context.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { paginated, toSkipTake } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { requireImage } from '../../lib/storage/image.js';
import { storageService } from '../../lib/storage/storage.service.js';
import { MAX_LISTING_IMAGES } from '../../middleware/upload.js';
import { OPEN_REQUEST_STATUSES } from '../transactions/request-state.js';
import { closeOpenRequests } from '../transactions/transactions.service.js';
import { listingCardSelect, listingDetailSelect } from './listing.mapper.js';
import type {
  CreateListingInput,
  ListListingsQuery,
  UpdateListingInput,
} from './listings.schemas.js';

async function uploadImages(buffers: Buffer[]) {
  // Validate every file before uploading any, so a bad file doesn't leave orphans behind.
  const extensions = buffers.map(requireImage);
  return Promise.all(
    buffers.map((buffer, i) =>
      storageService.upload({ buffer, extension: extensions[i] }, 'listings'),
    ),
  );
}

async function findOwnedListing(listingId: string, actor: Actor): Promise<Listing> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status === 'REMOVED') throw new NotFoundError('Listing');
  if (listing.sellerId !== actor.id)
    throw new ForbiddenError('Only the seller can change this listing');
  return listing;
}

export async function createListing(actor: Actor, input: CreateListingInput, images: Buffer[]) {
  if (images.length > MAX_LISTING_IMAGES) {
    throw new BadRequestError(`A listing can have at most ${MAX_LISTING_IMAGES} images`);
  }
  const stored = await uploadImages(images);

  return prisma.listing.create({
    data: {
      sellerId: actor.id,
      title: input.title,
      description: input.description,
      type: input.type,
      category: input.category,
      condition: input.condition,
      price: input.price,
      rentPeriod: input.type === 'RENT' ? input.rentPeriod : null,
      deposit: input.type === 'RENT' ? (input.deposit ?? null) : null,
      location: input.location,
      images: {
        create: stored.map((file, position) => ({ url: file.url, storageKey: file.key, position })),
      },
    },
    select: listingDetailSelect,
  });
}

export async function listListings(query: ListListingsQuery) {
  const where: Prisma.ListingWhereInput = {
    status: 'ACTIVE',
    seller: { status: 'ACTIVE' },
    category: query.category,
    type: query.type,
    condition: query.condition,
    sellerId: query.sellerId,
    price: { gte: query.minPrice, lte: query.maxPrice },
  };
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    query.sort === 'price_asc'
      ? [{ price: 'asc' }, { createdAt: 'desc' }]
      : query.sort === 'price_desc'
        ? [{ price: 'desc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }];

  const [items, total] = await prisma.$transaction([
    prisma.listing.findMany({
      where,
      orderBy: [...orderBy, { id: 'asc' }],
      select: listingCardSelect,
      ...toSkipTake(query),
    }),
    prisma.listing.count({ where }),
  ]);
  return paginated(items, total, query);
}

export async function listMyListings(actor: Actor) {
  return prisma.listing.findMany({
    where: { sellerId: actor.id, status: { not: 'REMOVED' } },
    orderBy: { createdAt: 'desc' },
    select: {
      ...listingCardSelect,
      _count: { select: { requests: { where: { status: 'PENDING' } } } },
    },
  });
}

export async function getListing(listingId: string, actor: Actor) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: listingDetailSelect,
  });
  const isOwner = listing?.sellerId === actor.id;
  if (!listing || (listing.status === 'REMOVED' && !isOwner && !isAdmin(actor))) {
    throw new NotFoundError('Listing');
  }

  // Lets the UI show "Request sent" instead of the request button.
  const viewerRequest = isOwner
    ? null
    : await prisma.transactionRequest.findFirst({
        where: { listingId, requesterId: actor.id, status: { in: [...OPEN_REQUEST_STATUSES] } },
        select: { id: true, status: true },
      });

  return { ...listing, isOwner, viewerRequest };
}

export async function updateListing(listingId: string, actor: Actor, input: UpdateListingInput) {
  const listing = await findOwnedListing(listingId, actor);
  if (listing.type === 'SELL' && (input.rentPeriod || input.deposit != null)) {
    throw new BadRequestError('Rent period and deposit only apply to rentals');
  }
  return prisma.listing.update({
    where: { id: listingId },
    data: input,
    select: listingDetailSelect,
  });
}

export async function addImages(listingId: string, actor: Actor, images: Buffer[]) {
  await findOwnedListing(listingId, actor);
  if (images.length === 0) throw new BadRequestError('Attach at least one image');

  const existing = await prisma.listingImage.findMany({
    where: { listingId },
    orderBy: { position: 'desc' },
  });
  if (existing.length + images.length > MAX_LISTING_IMAGES) {
    throw new BadRequestError(`A listing can have at most ${MAX_LISTING_IMAGES} images`);
  }

  const stored = await uploadImages(images);
  const start = (existing[0]?.position ?? -1) + 1;
  await prisma.listingImage.createMany({
    data: stored.map((file, i) => ({
      listingId,
      url: file.url,
      storageKey: file.key,
      position: start + i,
    })),
  });
  return prisma.listing.findUniqueOrThrow({
    where: { id: listingId },
    select: listingDetailSelect,
  });
}

export async function removeImage(listingId: string, imageId: string, actor: Actor) {
  await findOwnedListing(listingId, actor);
  const image = await prisma.listingImage.findFirst({ where: { id: imageId, listingId } });
  if (!image) throw new NotFoundError('Image');

  await prisma.listingImage.delete({ where: { id: imageId } });
  await storageService.remove(image.storageKey);
  return prisma.listing.findUniqueOrThrow({
    where: { id: listingId },
    select: listingDetailSelect,
  });
}

/** Lets the seller mark an item sold elsewhere, or relist it. */
export async function setStatus(listingId: string, actor: Actor, status: 'ACTIVE' | 'SOLD') {
  const listing = await findOwnedListing(listingId, actor);
  if (listing.status === 'RESERVED') {
    throw new ConflictError('This listing has an approved request. Complete or cancel it first.');
  }
  return prisma.$transaction(async (tx) => {
    if (status === 'SOLD') {
      await closeOpenRequests(tx, listingId, 'REJECTED', 'was sold elsewhere');
    }
    return tx.listing.update({
      where: { id: listingId },
      data: { status },
      select: listingDetailSelect,
    });
  });
}

/**
 * Removes a listing. Listings that never received a request are deleted outright;
 * otherwise the row is kept (status REMOVED) so request and report history stay intact.
 */
export async function deleteListing(listingId: string, actor: Actor): Promise<void> {
  const listing = await findOwnedListing(listingId, actor);
  if (listing.status === 'RESERVED') {
    throw new ConflictError('This listing has an approved request. Complete or cancel it first.');
  }

  const requestCount = await prisma.transactionRequest.count({ where: { listingId } });
  if (requestCount > 0) {
    await prisma.$transaction(async (tx) => {
      await closeOpenRequests(tx, listingId, 'CANCELLED', 'was removed by the seller');
      await tx.listing.update({ where: { id: listingId }, data: { status: 'REMOVED' } });
    });
    return;
  }

  const images = await prisma.listingImage.findMany({ where: { listingId } });
  await prisma.listing.delete({ where: { id: listingId } });
  await Promise.all(images.map((image) => storageService.remove(image.storageKey)));
}
