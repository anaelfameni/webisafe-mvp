import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import RouteSEO from './components/RouteSEO';
import { useAuth } from './hooks/useAuth';

const Analyse = lazy(() => import('./pages/Analyse'));
const Rapport = lazy(() => import('./pages/Rapport'));
const Payment = lazy(() => import('./pages/Payment'));
const Admin = lazy(() => import('./pages/Admin'));
const Agence = lazy(() => import('./pages/AgenceDashboard'));
const Tarifs = lazy(() => import('./pages/Tarifs'));
const Contact = lazy(() => import('./pages/Contact'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Partenaire = lazy(() => import('./pages/Partenaire'));
const PartenaireConfirmation = lazy(() => import('./pages/PartenaireConfirmation'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const CGU = lazy(() => import('./pages/CGU'));
const Confidentialite = lazy(() => import('./pages/Confidentialite'));
const APropos = lazy(() => import('./pages/APropos'));
const Protect = lazy(() => import('./pages/Protect'));
const Corrections = lazy(() => import('./pages/Corrections'));
// H.4 — NotFound minimaliste remplacé par la page Error complète
const NotFoundPage = lazy(() => import('./pages/Error').then((mod) => ({ default: mod.NotFoundPage })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-navy">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary text-sm">Chargement...</p>
      </div>
    </div>
  );
}

function AppShell({ user, authLoading, logout, showAuth, setShowAuth, authMode, setAuthMode, handleAuth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isFullscreenRoute = location.pathname === '/admin' || location.pathname === '/dashboard' || location.pathname === '/agence';

  const handleAuthAndRedirect = async (mode, data) => {
    const result = await handleAuth(mode, data);
    if (result?.success) {
      setShowAuth(false);
    }
    return result;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedAuthMode = params.get('auth');

    if (requestedAuthMode === 'signup' || requestedAuthMode === 'login') {
      setAuthMode(requestedAuthMode);
      setShowAuth(true);
    }
  }, [location.search, setAuthMode, setShowAuth]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('webisafe_ref', ref);
      fetch('/api/affiliate-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref_code: ref,
          page: window.location.pathname,
        }),
      }).catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen bg-dark-navy text-text-primary font-inter">
      {!isFullscreenRoute && (
        <Header
          user={user}
          onLogout={logout}
          onAuthClick={(mode = 'login') => {
            setAuthMode(mode);
            setShowAuth(true);
          }}
        />
      )}

      <RouteSEO />

      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  user={user}
                  onAuthRequest={() => {
                    setAuthMode('signup');
                    setShowAuth(true);
                  }}
                />
              }
            />
            <Route path="/analyse" element={<Analyse />} />
            <Route path="/payment" element={<Payment user={user} />} />
            <Route path="/admin" element={<Admin user={user} authLoading={authLoading} />} />
            <Route path="/agence" element={<Agence user={user} authLoading={authLoading} />} />
            <Route path="/rapport/:id" element={<Rapport />} />
            <Route path="/tarifs" element={<Tarifs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/dashboard" element={<Dashboard user={user} authLoading={authLoading} />} />
            <Route path="/partenaire" element={<Partenaire user={user} />} />
            <Route path="/partenaire/confirmation" element={<PartenaireConfirmation user={user} />} />
            <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
            <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/protect" element={<Protect />} />
            <Route path="/corrections" element={<Corrections />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {!isFullscreenRoute && (
        <Footer />
      )}

      {!isFullscreenRoute && (
        <AuthModal
          isOpen={showAuth}
          initialMode={authMode}
          onClose={() => setShowAuth(false)}
          onAuth={handleAuthAndRedirect}
        />
      )}
    </div>
  );
}

function App() {
  const { user, loading, login, signup, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const handleAuth = (mode, data) => {
    if (mode === 'login') {
      return login(data.email, data.password);
    }
    if (mode === 'signup') {
      return signup(data.name, data.email, data.phone, data.password, data.phoneCountry);
    }
    return { success: false, error: 'Mode inconnu' };
  };

  return (
    <Router>
      <AppShell
        user={user}
        authLoading={loading}
        logout={handleLogout}
        showAuth={showAuth}
        setShowAuth={setShowAuth}
        authMode={authMode}
        setAuthMode={setAuthMode}
        handleAuth={handleAuth}
      />
    </Router>
  );
}

export default App;
