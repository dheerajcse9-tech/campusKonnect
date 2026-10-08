import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === undefined) return <FullPageSpinner />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

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
