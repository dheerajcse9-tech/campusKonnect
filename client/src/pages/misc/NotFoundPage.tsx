import { Compass } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/States';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you're looking for doesn't exist or is no longer available."
      action={<ButtonLink to="/">Go to the marketplace</ButtonLink>}
    />
  );
}
