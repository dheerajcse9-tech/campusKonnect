import { ImagePlus, X } from 'lucide-react';
import { useRef } from 'react';

export interface PickerImage {
  key: string;
  url: string;
}

/** Thumbnail grid with an "add photos" tile. Works for both new files and saved images. */
export function ImagePicker({
  images,
  max,
  onAdd,
  onRemove,
  busy = false,
}: {
  images: PickerImage[];
  max: number;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  busy?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const remaining = max - images.length;

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-fg-2">
        Photos{' '}
        <span className="font-normal text-fg-muted">
          ({images.length}/{max})
        </span>
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {images.map((image, i) => (
          <div
            key={image.key}
            className="relative aspect-square overflow-hidden rounded-lg bg-surface-3"
          >
            <img src={image.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-slate-900/70 px-1.5 text-[10px] text-white">
                Cover
              </span>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(image.key)}
              className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900"
              aria-label={`Remove photo ${i + 1}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line-strong text-fg-muted hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400"
          >
            <ImagePlus className="size-6" aria-hidden="true" />
            <span className="text-xs">Add photos</span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).slice(0, remaining);
          e.target.value = '';
          if (files.length) onAdd(files);
        }}
      />
      <p className="mt-1 text-xs text-fg-muted">
        Clear photos of the actual item get more requests. The first photo is the cover.
      </p>
    </div>
  );
}
