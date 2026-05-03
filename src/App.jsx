import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import Analyse from './pages/Analyse';
import Rapport from './pages/Rapport';
import Payment from './pages/Payment';
import Admin from './pages/Admin';
import Tarifs from './pages/Tarifs';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import Partenaire from './pages/Partenaire';
import PartenaireConfirmation from './pages/PartenaireConfirmation';
import { useAuth } from './hooks/useAuth';
import CGU from './pages/CGU';
import Confidentialite from './pages/Confidentialite';
import APropos from './pages/APropos';
import NotFound from './pages/NotFound';
import Protect from './pages/Protect';

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
          <Route path="/contact" element={<Contact />} />
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/partenaire" element={<Partenaire user={user} />} />
          <Route path="/partenaire/confirmation" element={<PartenaireConfirmation user={user} />} />
          <Route path="/cgu" element={<CGU />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/a-propos" element={<APropos />} />
          <Route path="/protect" element={<Protect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isFullscreenRoute && <Footer />}

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
  const { user, signup, login, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const handleAuth = (mode, data) => {
    if (mode === 'signup') {
      return signup(data.name, data.email, data.phone, data.password, data.phoneCountry);
    }

    return login(data.email, data.password);
  };

  const handleAuthWithRedirect = (mode, data) => {
    const result = handleAuth(mode, data);
    return result;
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
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
