import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ClipboardList, ImageOff } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { requestsApi } from '../../api/endpoints';
import type { RequestStatus } from '../../api/types';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
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
        className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:inline-grid"
      >
        {(['outgoing', 'incoming'] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-semibold',
              tab === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600',
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
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-slate-300 bg-white text-slate-600',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <FullPageSpinner />
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
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-300"
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {image ? (
                      <img src={image} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff className="m-4 size-6 text-slate-400" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{request.listing.title}</p>
                      <RequestStatusBadge status={request.status} />
                    </div>
                    <p className="text-sm text-slate-600">
                      {tab === 'incoming' ? `From ${other.name}` : `Seller: ${other.name}`} ·{' '}
                      {formatListingPrice(request.listing)}
                    </p>
                    <p className="text-xs text-slate-400">
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
