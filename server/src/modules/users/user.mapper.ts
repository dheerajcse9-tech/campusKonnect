import type { User } from '@prisma/client';

/** Fields safe to show any signed-in user. Contact details are deliberately excluded. */
export const publicUserSelect = {
  id: true,
  name: true,
  department: true,
  year: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
} as const;

export type PublicUser = Pick<User, keyof typeof publicUserSelect>;

/** The signed-in user's own view of their account. */
export function toPrivateUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    department: user.department,
    year: user.year,
    phone: user.phone,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt,
  };
}

export type PrivateUser = ReturnType<typeof toPrivateUser>;
