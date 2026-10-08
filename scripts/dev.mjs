// Starts the database, the API and the web app together.
//   npm run dev        (Ctrl+C stops everything)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { ROOT, startDatabase } from './local-db.mjs';

const isWindows = process.platform === 'win32';

if (!existsSync(path.join(ROOT, 'server', '.env'))) {
  console.error('\n✖ Not set up yet. Run \x1b[1mnpm run setup\x1b[0m first.\n');
  process.exit(1);
}

const stopDatabase = await startDatabase();
const children = [];

function start(name, color, args) {
  const child = spawn('npm', args, {
    cwd: ROOT,
    shell: isWindows,
    // On macOS/Linux give each its own process group so we can stop npm *and* what it started.
    detached: !isWindows,
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  for (const stream of [child.stdout, child.stderr]) {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) if (line.trim()) process.stdout.write(prefix + line + '\n');
    });
  }
  child.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`${prefix}stopped unexpectedly (exit code ${code}). Stopping everything.`);
      void shutdown(1);
    }
  });
  children.push(child);
}

let shuttingDown = false;
async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\nStopping CampusKonnect…');
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // npm spawns grandchildren; on Windows kill the whole tree.
    if (isWindows)
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // Already gone.
      }
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await stopDatabase();
  process.exit(code);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

start('api', '36', ['run', 'dev', '-w', 'server']);
start('web', '35', ['run', 'dev', '-w', 'client']);

// Open the browser once both the web app and the API (through its proxy) answer.
const url = 'http://localhost:5173';
const waitForWeb = setInterval(() => {
  http
    .get(`${url}/api/health`, (res) => {
      res.resume();
      if (res.statusCode !== 200) return;
      clearInterval(waitForWeb);
      console.log(
        `\n\x1b[32m✔ CampusKonnect is running at \x1b[1m${url}\x1b[0m  (Ctrl+C to stop)\n`,
      );
      if (process.env.NO_OPEN) return;
      const opener = isWindows
        ? ['cmd', ['/c', 'start', '', url]]
        : process.platform === 'darwin'
          ? ['open', [url]]
          : ['xdg-open', [url]];
      spawn(opener[0], opener[1], { stdio: 'ignore', detached: true })
        .on('error', () => {})
        .unref();
    })
    .on('error', () => {});
}, 1000);
