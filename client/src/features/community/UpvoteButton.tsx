import clsx from 'clsx';
import { ArrowBigUp } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '../../lib/errors';

/**
 * Optimistic upvote toggle: updates instantly and rolls back if the server
 * rejects it (e.g. upvoting your own content).
 */
export function UpvoteButton({
  count,
  upvoted,
  disabled,
  onToggle,
  label = 'Upvote',
}: {
  count: number;
  upvoted: boolean;
  disabled?: boolean;
  onToggle: () => Promise<{ upvoted: boolean; upvoteCount: number }>;
  label?: string;
}) {
  const [state, setState] = useState({ count, upvoted });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy || disabled) return;
    const previous = state;
    setBusy(true);
    setError(null);
    setState({ upvoted: !previous.upvoted, count: previous.count + (previous.upvoted ? -1 : 1) });
    try {
      const result = await onToggle();
      setState({ upvoted: result.upvoted, count: result.upvoteCount });
    } catch (err) {
      setState(previous);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={state.upvoted}
        aria-label={`${label} (${state.count})`}
        title={disabled ? "You can't upvote your own content" : label}
        className={clsx(
          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium transition',
          state.upvoted
            ? 'border-brand-600 bg-brand-50 text-brand-700'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50',
          disabled && 'cursor-default opacity-70',
        )}
      >
        <ArrowBigUp
          className={clsx('size-4', state.upvoted && 'fill-current')}
          aria-hidden="true"
        />
        {state.count}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
