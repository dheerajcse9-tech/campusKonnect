import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { isTest } from '../config/env.js';

// Lower cost in tests keeps the suite fast; production uses a strong work factor.
const BCRYPT_COST = isTest ? 4 : 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** A URL-safe, cryptographically random opaque token. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Tokens are stored hashed so a database leak doesn't expose usable tokens. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
