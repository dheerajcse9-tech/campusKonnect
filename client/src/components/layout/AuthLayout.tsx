import { BadgeCheck, Lock, MessagesSquare, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const pillars = [
  {
    icon: BadgeCheck,
    title: 'Verified students only',
    text: 'Every account is confirmed with a college email.',
  },
  {
    icon: Lock,
    title: 'Private until you approve',
    text: 'Phone and email are shared only after a deal is approved.',
  },
  {
    icon: MessagesSquare,
    title: 'Ask a Senior',
    text: 'Answers that stay searchable for every junior after you.',
  },
];

/** Split-screen layout: brand story on the left (desktop), form on the right. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-gradient p-10 text-white lg:flex lg:flex-col">
        <div className="grid-pattern absolute inset-0 opacity-60" aria-hidden="true" />
        <div
          className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-20 size-96 rounded-full bg-accent-400/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative my-auto max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShieldCheck className="size-4" /> Private · Verified · Trusted
          </p>
          <h2 className="mt-5 font-display text-4xl font-extrabold leading-tight">
            Your campus. Your people. One trusted place.
          </h2>
          <p className="mt-3 text-white/80">
            Buy, sell and rent with classmates, and get real answers from seniors who have been
            there.
          </p>
          <ul className="mt-10 space-y-5">
            {pillars.map(({ icon: Icon, title: t, text }, i) => (
              <li
                key={t}
                className="animate-rise flex gap-4"
                style={{ animationDelay: `${150 + i * 120}ms` }}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="block text-sm text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">
          Built for students. Powered by students. Designed for the campus.
        </p>
      </aside>

      <main className="app-backdrop relative flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          <ThemeToggle />
        </div>
        <div className="mx-auto my-auto w-full max-w-md py-10">
          <div className="animate-rise">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-fg">{title}</h1>
            {subtitle && <p className="mt-2 text-fg-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
