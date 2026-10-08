import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { communityApi } from '../../api/endpoints';
import type { PostDetail, PostType } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { ErrorState, FormError } from '../../components/ui/States';
import { fieldErrors } from '../../lib/errors';

const MAX_TAGS = 5;

function normaliseTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

function PostForm({ post, defaultType }: { post?: PostDetail; defaultType: PostType }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [type, setType] = useState<PostType>(post?.type ?? defaultType);
  const [title, setTitle] = useState(post?.title ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [tags, setTags] = useState<string[]>(post?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const payload = { type, title, body, tags: commitTag() };
      return post ? communityApi.update(post.id, payload) : communityApi.create(payload);
    },
    onSuccess: ({ post: saved }) => {
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: ['post', saved.id] });
      navigate(`/community/${saved.id}`, { replace: Boolean(post) });
    },
  });
  const errors = fieldErrors(save.error);

  /** Adds whatever is typed in the tag box; returns the resulting tag list. */
  function commitTag(): string[] {
    const tag = normaliseTag(tagInput);
    if (tag.length < 2 || tags.includes(tag) || tags.length >= MAX_TAGS) return tags;
    const next = [...tags, tag];
    setTags(next);
    setTagInput('');
    return next;
  }

  function onTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag();
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(tags.slice(0, -1));
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError error={save.error} />
      <div role="radiogroup" aria-label="Post type" className="grid grid-cols-2 gap-2">
        {(
          [
            ['DOUBT', 'Ask a Senior', 'A question for students who have been there'],
            ['DISCUSSION', 'Discussion', 'Share news, tips or start a conversation'],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => setType(value)}
            className={clsx(
              'rounded-xl border-2 p-3 text-left',
              type === value
                ? 'border-brand-600 bg-brand-50'
                : 'border-slate-200 bg-white hover:border-slate-300',
            )}
          >
            <span className="block text-sm font-semibold">{label}</span>
            <span className="block text-xs text-slate-500">{hint}</span>
          </button>
        ))}
      </div>
      <Card className="space-y-4 p-5">
        <Input
          label={type === 'DOUBT' ? 'Your question' : 'Title'}
          required
          maxLength={150}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          placeholder={
            type === 'DOUBT'
              ? 'e.g. Which elective is better for ML: DL or NLP?'
              : 'e.g. Tech fest volunteers needed'
          }
        />
        <Textarea
          label="Details"
          required
          rows={6}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          error={errors.body}
          placeholder="Give context so seniors can give you a useful answer."
        />
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-slate-700">
            Tags <span className="font-normal text-slate-500">(up to {MAX_TAGS})</span>
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {tags.length < MAX_TAGS && (
              <input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKey}
                onBlur={commitTag}
                placeholder={tags.length ? '' : 'e.g. electives, internships'}
                className="min-w-24 flex-1 border-0 p-1 text-sm focus:outline-none"
              />
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Press Enter or comma to add a tag. Tags help the next student find this.
          </p>
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {post ? 'Save changes' : 'Post'}
        </Button>
      </div>
    </form>
  );
}

export function NewPostPage() {
  const [params] = useSearchParams();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Ask or share"
        description="Be respectful. Your name is shown with your post."
      />
      <PostForm defaultType={params.get('type') === 'DISCUSSION' ? 'DISCUSSION' : 'DOUBT'} />
    </div>
  );
}

export function EditPostPage() {
  const { id = '' } = useParams();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['post', id],
    queryFn: () => communityApi.get(id),
  });
  if (isPending) return <FullPageSpinner />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data.post.isAuthor) return <Navigate to={`/community/${id}`} replace />;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit post" />
      <PostForm post={data.post} defaultType={data.post.type} />
    </div>
  );
}
