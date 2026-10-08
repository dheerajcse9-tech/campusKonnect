import type { PostType } from '../../api/types';
import { Badge } from '../../components/ui/Badge';

export function PostTypeBadge({ type }: { type: PostType }) {
  return type === 'DOUBT' ? (
    <Badge tone="amber">Ask a Senior</Badge>
  ) : (
    <Badge tone="brand">Discussion</Badge>
  );
}
