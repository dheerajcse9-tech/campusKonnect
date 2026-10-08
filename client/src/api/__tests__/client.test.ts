import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, onSessionChange, refreshSession, setAccessToken } from '../client';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const user = { id: 'u1', name: 'Asha', email: 'asha@college.edu' };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken(null);
  onSessionChange(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('sends the access token, CSRF header and credentials', async () => {
    setAccessToken('token-1');
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    await api('/listings', { query: { q: 'book', category: undefined, page: 2 } });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/listings?q=book&page=2');
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer token-1',
      'X-Requested-With': 'fetch',
    });
  });

  it('turns error responses into ApiError with field errors', async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: [{ path: 'title', message: 'Too short' }],
        },
      }),
    );
    const err = await api('/listings', { body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).fieldErrors()).toEqual({ title: 'Too short' });
  });

  it('refreshes an expired access token once and retries the request', async () => {
    setAccessToken('expired');
    const listener = vi.fn();
    onSessionChange(listener);
    fetchMock
      .mockResolvedValueOnce(
        json(401, { error: { code: 'UNAUTHORIZED', message: 'Session expired' } }),
      )
      .mockResolvedValueOnce(json(200, { accessToken: 'fresh', user }))
      .mockResolvedValueOnce(json(200, { items: [] }));

    await expect(api('/listings')).resolves.toEqual({ items: [] });
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/auth/refresh');
    const retry = fetchMock.mock.calls[2]![1] as RequestInit;
    expect(retry.headers).toMatchObject({ Authorization: 'Bearer fresh' });
    expect(listener).toHaveBeenCalledWith(user);
  });

  it('shares a single refresh between concurrent requests (refresh tokens are single-use)', async () => {
    setAccessToken('expired');
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url === '/api/auth/refresh') return json(200, { accessToken: 'fresh', user });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer fresh'
        ? json(200, { ok: true })
        : json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } });
    });

    await Promise.all([api('/a'), api('/b'), api('/c')]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/auth/refresh');
    expect(refreshCalls).toHaveLength(1);
  });

  it('signals sign-out when the refresh fails', async () => {
    setAccessToken('expired');
    const listener = vi.fn();
    onSessionChange(listener);
    fetchMock
      .mockResolvedValueOnce(
        json(401, { error: { code: 'UNAUTHORIZED', message: 'Session expired' } }),
      )
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'No session' } }));

    await expect(api('/listings')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('reports network failures in plain language', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api('/listings')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('returns null from refreshSession when there is no session', async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, { error: { code: 'UNAUTHORIZED', message: 'No session' } }),
    );
    await expect(refreshSession()).resolves.toBeNull();
  });
});
