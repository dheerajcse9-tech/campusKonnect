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
import { ListingDetailPage } from './pages/marketplace/ListingDetailPage';
import { EditListingPage, NewListingPage } from './pages/marketplace/ListingFormPage';
import { MyListingsPage } from './pages/marketplace/MyListingsPage';
import { ConversationPage } from './pages/messages/ConversationPage';
import { ConversationsPage } from './pages/messages/ConversationsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { RequestDetailPage } from './pages/requests/RequestDetailPage';
import { RequestsPage } from './pages/requests/RequestsPage';
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
          <Route path="listings/new" element={<NewListingPage />} />
          <Route path="listings/:id" element={<ListingDetailPage />} />
          <Route path="listings/:id/edit" element={<EditListingPage />} />
          <Route path="my-listings" element={<MyListingsPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/:id" element={<RequestDetailPage />} />
          <Route path="messages" element={<ConversationsPage />} />
          <Route path="messages/:id" element={<ConversationPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
