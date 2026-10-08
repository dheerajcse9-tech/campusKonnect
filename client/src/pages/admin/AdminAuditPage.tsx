import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { adminApi } from '../../api/endpoints';
import { Badge, type Tone } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { formatDate, formatTime } from '../../lib/format';

const ACTION_TONE: Record<string, Tone> = {
  USER_BANNED: 'red',
  USER_UNBANNED: 'green',
  LISTING_REMOVED: 'amber',
  POST_REMOVED: 'amber',
  COMMENT_REMOVED: 'amber',
  REPORT_RESOLVED: 'brand',
  REPORT_DISMISSED: 'neutral',
  ADMIN_GRANTED: 'blue',
  ADMIN_REVOKED: 'blue',
};

export function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['admin', 'audit', page],
    queryFn: () => adminApi.auditLogs({ page, limit: 30 }),
  });
  if (isPending) return <FullPageSpinner />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (data.items.length === 0)
    return (
      <EmptyState
        icon={ScrollText}
        title="No admin actions yet"
        description="Every moderation action will be recorded here."
      />
    );

  return (
    <>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {data.items.map((entry) => {
          const reason = entry.metadata?.reason ?? entry.metadata?.note;
          return (
            <li key={entry.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={ACTION_TONE[entry.action] ?? 'neutral'}>
                  {entry.action.replaceAll('_', ' ').toLowerCase()}
                </Badge>
                <span className="text-fg-2">
                  by {entry.actor ? entry.actor.name : 'system (CLI)'}
                </span>
                <span className="ml-auto text-xs text-fg-muted">
                  {formatDate(entry.createdAt)} {formatTime(entry.createdAt)}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-fg-muted">
                {entry.targetType} {entry.targetId}
              </p>
              {typeof reason === 'string' && reason && <p className="mt-1 text-fg-2">“{reason}”</p>}
            </li>
          );
        })}
      </ul>
      <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
    </>
  );
}
