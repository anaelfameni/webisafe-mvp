import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';

const Analyse = lazy(() => import('./pages/Analyse'));
const Rapport = lazy(() => import('./pages/Rapport'));
const Payment = lazy(() => import('./pages/Payment'));
const Admin = lazy(() => import('./pages/Admin'));
const Tarifs = lazy(() => import('./pages/Tarifs'));
const Statistiques = lazy(() => import('./pages/Statistiques'));
const Contact = lazy(() => import('./pages/Contact'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Partenaire = lazy(() => import('./pages/Partenaire'));
const PartenaireConfirmation = lazy(() => import('./pages/PartenaireConfirmation'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));
const CGU = lazy(() => import('./pages/CGU'));
const Confidentialite = lazy(() => import('./pages/Confidentialite'));
const APropos = lazy(() => import('./pages/APropos'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Protect = lazy(() => import('./pages/Protect'));
const Corrections = lazy(() => import('./pages/Corrections'));

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

function AppShell({ user, logout, showAuth, setShowAuth, authMode, setAuthMode, handleAuth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isFullscreenRoute = location.pathname === '/admin' || location.pathname === '/dashboard';

  const handleAuthAndRedirect = (mode, data) => {
    const result = handleAuth(mode, data);
    if (result?.success && result?.redirectTo) {
      setShowAuth(false);
      navigate(result.redirectTo, { replace: true });
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
      supabase.from('affiliate_clicks').insert({
        ref_code: ref,
        page: window.location.pathname,
        created_at: new Date().toISOString()
      }).then(() => {});
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
            <Route path="/admin" element={<Admin user={user} />} />
            <Route path="/rapport/:id" element={<Rapport />} />
            <Route path="/tarifs" element={<Tarifs />} />
            <Route path="/statistiques" element={<Statistiques />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/partenaire" element={<Partenaire user={user} />} />
            <Route path="/partenaire/confirmation" element={<PartenaireConfirmation user={user} />} />
            <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/protect" element={<Protect />} />
            <Route path="/corrections" element={<Corrections />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {!isFullscreenRoute && (
        <div className={location.pathname === '/' ? 'mb-12' : ''}>
          <Footer />
        </div>
      )}

      {!isFullscreenRoute && location.pathname === '/' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary/10 backdrop-blur-md border-t border-primary/20 py-2.5 overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="mx-8 text-xs sm:text-sm font-medium text-primary/90 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Premier écosystème complet d'audit, correction et surveillance web conçu pour l'Afrique
              </span>
            ))}
          </div>
        </div>
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
  const { user, login, signup, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const handleLogout = () => {
    logout();
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
