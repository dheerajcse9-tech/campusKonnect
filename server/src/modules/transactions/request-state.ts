import type { RequestStatus } from '@prisma/client';
import { ConflictError } from '../../lib/errors.js';

export type RequestAction = 'approve' | 'reject' | 'cancel' | 'complete';

/**
 * The request lifecycle (docs/03-database-design.md §3.4).
 * Anything not listed here is an illegal transition.
 */
const TRANSITIONS: Record<RequestStatus, Partial<Record<RequestAction, RequestStatus>>> = {
  PENDING: { approve: 'APPROVED', reject: 'REJECTED', cancel: 'CANCELLED' },
  APPROVED: { cancel: 'CANCELLED', complete: 'COMPLETED' },
  REJECTED: {},
  CANCELLED: {},
  COMPLETED: {},
};

export const OPEN_REQUEST_STATUSES = ['PENDING', 'APPROVED'] as const satisfies RequestStatus[];

/** Statuses in which buyer and seller may see each other's contact details and chat. */
export const CONNECTED_STATUSES = ['APPROVED', 'COMPLETED'] as const satisfies RequestStatus[];

export function canTransition(from: RequestStatus, action: RequestAction): boolean {
  return TRANSITIONS[from][action] !== undefined;
}

export function nextStatus(from: RequestStatus, action: RequestAction): RequestStatus {
  const to = TRANSITIONS[from][action];
  if (!to) throw new ConflictError(`Cannot ${action} a request that is ${from.toLowerCase()}`);
  return to;
}

export function isTerminal(status: RequestStatus): boolean {
  return Object.keys(TRANSITIONS[status]).length === 0;
}

export function isConnected(status: RequestStatus): boolean {
  return (CONNECTED_STATUSES as readonly RequestStatus[]).includes(status);
}
