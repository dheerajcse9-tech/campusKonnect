import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma.js';

const tables = [
  'AuditLog',
  'Report',
  'CommentVote',
  'PostVote',
  'Comment',
  'Post',
  'Notification',
  'Message',
  'Conversation',
  'TransactionRequest',
  'ListingImage',
  'Listing',
  'PasswordResetToken',
  'EmailVerificationToken',
  'RefreshToken',
  'User',
];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
