import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';
import LoadingSpinner from './components/Common/LoadingSpinner';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Affiliate from './pages/Affiliate';
import ECommerce from './pages/ECommerce';
import Content from './pages/Content';
import Marketplace from './pages/Marketplace';
import Analytics from './pages/Analytics';
import Payments from './pages/Payments';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import HelpCenter from './pages/HelpCenter';
import AdminPanel from './pages/Admin/AdminPanel';

// Styles
import './styles/App.css';
import './styles/globals.css';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Main App Layout
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="app">
      <Navbar 
        user={user} 
        onToggleSidebar={toggleSidebar}
        isMobile={isMobile}
      />
      
      <div className="app-body">
        {user && (
          <Sidebar 
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            isMobile={isMobile}
            user={user}
          />
        )}
        
        <main className={`main-content ${user ? 'with-sidebar' : 'full-width'} ${sidebarOpen && isMobile ? 'sidebar-open' : ''}`}>
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
      
      <Footer />
      
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && isMobile && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/" 
                element={
                  <AppLayout>
                    <Home />
                  </AppLayout>
                } 
              />
              
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <AppLayout>
                      <Login />
                    </AppLayout>
                  </PublicRoute>
                } 
              />
              
              <Route 
                path="/register" 
                element={
                  <PublicRoute>
                    <AppLayout>
                      <Register />
                    </AppLayout>
                  </PublicRoute>
                } 
              />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Profile />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/affiliate" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Affiliate />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/ecommerce" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ECommerce />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/content" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Content />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/marketplace" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Marketplace />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Analytics />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/payments" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Payments />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/notifications" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Notifications />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/help" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <HelpCenter />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin Routes */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AppLayout>
                      <AdminPanel />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch all route */}
              <Route 
                path="*" 
                element={
                  <AppLayout>
                    <div className="not-found">
                      <h1>404 - Halaman Tidak Ditemukan</h1>
                      <p>Halaman yang Anda cari tidak tersedia.</p>
                    </div>
                  </AppLayout>
                } 
              />
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;