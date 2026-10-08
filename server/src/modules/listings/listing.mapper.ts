import type { Prisma } from '@prisma/client';
import { publicUserSelect } from '../users/user.mapper.js';

/** Fields needed to render a listing card in feeds and on profiles. */
export const listingCardSelect = {
  id: true,
  title: true,
  type: true,
  category: true,
  condition: true,
  price: true,
  rentPeriod: true,
  deposit: true,
  location: true,
  status: true,
  createdAt: true,
  images: { select: { id: true, url: true }, orderBy: { position: 'asc' }, take: 1 },
  seller: { select: { id: true, name: true, avatarUrl: true, department: true } },
} satisfies Prisma.ListingSelect;

/** Everything shown on the listing detail page. */
export const listingDetailSelect = {
  ...listingCardSelect,
  description: true,
  sellerId: true,
  updatedAt: true,
  images: { select: { id: true, url: true, position: true }, orderBy: { position: 'asc' } },
  seller: { select: publicUserSelect },
} satisfies Prisma.ListingSelect;
