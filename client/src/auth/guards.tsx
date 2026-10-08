import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useAuth } from './AuthContext';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user === undefined) return <FullPageSpinner />;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

/** Pages like login/register that a signed-in user shouldn't see. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user === undefined) return <FullPageSpinner />;
  if (user) return <Navigate to="/" replace />;
  return children;
}
