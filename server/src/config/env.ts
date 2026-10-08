import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile), quiet: true });

const csv = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

const emptyToUndefined = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).default(4000),
  CLIENT_ORIGIN: csv.default(['http://localhost:5173']),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  ALLOWED_EMAIL_DOMAINS: csv.pipe(z.array(z.string()).min(1)),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  RESEND_API_KEY: emptyToUndefined,
  EMAIL_FROM: z.string().default('CampusKonnect <no-reply@campuskonnect.app>'),
  CLOUDINARY_CLOUD_NAME: emptyToUndefined,
  CLOUDINARY_API_KEY: emptyToUndefined,
  CLOUDINARY_API_SECRET: emptyToUndefined,
  /** Number of reverse proxies in front of the API (Render/Railway: 1). Used for client IPs in rate limiting. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
});

const PLACEHOLDER_SECRET = 'change-me-to-a-long-random-string-of-at-least-32-chars';

/**
 * Extra rules for production. Real users must get real emails, uploaded photos
 * must survive redeploys (hosts like Render wipe the local disk), and secrets
 * must not be the example values.
 */
const productionSchema = envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;
  const check = (ok: unknown, path: string, message: string) => {
    if (!ok) ctx.addIssue({ code: 'custom', path: [path], message });
  };

  // 43 base64 characters = 256 bits (e.g. Render's generated secrets, `openssl rand -base64 32`).
  const strongSecret =
    env.JWT_ACCESS_SECRET !== PLACEHOLDER_SECRET && env.JWT_ACCESS_SECRET.length >= 43;
  check(
    strongSecret,
    'JWT_ACCESS_SECRET',
    'must be a unique random secret of at least 256 bits (43+ characters)',
  );

  check(
    env.RESEND_API_KEY,
    'RESEND_API_KEY',
    'is required in production to send verification emails',
  );

  const cloudinary =
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET;
  check(
    cloudinary,
    'CLOUDINARY_*',
    'Cloudinary credentials are required in production (local disk is not persistent)',
  );

  check(env.APP_URL.startsWith('https://'), 'APP_URL', 'must use https in production');
  check(env.API_URL.startsWith('https://'), 'API_URL', 'must use https in production');
  const httpsOrigins = env.CLIENT_ORIGIN.every((origin) => origin.startsWith('https://'));
  check(httpsOrigins, 'CLIENT_ORIGIN', 'must only contain https origins in production');
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = productionSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // Fail fast: the app must not boot with an invalid configuration.
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
