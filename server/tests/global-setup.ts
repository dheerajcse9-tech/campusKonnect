import { execSync } from 'node:child_process';
import path from 'node:path';
import dotenv from 'dotenv';

/** Applies all migrations to the test database once before the suite runs. */
export default function setup(): void {
  const { parsed } = dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), quiet: true });
  execSync('npx prisma migrate deploy', {
    stdio: 'ignore',
    env: { ...process.env, ...parsed },
  });
}
