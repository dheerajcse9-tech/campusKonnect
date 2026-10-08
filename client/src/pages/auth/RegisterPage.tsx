import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { authApi } from '../../api/endpoints';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { FormError } from '../../components/ui/States';
import { fieldErrors } from '../../lib/errors';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', year: '' });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const errors = fieldErrors(error);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        department: form.department || undefined,
        year: form.year ? Number(form.year) : undefined,
      });
      navigate('/check-email', {
        state: { email: form.email.trim().toLowerCase(), registered: true },
      });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Join your campus" subtitle="Only students with a college email can join.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError error={Object.keys(errors).length ? null : error} />
        <Input
          label="Full name"
          autoComplete="name"
          required
          value={form.name}
          onChange={set('name')}
          error={errors.name}
        />
        <Input
          label="College email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          hint="We'll send a verification link to this address."
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Department"
            placeholder="e.g. CSE"
            value={form.department}
            onChange={set('department')}
            error={errors.department}
          />
          <Select label="Year" value={form.year} onChange={set('year')} error={errors.year}>
            <option value="">Select</option>
            {[1, 2, 3, 4, 5, 6].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-start gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-line-strong accent-brand-600"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>
            I agree to follow the{' '}
            <Link
              to="/guidelines"
              target="_blank"
              className="font-medium text-brand-600 dark:text-brand-400 underline"
            >
              community guidelines
            </Link>
            .
          </span>
        </label>
        <Button type="submit" className="w-full" loading={submitting} disabled={!agreed}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
