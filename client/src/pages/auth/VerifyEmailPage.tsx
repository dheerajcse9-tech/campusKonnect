import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../../api/endpoints';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { ButtonLink } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { errorMessage } from '../../lib/errors';

type State = { status: 'verifying' } | { status: 'done' } | { status: 'failed'; message: string };

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>(
    token
      ? { status: 'verifying' }
      : { status: 'failed', message: 'This link is missing its token.' },
  );
  // Verification tokens are single-use: never submit the same one twice
  // (React StrictMode runs effects twice in development).
  const submitted = useRef(false);

  useEffect(() => {
    if (!token || submitted.current) return;
    submitted.current = true;
    authApi
      .verifyEmail(token)
      .then(() => setState({ status: 'done' }))
      .catch((err: unknown) => setState({ status: 'failed', message: errorMessage(err) }));
  }, [token]);

  return (
    <AuthLayout title="Email verification">
      <div className="flex flex-col items-center py-4 text-center">
        {state.status === 'verifying' && (
          <>
            <Spinner className="size-10 text-brand-600" />
            <p className="mt-3 text-sm text-slate-600">Verifying your email…</p>
          </>
        )}
        {state.status === 'done' && (
          <>
            <CheckCircle2 className="size-12 text-emerald-500" aria-hidden="true" />
            <p className="mt-3 font-medium">Your email is verified!</p>
            <p className="text-sm text-slate-600">Welcome to your campus community.</p>
            <ButtonLink to="/login" className="mt-6">
              Sign in
            </ButtonLink>
          </>
        )}
        {state.status === 'failed' && (
          <>
            <XCircle className="size-12 text-red-500" aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-600">{state.message}</p>
            <Link
              to="/check-email"
              className="mt-6 text-sm font-medium text-brand-600 hover:underline"
            >
              Send me a new link
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
