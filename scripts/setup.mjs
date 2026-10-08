// One-time local setup: database, settings file, tables and demo data.
//   npm run setup
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DB, ROOT, databaseUrl, ensureDatabases, startDatabase } from './local-db.mjs';

const step = (n, text) => console.log(`\n\x1b[1m[${n}/5] ${text}\x1b[0m`);
const fail = (message) => {
  console.error(`\n\x1b[31m✖ ${message}\x1b[0m\n`);
  process.exit(1);
};

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: path.join(ROOT, 'server'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  return result.status === 0;
}

const [major] = process.versions.node.split('.').map(Number);
if (major < 20)
  fail(
    `Node.js 20 or newer is required (you have ${process.versions.node}). Install the LTS from https://nodejs.org`,
  );

step(1, 'Checking settings');
const envFile = path.join(ROOT, 'server', '.env');
if (!existsSync(envFile)) {
  copyFileSync(path.join(ROOT, 'server', '.env.example'), envFile);
  console.log('• Created server/.env from server/.env.example');
} else {
  console.log('• server/.env already exists (kept as is)');
}

step(2, 'Starting the database');
let stop = async () => {};
try {
  stop = await startDatabase();
  await ensureDatabases();
  console.log('• Databases "campuskonnect" and "campuskonnect_test" are ready.');
} catch (err) {
  fail(
    `Could not prepare the database: ${err instanceof Error ? err.message : err}\n` +
      `  If you already run your own PostgreSQL on port ${DB.port}, make sure it has a user "campus" with password "campus",\n` +
      '  or stop it so the bundled database can start. See docs/GETTING-STARTED.md → Troubleshooting.',
  );
}

try {
  step(3, 'Creating tables');
  const env = { DATABASE_URL: databaseUrl('campuskonnect') };
  if (!run('npx', ['prisma', 'migrate', 'deploy'], env))
    fail('Creating the tables failed (see the error above).');
  run('npx', ['prisma', 'generate'], env);

  step(4, 'Adding demo data');
  if (!run('npx', ['tsx', 'prisma/seed.ts'], env))
    fail('Adding demo data failed (see the error above).');

  step(5, 'Done');
} finally {
  await stop();
}

console.log(`
\x1b[32m✔ CampusKonnect is set up!\x1b[0m

  Start everything with:   \x1b[1mnpm run dev\x1b[0m
  Then open:               \x1b[1mhttp://localhost:5173\x1b[0m
  Demo password:           \x1b[1mPassword123\x1b[0m  (e.g. neha@college.edu, admin@college.edu)

  Run the automated tests: npm test
  Browse the data:         npm run db:studio -w server
`);
