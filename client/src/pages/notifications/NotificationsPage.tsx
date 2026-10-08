import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListSkeleton } from '../../components/ui/Skeleton';
import clsx from 'clsx';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { notificationsApi } from '../../api/endpoints';
import type { Notification } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { timeAgo } from '../../lib/format';

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationsApi.list({ page, limit: 20 }),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: invalidate });

  async function open(notification: Notification) {
    if (!notification.readAt) {
      await notificationsApi.markRead(notification.id).catch(() => undefined);
      invalidate();
    }
    if (notification.link) navigate(notification.link);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        action={
          data && data.unreadCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              loading={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      />
      {isPending ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="Request updates, messages and replies will show up here."
        />
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {data.items.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => void open(notification)}
                  className={clsx(
                    'flex w-full gap-3 p-4 text-left hover:bg-surface-2',
                    !notification.readAt && 'bg-brand-500/5',
                  )}
                >
                  <span
                    className={clsx(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      notification.readAt ? 'bg-transparent' : 'bg-brand-600',
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={clsx('block text-sm', !notification.readAt && 'font-semibold')}
                    >
                      {notification.title}
                    </span>
                    {notification.body && (
                      <span className="block truncate text-sm text-fg-muted">
                        {notification.body}
                      </span>
                    )}
                    <span className="block text-xs text-fg-faint">
                      {timeAgo(notification.createdAt)}
                    </span>
                  </span>
                  {!notification.readAt && <span className="sr-only">Unread</span>}
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
