import { z } from 'zod';

export const REPORT_TARGET_TYPES = ['USER', 'LISTING', 'POST', 'COMMENT'] as const;
export const REPORT_REASONS = [
  'SPAM',
  'SCAM',
  'INAPPROPRIATE',
  'HARASSMENT',
  'PROHIBITED_ITEM',
  'OTHER',
] as const;

export const createReportSchema = z
  .object({
    targetType: z.enum(REPORT_TARGET_TYPES),
    targetId: z.string().uuid(),
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().max(1000).optional(),
  })
  .refine((data) => data.reason !== 'OTHER' || (data.details && data.details.length >= 5), {
    message: 'Please describe the problem',
    path: ['details'],
  });

export type CreateReportInput = z.infer<typeof createReportSchema>;
