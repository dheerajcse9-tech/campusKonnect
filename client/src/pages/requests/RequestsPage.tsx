import { useQuery } from '@tanstack/react-query';
import { ListSkeleton } from '../../components/ui/Skeleton';
import clsx from 'clsx';
import { ClipboardList } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { requestsApi } from '../../api/endpoints';
import type { RequestStatus } from '../../api/types';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { CategoryArt } from '../../features/marketplace/CategoryArt';
import { RequestStatusBadge } from '../../features/requests/RequestStatusBadge';
import { formatDate, formatListingPrice, timeAgo } from '../../lib/format';

type Tab = 'incoming' | 'outgoing';
const STATUS_FILTERS: { label: string; value?: RequestStatus }[] = [
  { label: 'All' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Completed', value: 'COMPLETED' },
];

export function RequestsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'incoming' ? 'incoming' : 'outgoing';
  const status = (params.get('status') as RequestStatus | null) ?? undefined;

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['requests', tab, status],
    queryFn: () => requestsApi.list(tab, status),
    refetchInterval: 60_000,
  });

  const setTab = (next: Tab) => setParams({ tab: next });
  const setStatus = (next?: RequestStatus) => setParams(next ? { tab, status: next } : { tab });

  return (
    <div>
      <PageHeader
        title="Requests"
        description="Track what you've asked for and what others want from you."
      />
      <div
        role="tablist"
        className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-3 p-1 sm:inline-grid"
      >
        {(['outgoing', 'incoming'] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-semibold',
              tab === value
                ? 'bg-surface text-brand-700 dark:text-brand-300 shadow-sm'
                : 'text-fg-muted',
            )}
          >
            {value === 'outgoing' ? 'My requests' : 'Requests for my items'}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setStatus(filter.value)}
            aria-pressed={status === filter.value}
            className={clsx(
              'rounded-full border px-3 py-1 text-sm',
              status === filter.value
                ? 'border-brand-600 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                : 'border-line-strong bg-surface text-fg-muted',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No requests here"
          description={
            tab === 'outgoing'
              ? 'Find something you need in the marketplace and send a request.'
              : 'When someone wants your items, their requests show up here.'
          }
          action={
            tab === 'outgoing' ? <ButtonLink to="/">Browse marketplace</ButtonLink> : undefined
          }
        />
      ) : (
        <ul className="space-y-2">
          {data.items.map((request) => {
            const other = tab === 'incoming' ? request.requester : request.seller;
            const image = request.listing.images[0]?.url;
            return (
              <li key={request.id}>
                <Link
                  to={`/requests/${request.id}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:border-brand-300"
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                    {image ? (
                      <img src={image} alt="" className="size-full object-cover" />
                    ) : (
                      <CategoryArt category={request.listing.category} className="[&_svg]:size-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{request.listing.title}</p>
                      <RequestStatusBadge status={request.status} />
                    </div>
                    <p className="text-sm text-fg-muted">
                      {tab === 'incoming' ? `From ${other.name}` : `Seller: ${other.name}`} ·{' '}
                      {formatListingPrice(request.listing)}
                    </p>
                    <p className="text-xs text-fg-faint">
                      {request.type === 'RENT' && request.rentStartDate && request.rentEndDate
                        ? `${formatDate(request.rentStartDate)} – ${formatDate(request.rentEndDate)} · `
                        : ''}
                      Updated {timeAgo(request.updatedAt)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
