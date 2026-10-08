import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { onSessionChange, refreshSession, setAccessToken } from '../api/client';
import { authApi } from '../api/endpoints';
import type { Me } from '../api/types';
import { AuthContext, type AuthState } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    onSessionChange((next) => {
      setUser(next);
      if (!next) queryClient.clear();
    });
    // Restore the session from the refresh cookie on page load.
    void refreshSession().then((session) => setUser(session?.user ?? null));
    return () => onSessionChange(null);
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login(email, password);
    setAccessToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({ user, login, logout, setUser, clearSession }),
    [user, login, logout, clearSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
