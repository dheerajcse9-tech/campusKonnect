import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Flag, MessageSquare, Package, UserPlus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { adminApi } from '../../api/endpoints';
import { Card } from '../../components/ui/Card';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/States';

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  to,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub?: string;
  to?: string;
  highlight?: boolean;
}) {
  const body = (
    <Card
      className={`p-5 transition hover:-translate-y-0.5 ${highlight ? 'border-red-500/40 ring-1 ring-red-500/20' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-fg-muted">{label}</span>
        <span
          className={`flex size-9 items-center justify-center rounded-xl text-white shadow-md ${highlight ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-brand-gradient'}`}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-display text-4xl font-extrabold tabular-nums">
        {value.toLocaleString('en-IN')}
      </p>
      {sub && <p className="mt-1 text-xs text-fg-muted">{sub}</p>}
    </Card>
  );
  return to ? (
    <Link to={to} className="block hover:opacity-90">
      {body}
    </Link>
  ) : (
    body
  );
}

export function AdminOverviewPage() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
    refetchInterval: 60_000,
  });
  if (isPending) return <FullPageSpinner />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <Stat
        icon={Flag}
        label="Open reports"
        value={data.reports.open}
        to="/admin/reports"
        highlight={data.reports.open > 0}
        sub="Oldest first in the queue"
      />
      <Stat
        icon={Users}
        label="Students"
        value={data.users.total}
        sub={`${data.users.banned} suspended`}
        to="/admin/users"
      />
      <Stat icon={UserPlus} label="New this week" value={data.users.newThisWeek} />
      <Stat
        icon={Package}
        label="Active listings"
        value={data.listings.active}
        sub={`${data.listings.sold} sold so far`}
      />
      <Stat
        icon={ClipboardList}
        label="Pending requests"
        value={data.requests.pending}
        sub={`${data.requests.completed} deals completed`}
      />
      <Stat
        icon={MessageSquare}
        label="Community posts"
        value={data.community.posts}
        sub={`${data.community.comments} answers & comments`}
      />
    </div>
  );
}
