import { z } from 'zod';

export const createRequestSchema = z
  .object({
    listingId: z.string().uuid(),
    message: z.string().trim().max(500).optional(),
    rentStartDate: z.coerce.date().optional(),
    rentEndDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => !data.rentStartDate || !data.rentEndDate || data.rentEndDate > data.rentStartDate,
    { message: 'End date must be after the start date', path: ['rentEndDate'] },
  );

export const listRequestsQuerySchema = z.object({
  role: z.enum(['incoming', 'outgoing']).default('outgoing'),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']).optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
