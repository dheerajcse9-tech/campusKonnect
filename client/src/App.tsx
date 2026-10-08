import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { useAuth } from './auth/AuthContext';
import { GuestOnly, RequireAdmin } from './auth/guards';
import { FullPageSpinner } from './components/ui/Spinner';
import { LandingPage } from './pages/landing/LandingPage';
import { AppLayout } from './components/layout/AppLayout';
import { CheckEmailPage } from './pages/auth/CheckEmailPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { HomePage } from './pages/marketplace/HomePage';
import { NotFoundPage } from './pages/misc/NotFoundPage';

// Feature pages are split into separate chunks so the first load stays small on mobile data.
const ListingDetailPage = lazy(() =>
  import('./pages/marketplace/ListingDetailPage').then((m) => ({ default: m.ListingDetailPage })),
);
const EditListingPage = lazy(() =>
  import('./pages/marketplace/ListingFormPage').then((m) => ({ default: m.EditListingPage })),
);
const NewListingPage = lazy(() =>
  import('./pages/marketplace/ListingFormPage').then((m) => ({ default: m.NewListingPage })),
);
const MyListingsPage = lazy(() =>
  import('./pages/marketplace/MyListingsPage').then((m) => ({ default: m.MyListingsPage })),
);
const ConversationPage = lazy(() =>
  import('./pages/messages/ConversationPage').then((m) => ({ default: m.ConversationPage })),
);
const ConversationsPage = lazy(() =>
  import('./pages/messages/ConversationsPage').then((m) => ({ default: m.ConversationsPage })),
);
const NotificationsPage = lazy(() =>
  import('./pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const RequestDetailPage = lazy(() =>
  import('./pages/requests/RequestDetailPage').then((m) => ({ default: m.RequestDetailPage })),
);
const RequestsPage = lazy(() =>
  import('./pages/requests/RequestsPage').then((m) => ({ default: m.RequestsPage })),
);
const CommunityPage = lazy(() =>
  import('./pages/community/CommunityPage').then((m) => ({ default: m.CommunityPage })),
);
const PostDetailPage = lazy(() =>
  import('./pages/community/PostDetailPage').then((m) => ({ default: m.PostDetailPage })),
);
const EditPostPage = lazy(() =>
  import('./pages/community/PostFormPage').then((m) => ({ default: m.EditPostPage })),
);
const NewPostPage = lazy(() =>
  import('./pages/community/PostFormPage').then((m) => ({ default: m.NewPostPage })),
);
const AdminAuditPage = lazy(() =>
  import('./pages/admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })),
);
const AdminLayout = lazy(() =>
  import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminOverviewPage = lazy(() =>
  import('./pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })),
);
const AdminReportsPage = lazy(() =>
  import('./pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })),
);
const AdminUsersPage = lazy(() =>
  import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const ProfilePage = lazy(() =>
  import('./pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const UserProfilePage = lazy(() =>
  import('./pages/profile/UserProfilePage').then((m) => ({ default: m.UserProfilePage })),
);
const GuidelinesPage = lazy(() =>
  import('./pages/misc/GuidelinesPage').then((m) => ({ default: m.GuidelinesPage })),
);

/** Signed-in students get the app; visitors see the landing page at "/" and the login page elsewhere. */
function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  if (user === undefined) return <FullPageSpinner />;
  if (!user) {
    return location.pathname === '/' ? (
      <LandingPage />
    ) : (
      <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    );
  }
  return <AppLayout />;
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageSpinner />}>
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
          <Route element={<AppShell />}>
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
            <Route path="community" element={<CommunityPage />} />
            <Route path="community/new" element={<NewPostPage />} />
            <Route path="community/:id" element={<PostDetailPage />} />
            <Route path="community/:id/edit" element={<EditPostPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="users/:id" element={<UserProfilePage />} />
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
