import clsx from 'clsx';
import { Flag, LayoutDashboard, ScrollText, Shield, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

const tabs = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
];

export function AdminLayout() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Shield className="size-6 text-brand-600" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      </div>
      <nav
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 px-4"
        aria-label="Admin sections"
      >
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium',
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900',
              )
            }
          >
            <Icon className="size-4" aria-hidden="true" /> {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
