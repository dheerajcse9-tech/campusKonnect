import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  ClipboardCheck,
  Handshake,
  HeartHandshake,
  Leaf,
  type LucideIcon,
  MessageCircle,
  MessagesSquare,
  PiggyBank,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '../../components/ui/Button';
import { Logo, LogoMark } from '../../components/layout/Logo';
import { ThemeToggle } from '../../components/layout/ThemeToggle';

const features: {
  icon: LucideIcon;
  title: string;
  text: string;
  points: string[];
  tone: string;
}[] = [
  {
    icon: ShoppingBag,
    title: 'Marketplace',
    text: 'Buy, sell or rent anything a student needs.',
    points: ['Photos, prices & condition', 'Search, filters & categories', 'Rentals with deposits'],
    tone: 'from-brand-500 to-violet-600',
  },
  {
    icon: Handshake,
    title: 'Safe transactions',
    text: 'Every deal goes through a request and an approval.',
    points: ['Request to buy or rent', 'Seller approval', 'Deal status tracking'],
    tone: 'from-sky-500 to-indigo-600',
  },
  {
    icon: Users,
    title: 'Community',
    text: 'A living knowledge base for your campus.',
    points: ['Ask-a-Senior doubts', 'Upvoted best answers', 'Searchable forever'],
    tone: 'from-amber-500 to-orange-600',
  },
  {
    icon: ShieldCheck,
    title: 'Trust & safety',
    text: 'Built so you always know who you are dealing with.',
    points: ['Verified college identity', 'Reporting & moderation', 'Full audit trail'],
    tone: 'from-emerald-500 to-teal-600',
  },
];

const steps: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: BadgeCheck, title: 'Verify', text: 'Sign up with your college email' },
  { icon: Search, title: 'Discover', text: 'Browse, search and filter' },
  { icon: Send, title: 'Request', text: 'Ask to buy or rent, no contact shared' },
  { icon: ClipboardCheck, title: 'Approve', text: 'The seller accepts your request' },
  { icon: MessageCircle, title: 'Connect', text: 'Chat unlocks to plan the meetup' },
  { icon: Handshake, title: 'Complete', text: 'Meet on campus and close the deal' },
];

const comparison: [string, boolean, boolean][] = [
  ['Student verification', false, false],
  ['Searchable listings', false, true],
  ['Organised marketplace', false, true],
  ['Contact only after approval', false, false],
  ['Reporting & moderation', false, true],
  ['Built for campus life', false, false],
];

const impacts: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: PiggyBank,
    title: 'Save money',
    text: 'Second-hand from trusted peers instead of full price.',
  },
  { icon: Leaf, title: 'Less waste', text: 'Books, cycles and electronics get a second owner.' },
  {
    icon: BookOpen,
    title: 'Shared knowledge',
    text: 'Course advice and internship tips stay searchable.',
  },
  {
    icon: HeartHandshake,
    title: 'Stronger community',
    text: 'Seniors help juniors; classmates help each other.',
  },
];

function Tick({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="mx-auto size-5 text-emerald-500" aria-label="Yes" />
  ) : (
    <X className="mx-auto size-5 text-fg-faint" aria-label="No" />
  );
}

/** Animated product preview made of real UI pieces (no stock imagery). */
function HeroPreview() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-md" aria-hidden="true">
      <div className="absolute inset-6 rounded-[2.5rem] bg-brand-gradient opacity-30 blur-3xl" />

      <div className="animate-float absolute left-4 top-6 w-60 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="relative h-32 bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600">
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
            For sale
          </span>
          <svg viewBox="0 0 120 60" className="absolute inset-x-6 bottom-3 text-white/90">
            <circle cx="25" cy="42" r="15" fill="none" stroke="currentColor" strokeWidth="4" />
            <circle cx="95" cy="42" r="15" fill="none" stroke="currentColor" strokeWidth="4" />
            <path
              d="M25 42 L50 18 L80 18 L95 42 M50 18 L62 42 L80 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="p-3">
          <p className="font-display text-lg font-extrabold text-fg">₹2,500</p>
          <p className="text-sm text-fg-2">Hero Sprint cycle</p>
          <p className="mt-1 text-xs text-fg-muted">Good · Boys Hostel 4</p>
        </div>
      </div>

      <div
        className="animate-float absolute right-0 top-24 w-56 rounded-2xl border border-line bg-surface p-3 shadow-2xl"
        style={{ animationDelay: '1.2s' }}
      >
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold text-fg">Request approved</p>
            <p className="text-[11px] text-fg-muted">Chat & contact unlocked</p>
          </div>
        </div>
      </div>

      <div
        className="animate-float absolute bottom-16 left-0 w-64 space-y-2 rounded-2xl border border-line bg-surface p-3 shadow-2xl"
        style={{ animationDelay: '0.6s' }}
      >
        <div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-brand-gradient px-3 py-1.5 text-xs text-white">
          Library at 5pm? 📚
        </div>
        <div className="w-fit rounded-2xl rounded-bl-sm bg-surface-3 px-3 py-1.5 text-xs text-fg-2">
          Perfect, see you there!
        </div>
      </div>

      <div
        className="animate-float absolute bottom-2 right-6 flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 shadow-2xl"
        style={{ animationDelay: '2s' }}
      >
        <BadgeCheck className="size-5 text-brand-500" />
        <span className="text-xs font-bold text-fg">Verified student</span>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="app-backdrop min-h-screen text-fg">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-surface/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo />
          <nav
            className="ml-6 hidden gap-1 text-sm font-semibold text-fg-muted md:flex"
            aria-label="Sections"
          >
            <a href="#features" className="rounded-full px-3 py-2 hover:bg-surface-3 hover:text-fg">
              Features
            </a>
            <a href="#how" className="rounded-full px-3 py-2 hover:bg-surface-3 hover:text-fg">
              How it works
            </a>
            <a href="#compare" className="rounded-full px-3 py-2 hover:bg-surface-3 hover:text-fg">
              Why us
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/login"
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-fg-2 hover:bg-surface-3 sm:block"
            >
              Sign in
            </Link>
            <ButtonLink to="/register" size="sm">
              Join free
            </ButtonLink>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:pt-20 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">
              <Sparkles className="size-3.5" /> Private · Verified · Trusted
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Your campus,
              <br />
              <span className="text-gradient">finally connected.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-fg-muted">
              The marketplace and community where verified students buy, sell, rent, ask seniors and
              share knowledge. No strangers. No spam. No lost WhatsApp messages.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/register" size="lg">
                Get started with your college email <ArrowRight className="size-5" />
              </ButtonLink>
              <ButtonLink to="/login" size="lg" variant="secondary">
                Sign in
              </ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
              {['Free for students', 'College email only', 'Contact shared only on approval'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check className="size-4 text-emerald-500" /> {item}
                  </li>
                ),
              )}
            </ul>
          </div>
          <HeroPreview />
        </section>

        {/* Problem */}
        <section className="border-y border-line/70 bg-surface/50">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
            {[
              ['Listings vanish', 'in WhatsApp groups within a day'],
              ['Unknown strangers', 'on public marketplaces'],
              ['Usable things wasted', 'every single semester'],
            ].map(([title, text]) => (
              <div key={title} className="text-center sm:text-left">
                <p className="font-display text-xl font-extrabold">{title}</p>
                <p className="text-sm text-fg-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              One platform
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Marketplace + Community + Trust
            </h2>
            <p className="mt-3 text-fg-muted">
              Everything your campus exchanges, from cycles to career advice, in one place.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text, points, tone }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-600/10"
              >
                <div
                  className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}
                >
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{text}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-fg-2">
                  {points.map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-emerald-500" /> {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 bg-surface/50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                How it works
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Six steps. Zero awkward strangers.
              </h2>
            </div>
            <ol className="relative mt-14 grid gap-6 sm:grid-cols-3 lg:grid-cols-6">
              <div
                className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-to-r from-brand-500/0 via-brand-500/40 to-accent-500/0 lg:block"
                aria-hidden="true"
              />
              {steps.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="relative text-center">
                  <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-surface shadow-lg ring-1 ring-line">
                    <Icon className="size-6 text-brand-600 dark:text-brand-400" />
                    <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-1 text-sm text-fg-muted">{text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12 flex flex-wrap justify-center gap-2">
              {['Buy', 'Sell', 'Rent', 'Ask a Senior'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-fg-2"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section id="compare" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-20">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              Why CampusKonnect
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              The only one built for a college
            </h2>
          </div>
          <div className="mt-10 overflow-x-auto rounded-3xl border border-line bg-surface shadow-xl">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-fg-muted">
                  <th className="p-4 text-left font-semibold">Feature</th>
                  <th className="p-4 font-semibold">WhatsApp groups</th>
                  <th className="p-4 font-semibold">Public marketplaces</th>
                  <th className="bg-brand-500/10 p-4 font-bold text-brand-700 dark:text-brand-300">
                    <span className="inline-flex items-center gap-1.5">
                      <LogoMark className="size-5 rounded-md" /> CampusKonnect
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(([label, whatsapp, publicMarket]) => (
                  <tr key={label} className="border-b border-line last:border-0">
                    <td className="p-4 font-medium text-fg-2">{label}</td>
                    <td className="p-4">
                      <Tick ok={whatsapp} />
                    </td>
                    <td className="p-4">
                      <Tick ok={publicMarket} />
                    </td>
                    <td className="bg-brand-500/5 p-4">
                      <Tick ok />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Impact */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {impacts.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-3xl border border-line bg-surface/70 p-6">
                <Icon className="size-7 text-brand-600 dark:text-brand-400" />
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-gradient px-6 py-14 text-center text-white sm:px-12">
            <div className="grid-pattern absolute inset-0 opacity-50" aria-hidden="true" />
            <div
              className="absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative">
              <MessagesSquare className="mx-auto size-10 opacity-90" />
              <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
                From exchanging things to exchanging knowledge.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-white/80">
                Join your classmates on CampusKonnect. It takes a minute with your college email.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink
                  to="/register"
                  size="lg"
                  variant="glass"
                  className="bg-white! text-brand-700! hover:bg-white/90!"
                >
                  Create your account <ArrowRight className="size-5" />
                </ButtonLink>
                <ButtonLink to="/guidelines" size="lg" variant="glass">
                  Community guidelines
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-fg-muted">
          <Logo />
          <p>Built for students. Powered by students. Designed for the campus.</p>
        </div>
      </footer>
    </div>
  );
}
