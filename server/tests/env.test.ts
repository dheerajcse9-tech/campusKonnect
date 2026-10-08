import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/** Boots the env module in a child process with the given variables and returns stderr. */
function loadEnvWith(vars: Record<string, string>): string {
  try {
    execFileSync(
      process.execPath,
      ['--import', 'tsx', '-e', "await import('./src/config/env.ts')"],
      { env: { PATH: process.env.PATH ?? '', ...vars }, stdio: 'pipe' },
    );
    return '';
  } catch (err) {
    return String((err as { stderr?: Buffer }).stderr ?? err);
  }
}

const base = {
  DATABASE_URL: 'postgresql://x:y@localhost:5432/db',
  ALLOWED_EMAIL_DOMAINS: 'college.edu',
};

describe('environment validation', () => {
  it('fails fast in production without real email, storage and secrets', () => {
    const stderr = loadEnvWith({
      ...base,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'change-me-to-a-long-random-string-of-at-least-32-chars',
      APP_URL: 'http://insecure.example.com',
    });
    expect(stderr).toContain('Invalid environment configuration');
    for (const key of ['JWT_ACCESS_SECRET', 'RESEND_API_KEY', 'CLOUDINARY_*', 'APP_URL']) {
      expect(stderr).toContain(key);
    }
  });

  it('boots in production when everything is configured', () => {
    const stderr = loadEnvWith({
      ...base,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'a'.repeat(64),
      RESEND_API_KEY: 're_test',
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
      APP_URL: 'https://campuskonnect.app',
      API_URL: 'https://api.campuskonnect.app',
      CLIENT_ORIGIN: 'https://campuskonnect.app',
    });
    expect(stderr).toBe('');
  });
});
