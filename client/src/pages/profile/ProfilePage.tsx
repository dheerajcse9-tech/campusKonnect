import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, ExternalLink } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router';
import { authApi, usersApi } from '../../api/endpoints';
import { useAuth, useCurrentUser } from '../../auth/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { FormError } from '../../components/ui/States';
import { errorMessage, fieldErrors } from '../../lib/errors';
import { prepareImage, validateImage } from '../../lib/images';

function ProfileForm() {
  const me = useCurrentUser();
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    name: me.name,
    department: me.department ?? '',
    year: me.year ? String(me.year) : '',
    phone: me.phone ?? '',
    bio: me.bio ?? '',
  });
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      usersApi.update({
        name: form.name,
        department: form.department,
        year: form.year ? Number(form.year) : null,
        phone: form.phone,
        bio: form.bio,
      }),
    onSuccess: ({ user }) => {
      setUser(user);
      setSaved(true);
      toast.success('Profile saved');
    },
  });
  const errors = fieldErrors(save.error);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError error={Object.keys(errors).length ? null : save.error} />
      <Input
        label="Full name"
        value={form.name}
        onChange={set('name')}
        error={errors.name}
        required
        maxLength={80}
      />
      <Input
        label="College email"
        value={me.email}
        disabled
        hint="Your verified college email can't be changed."
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Department"
          value={form.department}
          onChange={set('department')}
          error={errors.department}
          maxLength={80}
        />
        <Select label="Year" value={form.year} onChange={set('year')} error={errors.year}>
          <option value="">Not set</option>
          {[1, 2, 3, 4, 5, 6].map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </Select>
      </div>
      <Input
        label="Phone (optional)"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={form.phone}
        onChange={set('phone')}
        error={errors.phone}
        hint="Only shared with a buyer or seller after you approve or are approved for a deal."
      />
      <Textarea
        label="Bio (optional)"
        rows={3}
        maxLength={300}
        value={form.bio}
        onChange={set('bio')}
        error={errors.bio}
      />
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
            Saved
          </span>
        )}
        <Button type="submit" loading={save.isPending}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

function AvatarUploader() {
  const me = useCurrentUser();
  const { setUser } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      const problem = validateImage(prepared);
      if (problem) throw new Error(problem);
      const { user } = await usersApi.uploadAvatar(prepared);
      setUser(user);
      toast.success('Profile photo updated');
    } catch (err) {
      setError(err instanceof Error && !('code' in err) ? err.message : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={me.name} url={me.avatarUrl} size="lg" />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-brand-600 p-1.5 text-white"
          aria-label="Change profile photo"
        >
          <Camera className="size-3.5" />
        </button>
      </div>
      <div>
        <p className="font-semibold">{me.name}</p>
        <p className="text-sm text-fg-muted">{me.email}</p>
        <Link
          to={`/users/${me.id}`}
          className="mt-1 inline-flex items-center gap-1 text-sm text-brand-700 dark:text-brand-300 hover:underline"
        >
          View public profile <ExternalLink className="size-3.5" />
        </Link>
        {busy && <p className="text-xs text-fg-muted">Uploading…</p>}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void onFile(file);
        }}
      />
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: (res) => {
      setMessage(res.message);
      setCurrent('');
      setNext('');
    },
  });
  const errors = fieldErrors(change.error);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        change.mutate();
      }}
      className="space-y-3"
    >
      <FormError error={errors.newPassword ? null : change.error} />
      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {message}
        </p>
      )}
      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        error={errors.newPassword}
        hint="At least 8 characters, with a letter and a number."
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="secondary"
          loading={change.isPending}
          disabled={!current || !next}
        >
          Change password
        </Button>
      </div>
    </form>
  );
}

function DeleteAccount() {
  const me = useCurrentUser();
  const { clearSession } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const remove = useMutation({
    mutationFn: () => usersApi.deleteAccount(password),
    onSuccess: () => {
      toast.success('Your account has been deleted. Take care!');
      clearSession();
    },
  });

  return (
    <>
      <p className="text-sm text-fg-muted">
        Permanently close your account. Your listings are removed, open deals are cancelled, your
        posts and answers are hidden, and your personal details are erased. This can't be undone.
      </p>
      <Button
        variant="danger"
        className="mt-3"
        onClick={() => setOpen(true)}
        disabled={me.role === 'ADMIN'}
      >
        Delete my account
      </Button>
      {me.role === 'ADMIN' && (
        <p className="mt-2 text-xs text-fg-muted">
          Administrators must hand over the admin role first.
        </p>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Delete your account?">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            remove.mutate();
          }}
          className="space-y-3"
        >
          <FormError error={remove.error} />
          <Input
            label="Your password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label='Type "DELETE" to confirm'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Keep my account
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={remove.isPending}
              disabled={!password || confirm !== 'DELETE'}
            >
              Delete forever
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="My profile" />
      <Card className="space-y-6 p-5">
        <AvatarUploader />
        <ProfileForm />
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Password</h2>
        <ChangePassword />
      </Card>
      <Card className="border-red-500/30 p-5">
        <h2 className="mb-2 font-semibold text-red-700 dark:text-red-300">Delete account</h2>
        <DeleteAccount />
      </Card>
    </div>
  );
}
