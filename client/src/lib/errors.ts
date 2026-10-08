import { ApiError } from '../api/client';

export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof ApiError) return error.message;
  return fallback;
}

export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError ? error.fieldErrors() : {};
}
