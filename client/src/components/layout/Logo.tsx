import { Link } from 'react-router';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
      <img src="/favicon.svg" alt="" className="size-8" />
      <span>
        Campus<span className="text-brand-600">Konnect</span>
      </span>
    </Link>
  );
}
