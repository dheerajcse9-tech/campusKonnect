import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Converts page/limit into Prisma's skip/take. */
export function toSkipTake({ page, limit }: PaginationInput): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function paginated<T>(items: T[], total: number, { page, limit }: PaginationInput): Paginated<T> {
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
