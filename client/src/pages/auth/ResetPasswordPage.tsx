import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../../api/endpoints';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { FormError } from '../../components/ui/States';
import { fieldErrors } from '../../lib/errors';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <p className="text-sm text-slate-600">
          This reset link is incomplete. Please request a new one.
        </p>
        <ButtonLink to="/forgot-password" className="mt-4 w-full">
          Request a new link
        </ButtonLink>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      {done ? (
        <>
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
            Your password was updated, and you were signed out on all devices.
          </p>
          <ButtonLink to="/login" className="mt-4 w-full">
            Sign in
          </ButtonLink>
        </>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <FormError error={fieldErrors(error).password ? null : error} />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors(error).password}
            hint="At least 8 characters, with a letter and a number."
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? "Passwords don't match" : undefined}
          />
          <Button type="submit" className="w-full" loading={submitting} disabled={mismatch}>
            Update password
          </Button>
          <p className="text-center text-sm">
            <Link to="/forgot-password" className="text-brand-600 hover:underline">
              Need a new link?
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
