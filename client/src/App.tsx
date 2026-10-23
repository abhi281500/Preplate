import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './features/landing/LandingPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterRestaurantPage } from './features/auth/RegisterRestaurantPage';
import { PublicMenuPortal } from './features/public-ordering/PublicMenuPortal';
import { RestaurantDashboard } from './features/restaurant/RestaurantDashboard';
import { SuperAdminDashboard } from './features/super-admin/SuperAdminDashboard';
import { useAuth } from './shared/AuthContext';

// Protected Route wrapper
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('SUPER_ADMIN' | 'RESTAURANT_OWNER' | 'RESTAURANT_STAFF')[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterRestaurantPage />} />
      <Route path="/r/:slug" element={<PublicMenuPortal />} />

      {/* Protected Restaurant Admin */}
      <Route
        path="/admin/restaurant/*"
        element={
          <ProtectedRoute allowedRoles={['RESTAURANT_OWNER', 'RESTAURANT_STAFF']}>
            <RestaurantDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected SaaS Super Admin */}
      <Route
        path="/admin/super/*"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
