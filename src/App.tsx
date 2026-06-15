import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import LoadingSpinner from './components/LoadingSpinner';

// Pages import
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Collect from './pages/Collect';
import Sell from './pages/Sell';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Settings from './pages/Settings';

// Protected layout wrapper containing bottom tab navigation
const MainLayout: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-dairy-bg">
        <LoadingSpinner message="Loding ho rha hai..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen relative bg-dairy-bg no-scrollbar pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {/* Dynamic views rendered here */}
      <div className="flex flex-col flex-1">
        <Outlet />
      </div>

      {/* Persistent Bottom Tab Bar (Height: 64px) */}
      <BottomNav />
    </div>
  );
};

// Route redirection guard for login/register pages
const PublicOnlyRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-dairy-bg">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth pathways */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected secure app pathways */}
        <Route element={<MainLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/collect" element={<Collect />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback endpoints matching user specifications */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
