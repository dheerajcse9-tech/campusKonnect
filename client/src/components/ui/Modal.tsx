import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Accessible dialog built on the native <dialog> element (focus trap and Esc for free). */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="modal-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm open:animate-rise"
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id="modal-title" className="text-lg font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-fg-muted transition hover:bg-surface-3 hover:text-fg"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
