import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarDays,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { requestsApi } from '../../api/endpoints';
import type { TransactionRequestDetail } from '../../api/types';
import { Avatar } from '../../components/ui/Avatar';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { ErrorState, FormError } from '../../components/ui/States';
import { RequestStatusBadge } from '../../features/requests/RequestStatusBadge';
import { formatDate, formatListingPrice, formatPrice, timeAgo } from '../../lib/format';

type Action = 'approve' | 'reject' | 'cancel' | 'complete';

const TOAST: Record<Action, string> = {
  approve: 'Approved! Contact details and chat are now unlocked.',
  reject: 'Request declined.',
  cancel: 'Cancelled.',
  complete: 'Marked as done. Nice deal!',
};

interface ConfirmCopy {
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
}

function confirmCopy(action: Action, request: TransactionRequestDetail): ConfirmCopy {
  const other = request.viewerRole === 'seller' ? request.requester.name : request.seller.name;
  const isRent = request.type === 'RENT';
  switch (action) {
    case 'approve':
      return {
        title: `Approve ${request.requester.name}'s request?`,
        body: `Your contact details will be shared with ${request.requester.name}, chat will unlock, and the item will be reserved for them.`,
        confirm: 'Approve',
      };
    case 'reject':
      return {
        title: 'Decline this request?',
        body: `${other} will be notified.`,
        confirm: 'Decline',
        danger: true,
      };
    case 'cancel':
      return {
        title: request.status === 'APPROVED' ? 'Cancel this deal?' : 'Cancel your request?',
        body:
          request.status === 'APPROVED'
            ? `${other} will be notified, chat will close and the item goes back on the market.`
            : 'The seller will be notified.',
        confirm: 'Cancel it',
        danger: true,
      };
    case 'complete':
      return {
        title: isRent ? 'Mark the item as returned?' : 'Mark the deal as completed?',
        body: isRent
          ? 'Only do this once the item is back with you (and any deposit settled). It will be available to rent again.'
          : 'Only do this after the exchange happened. The item will be marked as sold and other requests will be closed.',
        confirm: isRent ? 'Item returned' : 'Deal completed',
      };
  }
}

function ContactCard({ request }: { request: TransactionRequestDetail }) {
  if (!request.contact) {
    return (
      <Card className="flex items-start gap-3 p-4 text-sm text-fg-muted">
        <Lock className="mt-0.5 size-5 shrink-0 text-fg-faint" aria-hidden="true" />
        <p>
          Contact details stay private until the seller approves. This keeps everyone safe from spam
          and unwanted contact.
        </p>
      </Card>
    );
  }
  const phoneDigits = request.contact.phone?.replace(/\D/g, '');
  const whatsapp = phoneDigits
    ? phoneDigits.length === 10
      ? `91${phoneDigits}`
      : phoneDigits
    : null;
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
        Contact {request.contact.name}
      </p>
      <ul className="mt-2 space-y-2 text-sm">
        <li>
          <a
            href={`mailto:${request.contact.email}`}
            className="flex items-center gap-2 text-brand-700 dark:text-brand-300 hover:underline"
          >
            <Mail className="size-4" aria-hidden="true" /> {request.contact.email}
          </a>
        </li>
        {request.contact.phone && (
          <li className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href={`tel:${request.contact.phone}`}
              className="flex items-center gap-2 text-brand-700 dark:text-brand-300 hover:underline"
            >
              <Phone className="size-4" aria-hidden="true" /> {request.contact.phone}
            </a>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                Open in WhatsApp
              </a>
            )}
          </li>
        )}
      </ul>
    </Card>
  );
}

export function RequestDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Action | null>(null);

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['request', id],
    queryFn: () => requestsApi.get(id),
    refetchInterval: 30_000,
  });

  const act = useMutation({
    mutationFn: (action: Action) => requestsApi.act(id, action),
    onSuccess: (result, action) => {
      toast.success(TOAST[action]);
      queryClient.setQueryData(['request', id], result);
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      void queryClient.invalidateQueries({ queryKey: ['listing', result.request.listing.id] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setPending(null);
    },
  });

  if (isPending) return <FullPageSpinner />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const request = data.request;
  const isSeller = request.viewerRole === 'seller';
  const other = isSeller ? request.requester : request.seller;
  const listing = request.listing;
  const image = listing.images[0]?.url;

  const actions: { action: Action; label: string; variant: 'primary' | 'secondary' | 'danger' }[] =
    [];
  if (isSeller && request.status === 'PENDING') {
    actions.push(
      { action: 'approve', label: 'Approve', variant: 'primary' },
      { action: 'reject', label: 'Decline', variant: 'secondary' },
    );
  }
  if (isSeller && request.status === 'APPROVED') {
    actions.push({
      action: 'complete',
      label: request.type === 'RENT' ? 'Mark as returned' : 'Mark as completed',
      variant: 'primary',
    });
  }
  if (request.status === 'PENDING' && !isSeller)
    actions.push({ action: 'cancel', label: 'Cancel request', variant: 'secondary' });
  if (request.status === 'APPROVED')
    actions.push({ action: 'cancel', label: 'Cancel deal', variant: 'secondary' });

  const copy = pending ? confirmCopy(pending, request) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to={`/requests?tab=${isSeller ? 'incoming' : 'outgoing'}`}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> All requests
      </Link>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <Link
            to={`/listings/${listing.id}`}
            className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface-3"
          >
            {image && <img src={image} alt="" className="size-full object-cover" />}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <RequestStatusBadge status={request.status} />
              <span className="text-xs text-fg-muted">
                {request.type === 'RENT' ? 'Rental request' : 'Purchase request'}
              </span>
            </div>
            <Link
              to={`/listings/${listing.id}`}
              className="mt-1 block font-semibold hover:text-brand-700 dark:hover:text-brand-300"
            >
              {listing.title}
            </Link>
            <p className="text-sm text-fg-muted">
              {formatListingPrice(listing)}
              {listing.type === 'RENT' && listing.deposit
                ? ` · ${formatPrice(listing.deposit)} deposit`
                : ''}
            </p>
          </div>
        </div>

        {request.type === 'RENT' && request.rentStartDate && request.rentEndDate && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-2 text-sm text-sky-800 dark:text-sky-300">
            <CalendarDays className="size-4" aria-hidden="true" />
            {formatDate(request.rentStartDate)} – {formatDate(request.rentEndDate)}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
          <Avatar name={other.name} url={other.avatarUrl} size="sm" />
          <div className="text-sm">
            <Link to={`/users/${other.id}`} className="font-medium hover:underline">
              {other.name}
            </Link>
            <p className="text-xs text-fg-muted">
              {isSeller ? 'Requested' : 'You requested'} {timeAgo(request.createdAt)}
            </p>
          </div>
        </div>
        {request.message && (
          <blockquote className="mt-3 rounded-lg bg-surface-2 p-3 text-sm text-fg-2">
            “{request.message}”
          </blockquote>
        )}

        {actions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map(({ action, label, variant }) => (
              <Button
                key={action}
                variant={variant}
                onClick={() => {
                  act.reset();
                  setPending(action);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {(request.status === 'APPROVED' ||
        request.status === 'COMPLETED' ||
        request.status === 'PENDING') && <ContactCard request={request} />}

      {request.conversation && (
        <ButtonLink
          to={`/messages/${request.conversation.id}`}
          variant={request.status === 'APPROVED' ? 'primary' : 'secondary'}
          className="w-full"
        >
          <MessageCircle className="size-4" />{' '}
          {request.status === 'APPROVED' ? 'Chat to arrange the meetup' : 'View chat history'}
        </ButtonLink>
      )}

      {request.status === 'APPROVED' && (
        <Card className="flex gap-3 border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
          <ShieldAlert className="size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Meet safely</p>
            <p className="mt-1">
              Meet in a public campus spot during the day, check the item before paying, and never
              pay in advance. Report anything suspicious.
            </p>
          </div>
        </Card>
      )}

      <Modal open={pending !== null} onClose={() => setPending(null)} title={copy?.title ?? ''}>
        {copy && pending && (
          <>
            <p className="text-sm text-fg-muted">{copy.body}</p>
            <div className="mt-3">
              <FormError error={act.error} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPending(null)}>
                Go back
              </Button>
              <Button
                variant={copy.danger ? 'danger' : 'primary'}
                loading={act.isPending}
                onClick={() => act.mutate(pending)}
              >
                {copy.confirm}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
