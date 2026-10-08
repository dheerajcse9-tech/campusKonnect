/**
 * Grants or revokes the ADMIN role from the command line. This is the only way
 * to create the first administrator in a fresh deployment.
 *
 *   npm run admin:grant -- someone@college.edu
 *   npm run admin:revoke -- someone@college.edu
 *   (production build: node dist/scripts/set-role.js grant someone@college.edu)
 */
import { prisma } from '../lib/prisma.js';

async function main(): Promise<void> {
  const [mode, rawEmail] = process.argv.slice(2);
  if ((mode !== 'grant' && mode !== 'revoke') || !rawEmail) {
    console.error('Usage: set-role <grant|revoke> <email>');
    process.exit(1);
  }
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email ${email}. They must register and verify first.`);
    process.exit(1);
  }
  if (mode === 'grant' && !user.emailVerifiedAt) {
    console.error(`${email} has not verified their email yet.`);
    process.exit(1);
  }

  const role = mode === 'grant' ? 'ADMIN' : 'STUDENT';
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role } }),
    prisma.auditLog.create({
      data: {
        actorId: null,
        action: mode === 'grant' ? 'ADMIN_GRANTED' : 'ADMIN_REVOKED',
        targetType: 'USER',
        targetId: user.id,
        metadata: { via: 'cli' },
      },
    }),
  ]);
  console.log(`${email} is now ${role}.`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
