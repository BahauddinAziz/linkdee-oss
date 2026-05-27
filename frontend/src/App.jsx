import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';

// Pages
import Login         from './pages/Login';
import Signup        from './pages/Signup';
import Dashboard     from './pages/Dashboard';
import Campaigns     from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Accounts      from './pages/Accounts';
import Settings      from './pages/Settings';

/* ─── Layout Wrapper for authenticated pages ─── */
const AppLayout = () => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <Sidebar />
    <div style={{ flex: 1, marginLeft: 'var(--sidebar-width)', display: 'flex', flexDirection: 'column' }}>
      <Topbar />
      <main style={{ flex: 1, marginTop: 'var(--topbar-height)', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  </div>
);

/* ─── Protected Route Guard ─── */
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-base)',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            boxShadow: '0 0 20px rgba(99,102,241,0.5)',
          }}
        >
          ⚡
        </div>
        <span className="spinner spinner-lg" style={{ color: '#6366f1' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};

/* ─── Public Route Guard (redirect to dashboard if already logged in) ─── */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

/* ─── App Router ─── */
const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route
      path="/login"
      element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      }
    />
    <Route
      path="/signup"
      element={
        <PublicRoute>
          <Signup />
        </PublicRoute>
      }
    />

    {/* Protected */}
    <Route element={<ProtectedRoute />}>
      <Route path="/"              element={<Dashboard />} />
      <Route path="/campaigns"     element={<Campaigns />} />
      <Route path="/campaigns/:id" element={<CampaignDetail />} />
      <Route path="/accounts"      element={<Accounts />} />
      <Route path="/settings"      element={<Settings />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

/* ─── Root App ─── */
const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
