import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const dark = resolved === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`relative rounded-full p-2 text-fg-muted transition hover:bg-surface-3 hover:text-fg ${className}`}
    >
      <Sun
        className={`size-5 transition-all ${dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
      />
      <Moon
        className={`absolute inset-2 size-5 transition-all ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}
      />
    </button>
  );
}
