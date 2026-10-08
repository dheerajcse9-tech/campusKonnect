import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { FormError } from '../../components/ui/States';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const notVerified = error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED';

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in with your college email.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {notVerified ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            Please verify your email first.{' '}
            <Link to="/check-email" state={{ email }} className="font-medium underline">
              Resend the verification link
            </Link>
          </div>
        ) : (
          <FormError error={error} />
        )}
        <Input
          label="College email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
