import { createContext, useContext } from 'react';
import type { Me } from '../api/types';

export interface AuthState {
  /** `undefined` while the stored session is being restored on page load. */
  user: Me | null | undefined;
  login: (email: string, password: string) => Promise<Me>;
  logout: () => Promise<void>;
  setUser: (user: Me) => void;
  /** Drops the local session without calling the API (e.g. after account deletion). */
  clearSession: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** The signed-in user. Only use inside routes wrapped by <RequireAuth>. */
export function useCurrentUser(): Me {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser requires a signed-in user');
  return user;
}
