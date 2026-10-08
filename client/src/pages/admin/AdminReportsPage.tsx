import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { adminApi } from '../../api/endpoints';
import type { AdminReport, ReportStatus } from '../../api/types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState, FormError } from '../../components/ui/States';
import { REPORT_REASON_LABEL, timeAgo } from '../../lib/format';

const TARGET_LABEL = {
  USER: 'User',
  LISTING: 'Listing',
  POST: 'Post',
  COMMENT: 'Comment',
} as const;

function ResolveDialog({
  report,
  mode,
  onClose,
}: {
  report: AdminReport;
  mode: 'resolve' | 'dismiss';
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [removeContent, setRemoveContent] = useState(report.targetType !== 'USER');
  const [banUser, setBanUser] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      mode === 'resolve'
        ? adminApi.resolve(report.id, { note: note.trim() || undefined, removeContent, banUser })
        : adminApi.dismiss(report.id, note.trim() || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'resolve' ? 'Take action on this report' : 'Dismiss this report'}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {TARGET_LABEL[report.targetType]}:{' '}
          <strong>{report.target?.label ?? 'deleted item'}</strong>
        </p>
        <FormError error={mutation.error} />
        {mode === 'resolve' && (
          <div className="space-y-2">
            {report.targetType !== 'USER' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-brand-600"
                  checked={removeContent}
                  onChange={(e) => setRemoveContent(e.target.checked)}
                />
                Remove this {TARGET_LABEL[report.targetType].toLowerCase()}
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-red-600"
                checked={banUser}
                onChange={(e) => setBanUser(e.target.checked)}
              />
              Suspend the {report.targetType === 'USER' ? 'user' : 'author'} (signs them out
              everywhere, cancels open deals)
            </label>
          </div>
        )}
        <Textarea
          label={
            mode === 'resolve'
              ? 'Reason (shown to the author if content is removed)'
              : 'Note (optional)'
          }
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="text-xs text-slate-500">This action is recorded in the audit log.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={mode === 'resolve' ? 'danger' : 'primary'}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mode === 'resolve' ? 'Resolve' : 'Dismiss'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus>('OPEN');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{ report: AdminReport; mode: 'resolve' | 'dismiss' } | null>(
    null,
  );
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['admin', 'reports', status, page],
    queryFn: () => adminApi.reports({ status, page }),
  });

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['OPEN', 'RESOLVED', 'DISMISSED'] as const).map((value) => (
          <button
            key={value}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            aria-pressed={status === value}
            className={clsx(
              'rounded-full border px-3 py-1 text-sm',
              status === value
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-slate-300 bg-white text-slate-600',
            )}
          >
            {value.charAt(0) + value.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {isPending ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={status === 'OPEN' ? 'No open reports' : 'Nothing here'}
          description={status === 'OPEN' ? 'The community is in good shape.' : undefined}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((report) => (
              <li
                key={report.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="red">{REPORT_REASON_LABEL[report.reason]}</Badge>
                  <Badge>{TARGET_LABEL[report.targetType]}</Badge>
                  {report.openReportsOnTarget > 1 && (
                    <Badge tone="amber">{report.openReportsOnTarget} open reports on this</Badge>
                  )}
                  {report.target && !report.target.active && <Badge>Already removed</Badge>}
                  <span className="ml-auto text-xs text-slate-500">
                    {timeAgo(report.createdAt)}
                  </span>
                </div>
                <p className="mt-2 font-medium">
                  {report.target ? (
                    <Link
                      to={report.target.link}
                      className="inline-flex items-center gap-1 hover:text-brand-700"
                      target="_blank"
                    >
                      {report.target.label} <ExternalLink className="size-3.5" />
                    </Link>
                  ) : (
                    'Deleted item'
                  )}
                </p>
                {report.details && (
                  <p className="mt-1 text-sm text-slate-700">“{report.details}”</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Reported by {report.reporter.name} ({report.reporter.email})
                </p>
                {report.status !== 'OPEN' && (
                  <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                    {report.status === 'RESOLVED' ? 'Resolved' : 'Dismissed'} by{' '}
                    {report.resolvedBy?.name ?? 'an admin'}
                    {report.resolvedAt ? ` ${timeAgo(report.resolvedAt)}` : ''}
                    {report.resolutionNote ? `: ${report.resolutionNote}` : ''}
                  </p>
                )}
                {report.status === 'OPEN' && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setAction({ report, mode: 'resolve' })}
                    >
                      Take action
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAction({ report, mode: 'dismiss' })}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
      {action && (
        <ResolveDialog report={action.report} mode={action.mode} onClose={() => setAction(null)} />
      )}
    </div>
  );
}
