import { z } from 'zod';

export const listMessagesQuerySchema = z.object({
  after: z.coerce.date().optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});
