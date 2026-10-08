import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';
import { REPORT_TARGET_TYPES } from '../reports/reports.schemas.js';

export const listUsersQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'BANNED']).optional(),
  role: z.enum(['STUDENT', 'ADMIN']).optional(),
});

export const banSchema = z.object({
  reason: z.string().trim().min(5, 'Give a short reason (shown in the audit log)').max(500),
});

export const removeContentSchema = z.object({
  reason: z.string().trim().min(5, 'Give a short reason (shown to the author)').max(500),
});

export const listReportsQuerySchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED']).default('OPEN'),
  targetType: z.enum(REPORT_TARGET_TYPES).optional(),
});

export const resolveReportSchema = z.object({
  note: z.string().trim().max(500).optional(),
  removeContent: z.boolean().default(false),
  banUser: z.boolean().default(false),
});

export const dismissReportSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const listAuditQuerySchema = paginationSchema.extend({
  action: z.string().trim().max(50).optional(),
  actorId: z.string().uuid().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
