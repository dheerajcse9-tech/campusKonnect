import { Toaster } from 'sonner';
import { useTheme } from '../../theme/ThemeContext';

export function AppToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ className: 'font-sans', duration: 3500 }}
    />
  );
}
