import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const LISTING_CATEGORIES = [
  'BOOKS',
  'ELECTRONICS',
  'CYCLES',
  'FURNITURE',
  'CLOTHING',
  'STATIONERY',
  'SPORTS',
  'HOSTEL_ESSENTIALS',
  'OTHER',
] as const;
export const ITEM_CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'] as const;
export const LISTING_TYPES = ['SELL', 'RENT'] as const;
export const RENT_PERIODS = ['DAY', 'WEEK', 'MONTH'] as const;

const MAX_PRICE = 1_000_000;

/** Multipart forms send everything as strings; treat "" as "not provided". */
const blankToUndefined = (value: unknown) => (value === '' ? undefined : value);
const money = z.coerce
  .number({ error: 'Enter an amount in rupees' })
  .int('Use whole rupees')
  .min(0)
  .max(MAX_PRICE);
const optionalMoney = z.preprocess(blankToUndefined, money.optional());

const listingFields = {
  title: z.string().trim().min(3, 'Title is too short').max(100),
  description: z.string().trim().min(10, 'Add a few more details').max(2000),
  category: z.enum(LISTING_CATEGORIES),
  condition: z.enum(ITEM_CONDITIONS),
  price: z.preprocess(blankToUndefined, money),
  rentPeriod: z.preprocess(blankToUndefined, z.enum(RENT_PERIODS).optional()),
  deposit: optionalMoney,
  location: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
};

export const createListingSchema = z
  .object({ ...listingFields, type: z.enum(LISTING_TYPES) })
  .superRefine((data, ctx) => {
    if (data.type === 'RENT' && !data.rentPeriod) {
      ctx.addIssue({ code: 'custom', path: ['rentPeriod'], message: 'Choose a rent period' });
    }
    if (data.type === 'SELL' && (data.rentPeriod || data.deposit !== undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['type'],
        message: 'Rent period and deposit only apply to rentals',
      });
    }
  });

/** The listing type is fixed after creation; rental terms are checked against it in the service. */
export const updateListingSchema = z
  .object({
    title: listingFields.title.optional(),
    description: listingFields.description.optional(),
    category: listingFields.category.optional(),
    condition: listingFields.condition.optional(),
    price: money.optional(),
    rentPeriod: z.enum(RENT_PERIODS).optional(),
    deposit: money.nullable().optional(),
    location: z.string().trim().max(100).nullable().optional(),
  })
  .strict();

export const listingStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SOLD']) });

export const listListingsQuerySchema = paginationSchema
  .extend({
    q: z.string().trim().max(100).optional(),
    category: z.enum(LISTING_CATEGORIES).optional(),
    type: z.enum(LISTING_TYPES).optional(),
    condition: z.enum(ITEM_CONDITIONS).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    sellerId: z.string().uuid().optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice must not exceed maxPrice',
    path: ['minPrice'],
  });

export const imageParamsSchema = z.object({ id: z.string().uuid(), imageId: z.string().uuid() });

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;
