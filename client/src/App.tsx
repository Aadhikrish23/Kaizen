import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoadingState } from './components/ui/LoadingState';

const DashboardLayout = React.lazy(() => import('./layouts/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const LoginForm = React.lazy(() => import('./features/auth/LoginForm').then(m => ({ default: m.LoginForm })));
const RegisterForm = React.lazy(() => import('./features/auth/RegisterForm').then(m => ({ default: m.RegisterForm })));
const Onboarding = React.lazy(() => import('./features/onboarding/Onboarding').then(m => ({ default: m.Onboarding })));
const ProfileSettings = React.lazy(() => import('./features/profile/ProfileSettings').then(m => ({ default: m.ProfileSettings })));

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-kaizen-bg flex items-center justify-center">
        <LoadingState message="Loading session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not complete (except if already there)
  if (!user?.onboardingComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-kaizen-bg flex items-center justify-center"><LoadingState message="Loading application..." /></div>}>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/profile"
          element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
