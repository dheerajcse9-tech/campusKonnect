import type { Me } from './types';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** An error response from the API, in its uniform `{ error: { code, message } }` shape. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level validation messages keyed by field path. */
  fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const detail of this.details ?? []) errors[detail.path] ??= detail.message;
    return errors;
  }
}

export interface Session {
  accessToken: string;
  user: Me;
}

// The access token lives only in memory (ADR-0003); the refresh token is an httpOnly cookie.
let accessToken: string | null = null;
let sessionListener: ((user: Me | null) => void) | null = null;
let refreshInFlight: Promise<Session | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Lets the auth provider learn when a refresh produced a new user or the session ended. */
export function onSessionChange(listener: ((user: Me | null) => void) | null): void {
  sessionListener = listener;
}

type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /** Set false for endpoints that must not trigger a token refresh (login, refresh itself). */
  retryOnUnauthorized?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_BASE}/api${path}${qs ? `?${qs}` : ''}`;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const data = (await res.json()) as { error?: { code: string; message: string; details?: [] } };
    if (data.error)
      return new ApiError(res.status, data.error.code, data.error.message, data.error.details);
  } catch {
    // Non-JSON error body (e.g. a proxy error page).
  }
  return new ApiError(
    res.status,
    'NETWORK_ERROR',
    res.status >= 500
      ? 'The server is having trouble. Please try again shortly.'
      : 'Request failed',
  );
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const isForm = options.body instanceof FormData;
  const headers: Record<string, string> = {
    // Required by the API's CSRF check on cookie-authenticated routes.
    'X-Requested-With': 'fetch',
  };
  if (!isForm && options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers,
      body: isForm
        ? (options.body as FormData)
        : options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
      credentials: 'include',
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      "Can't reach CampusKonnect. Check your connection and try again.",
    );
  }
}

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers share
 * one request, because the refresh token rotates and may only be used once.
 */
export function refreshSession(): Promise<Session | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await send('/auth/refresh', { method: 'POST' });
      if (!res.ok) {
        setAccessToken(null);
        sessionListener?.(null);
        return null;
      }
      const session = (await res.json()) as Session;
      setAccessToken(session.accessToken);
      sessionListener?.(session.user);
      return session;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await send(path, options);

  if (res.status === 401 && options.retryOnUnauthorized !== false && accessToken) {
    const session = await refreshSession();
    if (session) res = await send(path, options);
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
