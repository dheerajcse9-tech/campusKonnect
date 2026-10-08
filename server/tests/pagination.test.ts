import { describe, expect, it } from 'vitest';
import { paginated, paginationSchema, toSkipTake } from '../src/lib/pagination.js';

describe('pagination helpers', () => {
  it('applies defaults and coerces strings', () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationSchema.parse({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10 });
  });

  it('caps the page size', () => {
    expect(() => paginationSchema.parse({ limit: 500 })).toThrow();
  });

  it('converts to skip/take', () => {
    expect(toSkipTake({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it('computes total pages', () => {
    expect(paginated([1, 2], 21, { page: 1, limit: 10 }).totalPages).toBe(3);
    expect(paginated([], 0, { page: 1, limit: 10 }).totalPages).toBe(1);
  });
});
