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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
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
