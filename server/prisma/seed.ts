/**
 * Demo data for local development and pilot demos.
 *   npm run db:seed
 * Refuses to run in production so it can never touch real student data.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed a production database.');
  process.exit(1);
}

const prisma = new PrismaClient();
const domain = (process.env.ALLOWED_EMAIL_DOMAINS ?? 'college.edu').split(',')[0].trim();
const PASSWORD = 'Password123';

async function main(): Promise<void> {
  const existing = await prisma.user.count();
  if (existing > 0 && !process.argv.includes('--force')) {
    console.log(`Database already has ${existing} users. Re-run with --force to wipe and reseed.`);
    return;
  }
  if (existing > 0) {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "AuditLog","Report","CommentVote","PostVote","Comment","Post","Notification","Message","Conversation","TransactionRequest","ListingImage","Listing","PasswordResetToken","EmailVerificationToken","RefreshToken","User" CASCADE',
    );
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();
  const mk = (name: string, local: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({
      data: { name, email: `${local}@${domain}`, passwordHash, emailVerifiedAt: now, ...extra },
    });

  const admin = await mk('Campus Admin', 'admin', { role: 'ADMIN', department: 'Student Affairs' });
  const asha = await mk('Asha Rao', 'asha', {
    department: 'CSE',
    year: 4,
    phone: '9876500001',
    bio: 'Final year, clearing out my room before graduation.',
  });
  const vikram = await mk('Vikram Singh', 'vikram', {
    department: 'ECE',
    year: 2,
    phone: '9876500002',
  });
  const neha = await mk('Neha Iyer', 'neha', {
    department: 'CSE',
    year: 1,
    phone: '9876500003',
    bio: 'Fresher, looking for cheap books!',
  });
  const arjun = await mk('Arjun Mehta', 'arjun', {
    department: 'Mechanical',
    year: 3,
    phone: '9876500004',
  });

  const listings = [
    {
      sellerId: asha.id,
      title: 'Engineering Mathematics - B.S. Grewal (44th ed.)',
      description: 'Lightly used, a few pencil notes in chapters 3-5. Perfect for M1/M2.',
      type: 'SELL',
      category: 'BOOKS',
      condition: 'GOOD',
      price: 350,
      location: 'Girls Hostel 2',
    },
    {
      sellerId: asha.id,
      title: 'Study table with drawer',
      description: 'Sturdy wooden table, fits hostel rooms. Pick up only.',
      type: 'SELL',
      category: 'FURNITURE',
      condition: 'FAIR',
      price: 800,
      location: 'Girls Hostel 2',
    },
    {
      sellerId: vikram.id,
      title: 'Hero Sprint cycle',
      description: 'Single-speed, new tyres last semester, lock included.',
      type: 'SELL',
      category: 'CYCLES',
      condition: 'GOOD',
      price: 2500,
      location: 'Boys Hostel 4',
    },
    {
      sellerId: vikram.id,
      title: 'Casio fx-991EX calculator',
      description: 'Rent for exams. Must be returned in the same condition.',
      type: 'RENT',
      category: 'ELECTRONICS',
      condition: 'LIKE_NEW',
      price: 40,
      rentPeriod: 'WEEK',
      deposit: 500,
      location: 'ECE block',
    },
    {
      sellerId: arjun.id,
      title: 'Drafting kit + mini drafter',
      description: 'Complete ED kit for first years: mini drafter, compass set, scales.',
      type: 'SELL',
      category: 'STATIONERY',
      condition: 'GOOD',
      price: 450,
      location: 'Mech workshop',
    },
    {
      sellerId: arjun.id,
      title: 'Cricket bat (English willow)',
      description: 'Rent for weekend matches.',
      type: 'RENT',
      category: 'SPORTS',
      condition: 'GOOD',
      price: 50,
      rentPeriod: 'DAY',
      deposit: 300,
      location: 'Sports complex',
    },
  ] as const;
  const created = [];
  for (const listing of listings)
    created.push(await prisma.listing.create({ data: { ...listing } }));

  // An approved deal with a short chat, and a pending request.
  const deal = await prisma.transactionRequest.create({
    data: {
      listingId: created[0].id,
      requesterId: neha.id,
      sellerId: asha.id,
      type: 'SELL',
      status: 'APPROVED',
      message: 'Hi! Is this still available? I can pick it up today.',
      respondedAt: now,
    },
  });
  await prisma.listing.update({ where: { id: created[0].id }, data: { status: 'RESERVED' } });
  const conversation = await prisma.conversation.create({ data: { requestId: deal.id } });
  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: neha.id,
        body: 'Hi Asha, can we meet at the library at 5?',
      },
      {
        conversationId: conversation.id,
        senderId: asha.id,
        body: 'Sure, see you at the entrance!',
      },
    ],
  });
  await prisma.transactionRequest.create({
    data: {
      listingId: created[2].id,
      requesterId: arjun.id,
      sellerId: vikram.id,
      type: 'SELL',
      message: 'Would you take 2200?',
    },
  });

  const doubt = await prisma.post.create({
    data: {
      authorId: neha.id,
      type: 'DOUBT',
      title: 'Which programming elective should I pick in 2nd year?',
      body: 'Choosing between Python for Data Science and Advanced Java. Which one helps more for internships?',
      tags: ['electives', 'internships', 'cse'],
      commentCount: 2,
      upvoteCount: 1,
    },
  });
  const answer = await prisma.comment.create({
    data: {
      postId: doubt.id,
      authorId: asha.id,
      body: 'Python for Data Science. Most internship tests I took used Python, and the professor gives great projects.',
      upvoteCount: 1,
    },
  });
  await prisma.comment.create({
    data: {
      postId: doubt.id,
      authorId: arjun.id,
      body: 'Java if you want core backend roles, but Python is more flexible overall.',
    },
  });
  await prisma.commentVote.create({ data: { userId: vikram.id, commentId: answer.id } });
  await prisma.postVote.create({ data: { userId: vikram.id, postId: doubt.id } });
  await prisma.post.create({
    data: {
      authorId: vikram.id,
      type: 'DISCUSSION',
      title: 'Tech fest volunteers needed',
      body: 'The ECE dept is looking for 20 volunteers for the tech fest next month. Free T-shirts and certificates!',
      tags: ['events', 'techfest'],
    },
  });

  console.log(`Seeded demo data. Sign in with any of these (password: ${PASSWORD}):`);
  for (const u of [admin, asha, vikram, neha, arjun])
    console.log(`  ${u.email}${u.id === admin.id ? '  (admin)' : ''}`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
