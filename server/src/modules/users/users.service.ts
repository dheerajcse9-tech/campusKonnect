import { NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireImage } from '../../lib/storage/image.js';
import { storageService } from '../../lib/storage/storage.service.js';
import { listingCardSelect } from '../listings/listing.mapper.js';
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
