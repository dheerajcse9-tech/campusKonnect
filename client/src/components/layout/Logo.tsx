import clsx from 'clsx';
import { Link } from 'react-router';

export function LogoMark({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span
      className={clsx(
        'relative inline-flex items-center justify-center rounded-xl text-white',
        light
          ? 'bg-white/20 ring-1 ring-white/40 backdrop-blur'
          : 'bg-brand-gradient shadow-lg shadow-brand-600/30',
        className ?? 'size-9',
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="size-[60%]" fill="none">
        <path
          d="M21 9.5a9 9 0 1 0 0 13"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="23.5" cy="16" r="3" fill="currentColor" opacity="0.85" />
      </svg>
    </span>
  );
}

export function Logo({ light = false, to = '/' }: { light?: boolean; to?: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight"
    >
      <LogoMark light={light} />
      <span className={light ? 'text-white' : 'text-fg'}>
        Campus<span className={light ? 'text-white/80' : 'text-gradient'}>Konnect</span>
      </span>
    </Link>
  );
}
