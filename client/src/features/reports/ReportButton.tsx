import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { reportsApi } from '../../api/endpoints';
import type { ReportReason, ReportTargetType } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { FormError } from '../../components/ui/States';
import { REPORT_REASON_LABEL } from '../../lib/format';

const NOUN: Record<ReportTargetType, string> = {
  USER: 'user',
  LISTING: 'listing',
  POST: 'post',
  COMMENT: 'comment',
};

export function ReportButton({
  targetType,
  targetId,
  compact = false,
}: {
  targetType: ReportTargetType;
  targetId: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [details, setDetails] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      reportsApi.create({ targetType, targetId, reason, details: details.trim() || undefined }),
  });

  function close() {
    setOpen(false);
    setTimeout(() => {
      mutation.reset();
      setDetails('');
    }, 200);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-red-600"
      >
        <Flag className="size-3.5" aria-hidden="true" />
        {compact ? <span className="sr-only">Report</span> : 'Report'}
      </button>
      <Modal open={open} onClose={close} title={`Report this ${NOUN[targetType]}`}>
        {mutation.isSuccess ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Thank you. Our moderators will review this and you'll get a notification when it's
              handled.
            </p>
            <Button className="w-full" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <FormError error={mutation.error} />
            <Select
              label="What's wrong?"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
            >
              {Object.entries(REPORT_REASON_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Textarea
              label={reason === 'OTHER' ? 'Details (required)' : 'Details (optional)'}
              rows={3}
              maxLength={1000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Anything that helps moderators understand the problem"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" loading={mutation.isPending}>
                Submit report
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
