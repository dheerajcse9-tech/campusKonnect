import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { listingsApi } from '../../api/endpoints';
import type {
  ItemCondition,
  ListingCategory,
  ListingDetail,
  ListingType,
  RentPeriod,
} from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { ErrorState, FormError } from '../../components/ui/States';
import { ImagePicker } from '../../features/marketplace/ImagePicker';
import { errorMessage, fieldErrors } from '../../lib/errors';
import { CATEGORY_LABEL, CONDITION_LABEL } from '../../lib/format';
import { prepareImage, validateImage } from '../../lib/images';
import { useObjectUrls } from '../../lib/useObjectUrls';

const MAX_IMAGES = 5;

interface FormState {
  type: ListingType;
  title: string;
  description: string;
  category: ListingCategory | '';
  condition: ItemCondition | '';
  price: string;
  rentPeriod: RentPeriod;
  deposit: string;
  location: string;
}

function initialState(listing?: ListingDetail): FormState {
  return {
    type: listing?.type ?? 'SELL',
    title: listing?.title ?? '',
    description: listing?.description ?? '',
    category: listing?.category ?? '',
    condition: listing?.condition ?? '',
    price: listing ? String(listing.price) : '',
    rentPeriod: listing?.rentPeriod ?? 'DAY',
    deposit: listing?.deposit != null ? String(listing.deposit) : '',
    location: listing?.location ?? '',
  };
}

function ListingForm({ listing }: { listing?: ListingDetail }) {
  const editing = Boolean(listing);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => initialState(listing));
  const [files, setFiles] = useState<File[]>([]);
  const [savedImages, setSavedImages] = useState(listing?.images ?? []);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagesBusy, setImagesBusy] = useState(false);
  const fileUrls = useObjectUrls(files);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const isRent = form.type === 'RENT';

  const save = useMutation({
    mutationFn: async () => {
      if (listing) {
        return listingsApi.update(listing.id, {
          title: form.title,
          description: form.description,
          category: form.category || undefined,
          condition: form.condition || undefined,
          price: Number(form.price),
          ...(isRent
            ? { rentPeriod: form.rentPeriod, deposit: form.deposit ? Number(form.deposit) : null }
            : {}),
          location: form.location.trim() || null,
        });
      }
      const data = new FormData();
      const fields: Record<string, string> = {
        type: form.type,
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition,
        price: form.price,
        location: form.location,
        ...(isRent ? { rentPeriod: form.rentPeriod, deposit: form.deposit } : {}),
      };
      Object.entries(fields).forEach(([k, v]) => data.append(k, v));
      files.forEach((file) => data.append('images', file));
      return listingsApi.create(data);
    },
    onSuccess: ({ listing: saved }) => {
      toast.success(editing ? 'Changes saved' : 'Your listing is live!');
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.setQueryData(['listing', saved.id], {
        listing: { ...saved, isOwner: true, viewerRequest: null },
      });
      navigate(`/listings/${saved.id}`, { replace: editing });
    },
  });
  const errors = fieldErrors(save.error);

  async function addFiles(picked: File[]) {
    setImageError(null);
    setImagesBusy(true);
    try {
      const prepared = await Promise.all(picked.map(prepareImage));
      const problem = prepared.map(validateImage).find(Boolean);
      if (problem) {
        setImageError(problem);
        return;
      }
      if (listing) {
        // Editing: upload straight away so the listing always reflects what you see.
        const { listing: updated } = await listingsApi.addImages(listing.id, prepared);
        setSavedImages(updated.images);
      } else {
        setFiles((current) => [...current, ...prepared].slice(0, MAX_IMAGES));
      }
    } catch (err) {
      setImageError(errorMessage(err));
    } finally {
      setImagesBusy(false);
    }
  }

  async function removeImage(key: string) {
    setImageError(null);
    if (!listing) {
      setFiles((current) => current.filter((_, i) => `new-${i}` !== key));
      return;
    }
    setImagesBusy(true);
    try {
      const { listing: updated } = await listingsApi.removeImage(listing.id, key);
      setSavedImages(updated.images);
    } catch (err) {
      setImageError(errorMessage(err));
    } finally {
      setImagesBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  const pickerImages = listing
    ? savedImages.map((image) => ({ key: image.id, url: image.url }))
    : fileUrls.map((url, i) => ({ key: `new-${i}`, url }));

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormError error={save.error} />

      {!editing && (
        <div
          role="radiogroup"
          aria-label="Listing type"
          className="grid grid-cols-2 gap-2 rounded-xl bg-surface-3 p-1"
        >
          {(['SELL', 'RENT'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={form.type === type}
              onClick={() => set('type', type)}
              className={clsx(
                'rounded-lg py-2 text-sm font-semibold',
                form.type === type
                  ? 'bg-surface text-brand-700 dark:text-brand-300 shadow-sm'
                  : 'text-fg-muted',
              )}
            >
              {type === 'SELL' ? 'Sell' : 'Rent out'}
            </button>
          ))}
        </div>
      )}

      <Card className="space-y-4 p-5">
        <ImagePicker
          images={pickerImages}
          max={MAX_IMAGES}
          onAdd={addFiles}
          onRemove={removeImage}
          busy={imagesBusy || save.isPending}
        />
        {imageError && <p className="text-sm text-red-600 dark:text-red-400">{imageError}</p>}
      </Card>

      <Card className="space-y-4 p-5">
        <Input
          label="Title"
          required
          maxLength={100}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
          placeholder="e.g. Engineering Mathematics by B.S. Grewal"
        />
        <Textarea
          label="Description"
          required
          rows={5}
          maxLength={2000}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          placeholder="Condition, edition, what's included, why you're selling…"
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            required
            value={form.category}
            onChange={(e) => set('category', e.target.value as ListingCategory)}
            error={errors.category}
          >
            <option value="">Choose…</option>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            label="Condition"
            required
            value={form.condition}
            onChange={(e) => set('condition', e.target.value as ItemCondition)}
            error={errors.condition}
          >
            <option value="">Choose…</option>
            {Object.entries(CONDITION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className={clsx('grid gap-3', isRent ? 'grid-cols-2' : 'grid-cols-1')}>
          <Input
            label={isRent ? 'Rent (₹)' : 'Price (₹)'}
            type="number"
            inputMode="numeric"
            required
            min={0}
            step={1}
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            error={errors.price}
            hint={isRent ? undefined : 'Enter 0 to give it away for free.'}
          />
          {isRent && (
            <Select
              label="Per"
              value={form.rentPeriod}
              onChange={(e) => set('rentPeriod', e.target.value as RentPeriod)}
              error={errors.rentPeriod}
            >
              <option value="DAY">Day</option>
              <option value="WEEK">Week</option>
              <option value="MONTH">Month</option>
            </Select>
          )}
        </div>
        {isRent && (
          <Input
            label="Refundable deposit (₹, optional)"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.deposit}
            onChange={(e) => set('deposit', e.target.value)}
            error={errors.deposit}
            hint="Agree on how the deposit is returned before handing over the item."
          />
        )}
        <Input
          label="Pickup location (optional)"
          maxLength={100}
          value={form.location}
          onChange={(e) => set('location', e.target.value)}
          error={errors.location}
          placeholder="e.g. Library entrance, Hostel B"
          hint="A public campus spot. Never post your room number."
        />
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={imagesBusy}>
          {editing ? 'Save changes' : 'Publish listing'}
        </Button>
      </div>
    </form>
  );
}

export function NewListingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="List an item"
        description="Sell or rent something to verified students on your campus."
      />
      <ListingForm />
    </div>
  );
}

export function EditListingPage() {
  const { id = '' } = useParams();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.get(id),
  });
  if (isPending) return <FullPageSpinner />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data.listing.isOwner) return <Navigate to={`/listings/${id}`} replace />;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit listing" />
      <ListingForm listing={data.listing} />
    </div>
  );
}
