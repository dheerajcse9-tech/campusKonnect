import type { RequestStatus } from '../../api/types';
import { Badge, type Tone } from '../../components/ui/Badge';
import { REQUEST_STATUS_LABEL } from '../../lib/format';

const TONE: Record<RequestStatus, Tone> = {
  PENDING: 'amber',
  APPROVED: 'green',
  COMPLETED: 'brand',
  REJECTED: 'red',
  CANCELLED: 'neutral',
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={TONE[status]}>{REQUEST_STATUS_LABEL[status]}</Badge>;
}
