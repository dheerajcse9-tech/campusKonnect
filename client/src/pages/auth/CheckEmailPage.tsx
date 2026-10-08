import { MailCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { authApi } from '../../api/endpoints';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { FormError } from '../../components/ui/States';

export function CheckEmailPage() {
  const state = useLocation().state as { email?: string; registered?: boolean } | null;
  const [email, setEmail] = useState(state?.email ?? '');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onResend(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setSent((await authApi.resendVerification(email)).message);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title={state?.registered ? 'Check your inbox' : 'Verify your email'}>
      <div className="flex flex-col items-center text-center">
        <MailCheck className="size-12 text-brand-600 dark:text-brand-400" aria-hidden="true" />
        <p className="mt-3 text-sm text-fg-muted">
          {state?.registered ? (
            <>
              We sent a verification link to <strong>{state.email}</strong>. Open it on any device
              to activate your account. The link expires in 24 hours.
            </>
          ) : (
            'Enter your college email and we will send you a new verification link.'
          )}
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          Can't find it? Check your spam or promotions folder.
        </p>
      </div>
      <form onSubmit={onResend} className="mt-6 space-y-3">
        <FormError error={error} />
        {sent && (
          <p
            role="status"
            className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
          >
            {sent}
          </p>
        )}
        <Input
          label="College email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="secondary" className="w-full" loading={submitting}>
          Resend verification link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link
          to="/login"
          className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
