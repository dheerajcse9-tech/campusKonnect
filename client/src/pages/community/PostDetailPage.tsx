import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { communityApi } from '../../api/endpoints';
import type { Comment, PostDetail } from '../../api/types';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { ErrorState, FormError } from '../../components/ui/States';
import { PostTypeBadge } from '../../features/community/PostTypeBadge';
import { UpvoteButton } from '../../features/community/UpvoteButton';
import { ReportButton } from '../../features/reports/ReportButton';
import { timeAgo } from '../../lib/format';

function CommentItem({
  comment,
  post,
  onChanged,
}: {
  comment: Comment;
  post: PostDetail;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const save = useMutation({
    mutationFn: () => communityApi.updateComment(comment.id, body),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: () => communityApi.removeComment(comment.id),
    onSuccess: onChanged,
  });

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Avatar name={comment.author.name} url={comment.author.avatarUrl} size="sm" />
        <div className="min-w-0 text-sm">
          <Link to={`/users/${comment.author.id}`} className="font-medium hover:underline">
            {comment.author.name}
          </Link>
          {comment.isPostAuthor && (
            <Badge tone="neutral" className="ml-2">
              Author
            </Badge>
          )}
          <p className="text-xs text-slate-500">
            {[comment.author.department, comment.author.year ? `Year ${comment.author.year}` : null]
              .filter(Boolean)
              .join(' · ')}
            {comment.author.department || comment.author.year ? ' · ' : ''}
            {timeAgo(comment.createdAt)}
            {comment.updatedAt !== comment.createdAt ? ' · edited' : ''}
          </p>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <FormError error={save.error} />
          <Textarea
            aria-label="Edit answer"
            rows={3}
            value={body}
            maxLength={3000}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={save.isPending}
              disabled={!body.trim()}
              onClick={() => save.mutate()}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-line text-sm text-slate-800">{comment.body}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <UpvoteButton
          key={`${comment.id}-${comment.upvoteCount}`}
          count={comment.upvoteCount}
          upvoted={comment.viewerHasUpvoted}
          disabled={comment.isAuthor}
          label={post.type === 'DOUBT' ? 'Helpful' : 'Upvote'}
          onToggle={() => communityApi.upvoteComment(comment.id)}
        />
        {comment.isAuthor ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600"
              loading={remove.isPending}
              onClick={() => remove.mutate()}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </>
        ) : (
          <ReportButton targetType="COMMENT" targetId={comment.id} />
        )}
      </div>
    </li>
  );
}

export function PostDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['post', id],
    queryFn: () => communityApi.get(id),
  });
  const refresh = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const addComment = useMutation({
    mutationFn: () => communityApi.comment(id, reply.trim()),
    onSuccess: () => {
      setReply('');
      refresh();
    },
  });
  const removePost = useMutation({
    mutationFn: () => communityApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate('/community', { replace: true });
    },
  });

  if (isPending) return <FullPageSpinner />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const post = data.post;
  const isDoubt = post.type === 'DOUBT';

  function onReply(e: FormEvent) {
    e.preventDefault();
    if (reply.trim()) addComment.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to="/community"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> Community
      </Link>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <PostTypeBadge type={post.type} />
          <span>{timeAgo(post.createdAt)}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold">{post.title}</h1>
        <Link
          to={`/users/${post.author.id}`}
          className="mt-3 flex items-center gap-2 text-sm hover:opacity-80"
        >
          <Avatar name={post.author.name} url={post.author.avatarUrl} size="sm" />
          <span className="font-medium">{post.author.name}</span>
          <span className="text-slate-500">
            {[post.author.department, post.author.year ? `Year ${post.author.year}` : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </Link>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-800">
          {post.body}
        </p>
        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                to={`/community?tag=${encodeURIComponent(tag)}`}
                className="text-xs text-brand-700 hover:underline"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <UpvoteButton
            key={`${post.id}-${post.upvoteCount}`}
            count={post.upvoteCount}
            upvoted={post.viewerHasUpvoted}
            disabled={post.isAuthor}
            onToggle={() => communityApi.upvote(post.id)}
          />
          {post.isAuthor ? (
            <>
              <ButtonLink to={`/community/${post.id}/edit`} size="sm" variant="ghost">
                <Pencil className="size-3.5" /> Edit
              </ButtonLink>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </>
          ) : (
            <ReportButton targetType="POST" targetId={post.id} />
          )}
        </div>
      </Card>

      <section aria-labelledby="answers">
        <h2 id="answers" className="mb-3 font-semibold">
          {post.comments.length}{' '}
          {isDoubt ? (post.comments.length === 1 ? 'answer' : 'answers') : 'comments'}
          {isDoubt && post.comments.length > 1 && (
            <span className="ml-2 text-xs font-normal text-slate-500">Most helpful first</span>
          )}
        </h2>
        <ul className="space-y-3">
          {post.comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} post={post} onChanged={refresh} />
          ))}
        </ul>
      </section>

      <Card className="p-4">
        <form onSubmit={onReply} className="space-y-3">
          <FormError error={addComment.error} />
          <Textarea
            label={isDoubt ? 'Your answer' : 'Add a comment'}
            rows={3}
            maxLength={3000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={
              isDoubt ? 'Share what worked for you. Be kind and specific.' : 'Join the discussion'
            }
          />
          <div className="flex justify-end">
            <Button type="submit" loading={addComment.isPending} disabled={!reply.trim()}>
              {isDoubt ? 'Post answer' : 'Comment'}
            </Button>
          </div>
        </form>
      </Card>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this post?">
        <p className="text-sm text-slate-600">
          The post and its answers will no longer be visible.
        </p>
        <FormError error={removePost.error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={removePost.isPending}
            onClick={() => removePost.mutate()}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
