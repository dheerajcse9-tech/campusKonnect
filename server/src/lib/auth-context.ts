import type { Role } from '@prisma/client';

/** The authenticated caller, as passed from controllers into services. */
export interface Actor {
  id: string;
  role: Role;
}

export const isAdmin = (actor: Actor): boolean => actor.role === 'ADMIN';
