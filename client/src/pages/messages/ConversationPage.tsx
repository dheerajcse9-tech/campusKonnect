import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, Send } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { messagingApi } from '../../api/endpoints';
import type { Message } from '../../api/types';
import { useCurrentUser } from '../../auth/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { ErrorState, FormError } from '../../components/ui/States';
import { formatDate, formatTime } from '../../lib/format';

const POLL_MS = 4000;

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  if (incoming.length === 0) return current;
  const seen = new Set(current.map((m) => m.id));
  const merged = [...current, ...incoming.filter((m) => !seen.has(m.id))];
  return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function ConversationPage() {
  const { id = '' } = useParams();
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<unknown>(null);
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const thread = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => messagingApi.thread(id),
    refetchOnWindowFocus: false,
  });

  // Seed local state from the initial load.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (thread.data && seededFor !== id) {
    setSeededFor(id);
    setMessages(thread.data.messages);
  }

  // Poll for new messages while the tab is visible (ADR-0005).
  const lastCreatedAt = messages.at(-1)?.createdAt;
  const loaded = thread.data !== undefined;
  const canSend = thread.data?.conversation.canSend;
  const { refetch } = thread;
  useEffect(() => {
    if (!loaded) return;
    const timer = window.setInterval(async () => {
      if (document.hidden) return;
      try {
        // Overlap by a second and de-duplicate, so messages sharing a timestamp aren't missed.
        const after = lastCreatedAt
          ? new Date(new Date(lastCreatedAt).getTime() - 1000).toISOString()
          : undefined;
        const update = await messagingApi.thread(id, after);
        setMessages((current) => mergeMessages(current, update.messages));
        // The deal was cancelled or completed meanwhile: reload to update the composer.
        if (update.conversation.canSend !== canSend) void refetch();
      } catch {
        // Transient network errors: try again on the next tick.
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [id, lastCreatedAt, loaded, canSend, refetch]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [messages.length, queryClient]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const { message } = await messagingApi.send(id, body);
      setMessages((current) => mergeMessages(current, [message]));
      setDraft('');
    } catch (err) {
      setSendError(err);
    } finally {
      setSending(false);
    }
  }

  if (thread.isPending) return <FullPageSpinner />;
  if (thread.error)
    return <ErrorState error={thread.error} onRetry={() => void thread.refetch()} />;
  const { conversation } = thread.data;

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white md:h-[calc(100dvh-8rem)]">
      <header className="flex items-center gap-3 border-b border-slate-200 p-3">
        <Link
          to="/messages"
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Back to messages"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar
          name={conversation.counterpart.name}
          url={conversation.counterpart.avatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{conversation.counterpart.name}</p>
          <Link
            to={`/requests/${conversation.request.id}`}
            className="block truncate text-xs text-brand-700 hover:underline"
          >
            {conversation.listing.title}
          </Link>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="mx-auto max-w-xs py-8 text-center text-sm text-slate-500">
            Say hello! Agree on a public spot on campus and a time to meet.
          </p>
        )}
        {messages.map((message, i) => {
          const mine = message.senderId === me.id;
          const day = formatDate(message.createdAt);
          const showDay = i === 0 || day !== formatDate(messages[i - 1]!.createdAt);
          return (
            <div key={message.id}>
              {showDay && <p className="my-3 text-center text-xs text-slate-400">{day}</p>}
              <div className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm',
                    mine
                      ? 'rounded-br-sm bg-brand-600 text-white'
                      : 'rounded-bl-sm bg-white text-slate-800 shadow-sm',
                  )}
                >
                  {message.body}
                  <span
                    className={clsx(
                      'mt-0.5 block text-right text-[10px]',
                      mine ? 'text-indigo-200' : 'text-slate-400',
                    )}
                  >
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {conversation.canSend ? (
        <form onSubmit={onSend} className="border-t border-slate-200 p-3">
          <FormError error={sendError} />
          <div className="flex items-end gap-2">
            <label htmlFor="message" className="sr-only">
              Message
            </label>
            <textarea
              id="message"
              rows={1}
              maxLength={2000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Type a message"
              className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-white disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="size-4" />
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-slate-200 p-3 text-center text-sm text-slate-500">
          This chat is closed because the request is no longer active.
        </p>
      )}
    </div>
  );
}
