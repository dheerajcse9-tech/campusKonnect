import clsx from 'clsx';
import {
  Bell,
  ClipboardList,
  Home,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useCurrentUser, useAuth } from '../../auth/AuthContext';
import { Avatar } from '../ui/Avatar';
import { ButtonLink } from '../ui/Button';
import { FullPageSpinner } from '../ui/Spinner';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useUnreadCounts } from './useUnreadCounts';

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-gradient-to-br from-accent-500 to-rose-600 px-1 text-center text-[10px] font-bold leading-4 text-white shadow ring-2 ring-surface">
      {count > 99 ? '99+' : count}
    </span>
  );
}

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'relative rounded-full px-3.5 py-2 text-sm font-semibold transition',
    isActive
      ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
      : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
  );

function UserMenu() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const item =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-2 hover:bg-surface-2';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-full"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar name={user.name} url={user.avatarUrl} size="sm" />
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="animate-rise absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-2xl"
        >
          <div className="mb-1 border-b border-line px-3 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-fg-muted">{user.email}</p>
          </div>
          <Link to="/profile" className={item} role="menuitem">
            <User className="size-4" /> My profile
          </Link>
          <Link to="/my-listings" className={item} role="menuitem">
            <Package className="size-4" /> My listings
          </Link>
          {user.role === 'ADMIN' && (
            <Link to="/admin" className={item} role="menuitem">
              <Shield className="size-4" /> Admin dashboard
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className={clsx(item, 'text-red-600 dark:text-red-400')}
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const counts = useUnreadCounts();
  const location = useLocation();

  const mobileLink = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
      isActive ? 'text-brand-600 dark:text-brand-400' : 'text-fg-muted',
    );

  return (
    <div className="app-backdrop flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLink to="/" end className={desktopLink}>
              Marketplace
            </NavLink>
            <NavLink to="/community" className={desktopLink}>
              Community
            </NavLink>
            <NavLink to="/requests" className={desktopLink}>
              Requests
            </NavLink>
            <NavLink to="/messages" className={desktopLink}>
              Messages
              <CountBadge count={counts.messages} />
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div className="hidden md:block">
              <ButtonLink to="/listings/new" size="sm">
                <Plus className="size-4" /> Sell or rent
              </ButtonLink>
            </div>
            <ThemeToggle />
            <Link
              to="/notifications"
              className="relative rounded-full p-2 text-fg-muted transition hover:bg-surface-3 hover:text-fg"
              aria-label={`Notifications (${counts.notifications} unread)`}
            >
              <Bell className="size-5" />
              <CountBadge count={counts.notifications} />
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-10">
        <div key={location.pathname} className="animate-page-in">
          <Suspense fallback={<FullPageSpinner />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <footer className="hidden border-t border-line/70 py-8 text-center text-xs text-fg-muted md:block">
        CampusKonnect · Built for students, by students ·{' '}
        <Link to="/guidelines" className="underline hover:text-fg-2">
          Community guidelines
        </Link>
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line/70 bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Main"
      >
        <NavLink to="/" end className={mobileLink}>
          <Home className="size-5" /> Home
        </NavLink>
        <NavLink to="/community" className={mobileLink}>
          <Users className="size-5" /> Community
        </NavLink>
        <NavLink to="/listings/new" className={mobileLink} aria-label="Sell or rent an item">
          <span className="-mt-6 flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-xl shadow-brand-600/40 ring-4 ring-canvas transition active:scale-95">
            <Plus className="size-6" />
          </span>
        </NavLink>
        <NavLink to="/requests" className={mobileLink}>
          <ClipboardList className="size-5" /> Requests
        </NavLink>
        <NavLink to="/messages" className={mobileLink}>
          <span className="relative">
            <MessageCircle className="size-5" />
            <CountBadge count={counts.messages} />
          </span>
          Messages
        </NavLink>
      </nav>
    </div>
  );
}
