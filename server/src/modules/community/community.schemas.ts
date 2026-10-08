import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

export const POST_TYPES = ['DISCUSSION', 'DOUBT'] as const;

/** Tags are normalised to lowercase-kebab-case and de-duplicated. */
export const tagsSchema = z
  .array(z.string())
  .max(5, 'Use at most 5 tags')
  .transform((tags) => [
    ...new Set(
      tags
        .map((tag) =>
          tag
            .trim()
            .toLowerCase()
            .replace(/^#/, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
        )
        .filter((tag) => tag.length >= 2 && tag.length <= 30),
    ),
  ]);

export const createPostSchema = z.object({
  type: z.enum(POST_TYPES).default('DISCUSSION'),
  title: z.string().trim().min(5, 'Title is too short').max(150),
  body: z.string().trim().min(10, 'Add a bit more detail').max(5000),
  tags: tagsSchema.default([]),
});

export const updatePostSchema = z
  .object({
    type: z.enum(POST_TYPES).optional(),
    title: z.string().trim().min(5).max(150).optional(),
    body: z.string().trim().min(10).max(5000).optional(),
    tags: tagsSchema.optional(),
  })
  .strict();

export const listPostsQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  type: z.enum(POST_TYPES).optional(),
  tag: z.string().trim().toLowerCase().max(30).optional(),
  authorId: z.string().uuid().optional(),
  sort: z.enum(['newest', 'top']).default('newest'),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(3000),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
