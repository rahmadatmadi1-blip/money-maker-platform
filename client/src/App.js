import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { PWAProvider } from './contexts/PWAContext';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';
import LoadingSpinner from './components/Common/LoadingSpinner';
import ErrorBoundary from './components/Common/ErrorBoundary';
import PerformanceMonitor from './components/Common/PerformanceMonitor';
import { OfflineIndicator, UpdateNotification, InstallPrompt } from './components/PWA';
import './utils/bundleAnalyzer'; // Auto-start bundle analysis in development
import './styles/App.css';
import './styles/globals.css';

// Lazy loaded pages for better performance
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Affiliate = React.lazy(() => import('./pages/Affiliate'));
const ECommerce = React.lazy(() => import('./pages/ECommerce'));
const Content = React.lazy(() => import('./pages/Content'));
const Marketplace = React.lazy(() => import('./pages/Marketplace'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Payments = React.lazy(() => import('./pages/Payments'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Settings = React.lazy(() => import('./pages/Settings'));
const HelpCenter = React.lazy(() => import('./pages/HelpCenter'));
const AdminPanel = React.lazy(() => import('./pages/Admin/AdminPanel'));

// Preload critical components for better UX
const preloadComponent = (componentImport) => {
  const componentImporter = () => componentImport();
  componentImporter();
  return componentImporter;
};

// Preload Dashboard and Profile as they are frequently accessed
if (typeof window !== 'undefined') {
  // Preload after initial load
  setTimeout(() => {
    import('./pages/Dashboard');
    import('./pages/Profile');
    import('./pages/Payments');
  }, 2000);
}



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
            <ErrorBoundary>
              <Suspense fallback={<LoadingSpinner />}>
                {children}
              </Suspense>
            </ErrorBoundary>
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
    <Provider store={store}>
      <PWAProvider>
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
          
          {/* PWA Components */}
          <OfflineIndicator />
          <UpdateNotification />
          <InstallPrompt />
          
          {/* Performance Monitor for development */}
          <PerformanceMonitor 
            enabled={process.env.NODE_ENV === 'development'}
            showMetrics={['fps', 'memory', 'timing']}
            onPerformanceIssue={(type, value, threshold) => {
              console.warn(`Performance issue detected: ${type} = ${value} (threshold: ${threshold})`);
            }}
          />
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </PWAProvider>
    </Provider>
  );
}

export default App;