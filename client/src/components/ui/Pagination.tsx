import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="size-4" /> Previous
      </Button>
      <span className="text-sm text-fg-muted">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
