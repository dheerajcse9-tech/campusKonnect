import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export type AuditAction =
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'LISTING_REMOVED'
  | 'POST_REMOVED'
  | 'COMMENT_REMOVED'
  | 'REPORT_RESOLVED'
  | 'REPORT_DISMISSED';

export interface AuditEntry {
  actorId: string;
  action: AuditAction;
  targetType: 'USER' | 'LISTING' | 'POST' | 'COMMENT' | 'REPORT';
  targetId: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Appends to the audit trail (FR-7.5, NFR-10). Call with the transaction client
 * so the log entry commits atomically with the action it describes.
 */
export async function recordAudit(
  entry: AuditEntry,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await db.auditLog.create({ data: entry });
}
