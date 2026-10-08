import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { requestsApi } from '../../api/endpoints';
import type { ListingDetail } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { FormError } from '../../components/ui/States';
import { fieldErrors } from '../../lib/errors';
import { formatListingPrice, formatPrice, todayInputValue } from '../../lib/format';

export function RequestItemModal({
  listing,
  open,
  onClose,
}: {
  listing: ListingDetail;
  open: boolean;
  onClose: () => void;
}) {
  const isRent = listing.type === 'RENT';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      requestsApi.create({
        listingId: listing.id,
        message: message.trim() || undefined,
        rentStartDate: isRent ? start : undefined,
        rentEndDate: isRent ? end : undefined,
      }),
    onSuccess: ({ request }) => {
      toast.success('Request sent! The seller has been notified.');
      void queryClient.invalidateQueries({ queryKey: ['listing', listing.id] });
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      navigate(`/requests/${request.id}`);
    },
  });
  const errors = fieldErrors(mutation.error);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title={isRent ? 'Request to rent' : 'Request to buy'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg bg-surface-2 p-3 text-sm">
          <p className="font-medium">{listing.title}</p>
          <p className="text-fg-muted">
            {formatListingPrice(listing)}
            {isRent && listing.deposit
              ? ` · ${formatPrice(listing.deposit)} refundable deposit`
              : ''}
          </p>
        </div>
        <FormError error={Object.keys(errors).length ? null : mutation.error} />
        {isRent && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="From"
              type="date"
              required
              min={todayInputValue()}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              error={errors.rentStartDate}
            />
            <Input
              label="Until"
              type="date"
              required
              min={start || todayInputValue()}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              error={errors.rentEndDate}
            />
          </div>
        )}
        <Textarea
          label="Message to the seller (optional)"
          rows={3}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            isRent
              ? 'e.g. I need it for the lab exam week.'
              : 'e.g. Is it still available? I can pick it up today.'
          }
          error={errors.message}
        />
        <p className="text-xs text-fg-muted">
          Your contact details are shared only if the seller approves. You can then chat and arrange
          to meet on campus.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Send request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
