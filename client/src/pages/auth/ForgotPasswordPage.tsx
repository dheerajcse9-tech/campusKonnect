import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '../../api/endpoints';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { FormError } from '../../components/ui/States';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setMessage((await authApi.forgotPassword(email)).message);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link to choose a new password."
    >
      {message ? (
        <p
          role="status"
          className="rounded-lg bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {message} The link expires in 1 hour.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <FormError error={error} />
          <Input
            label="College email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" className="w-full" loading={submitting}>
            Send reset link
          </Button>
        </form>
      )}
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
