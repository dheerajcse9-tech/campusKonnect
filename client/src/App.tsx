import { BrowserRouter, Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth } from './auth/guards';
import { AppLayout } from './components/layout/AppLayout';
import { CheckEmailPage } from './pages/auth/CheckEmailPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { HomePage } from './pages/marketplace/HomePage';
import { GuidelinesPage } from './pages/misc/GuidelinesPage';
import { NotFoundPage } from './pages/misc/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/guidelines" element={<GuidelinesPage />} />

        {/* Signed-in app */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
