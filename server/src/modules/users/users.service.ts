import { generateToken, hashPassword, verifyPassword } from '../../lib/crypto.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireImage } from '../../lib/storage/image.js';
import { storageService } from '../../lib/storage/storage.service.js';
import { listingCardSelect } from '../listings/listing.mapper.js';
import { cancelOpenDealsForUser, closeOpenRequests } from '../transactions/transactions.service.js';
import { publicUserSelect, toPrivateUser } from './user.mapper.js';
import type { UpdateProfileInput } from './users.schemas.js';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');
  return toPrivateUser(user);
}

export async function updateMe(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({ where: { id: userId }, data: input });
  return toPrivateUser(user);
}

export async function updateAvatar(userId: string, buffer: Buffer) {
  const extension = requireImage(buffer);
  const previous = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { avatarKey: true },
  });

  const stored = await storageService.upload({ buffer, extension }, 'avatars');
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: stored.url, avatarKey: stored.key },
  });
  if (previous.avatarKey) await storageService.remove(previous.avatarKey);
  return toPrivateUser(user);
}

/** A user's public profile. Contact details are never included (NFR-4). */
export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, status: 'ACTIVE' },
    select: {
      ...publicUserSelect,
      _count: { select: { posts: { where: { status: 'ACTIVE' } } } },
    },
  });
  if (!user) throw new NotFoundError('User');

  const listings = await prisma.listing.findMany({
    where: { sellerId: userId, status: 'ACTIVE' },
    select: listingCardSelect,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const { _count, ...profile } = user;
  return { ...profile, postCount: _count.posts, listings };
}

/**
 * Closes the caller's account and erases their personal data (right to erasure).
 * The row is kept, anonymised, so other students' request and chat history stay
 * consistent; their listings, posts and comments disappear from the platform.
 */
export async function deleteAccount(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new BadRequestError('Password is incorrect');
  }
  if (user.role === 'ADMIN') {
    throw new ForbiddenError(
      'Administrators must have their admin role revoked before deleting the account',
    );
  }

  const images = await prisma.listingImage.findMany({
    where: { listing: { sellerId: userId } },
    select: { storageKey: true },
  });
  const unusablePasswordHash = await hashPassword(generateToken());

  await prisma.$transaction(async (tx) => {
    await cancelOpenDealsForUser(tx, userId, 'the other student closed their account');
    const listings = await tx.listing.findMany({
      where: { sellerId: userId, status: { not: 'REMOVED' } },
      select: { id: true },
    });
    for (const listing of listings) {
      await closeOpenRequests(tx, listing.id, 'CANCELLED', 'was removed because the seller left');
    }
    await tx.listing.updateMany({ where: { sellerId: userId }, data: { status: 'REMOVED' } });
    await tx.listingImage.deleteMany({ where: { listing: { sellerId: userId } } });

    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.emailVerificationToken.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });

    await tx.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        name: 'Deleted user',
        // Frees the real address so the student can register again later.
        email: `deleted-${userId}@deleted.invalid`,
        passwordHash: unusablePasswordHash,
        department: null,
        year: null,
        phone: null,
        bio: null,
        avatarUrl: null,
        avatarKey: null,
        emailVerifiedAt: null,
      },
    });
  });

  // Files are removed after the commit so a rollback never leaves broken image links.
  const keys = [...images.map((i) => i.storageKey), ...(user.avatarKey ? [user.avatarKey] : [])];
  await Promise.all(keys.map((key) => storageService.remove(key)));
}
