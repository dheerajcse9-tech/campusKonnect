// A PostgreSQL 16 server that runs from node_modules, so beginners don't have to
// install PostgreSQL or Docker. Data lives in ./.local-db (git-ignored).
import net from 'node:net';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DB = { host: 'localhost', port: 5432, user: 'campus', password: 'campus' };
export const DATABASES = ['campuskonnect', 'campuskonnect_test'];
const DATA_DIR = path.join(ROOT, '.local-db', 'data');

/** True if something (Docker, a native install, or a previous run) already listens on the port. */
export function portInUse(port = DB.port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

export function isInitialised() {
  return existsSync(path.join(DATA_DIR, 'PG_VERSION'));
}

function createServer() {
  return new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    port: DB.port,
    user: DB.user,
    password: DB.password,
    persistent: true,
    authMethod: 'scram-sha-256',
    // PostgreSQL refuses to run as root; only relevant inside containers.
    createPostgresUser: typeof process.getuid === 'function' && process.getuid() === 0,
    onLog: () => {},
    onError: (message) => {
      const text = String(message instanceof Error ? message.message : message).trim();
      if (text && !/^\d{4}-\d{2}-\d{2} .* (LOG|DETAIL|HINT):/.test(text))
        console.error(`[db] ${text}`);
    },
  });
}

/**
 * Starts the bundled PostgreSQL unless a PostgreSQL server is already running on
 * the port (then that one is used). Returns a function that stops what we started.
 */
export async function startDatabase({ log = console.log } = {}) {
  if (await portInUse()) {
    log(`• A PostgreSQL server is already running on port ${DB.port}; using it.`);
    return async () => {};
  }
  const server = createServer();
  if (!isInitialised()) {
    log('• Creating the local database for the first time (about 10 seconds)…');
    await server.initialise();
  }
  await server.start();
  log(`• Local database running on port ${DB.port}.`);
  return () => server.stop();
}

/** Creates the app and test databases if they don't exist yet. */
export async function ensureDatabases() {
  const client = new pg.Client({ ...DB, database: 'postgres' });
  await client.connect();
  try {
    for (const name of DATABASES) {
      const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
        name,
      ]);
      if (!rowCount) await client.query(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await client.end();
  }
}

export function databaseUrl(name) {
  return `postgresql://${DB.user}:${DB.password}@${DB.host}:${DB.port}/${name}?schema=public`;
}

// `node scripts/local-db.mjs` runs just the database until Ctrl+C.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stop = await startDatabase();
  await ensureDatabases();
  console.log('Press Ctrl+C to stop the database.');
  const shutdown = async () => {
    await stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
