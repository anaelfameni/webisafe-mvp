import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import Analyse from './pages/Analyse';
import Rapport from './pages/Rapport';
import Tarifs from './pages/Tarifs';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import Partenaire from './pages/Partenaire';
import PartenaireConfirmation from './pages/PartenaireConfirmation';
import { useAuth } from './hooks/useAuth';

function AppShell({ user, logout, showAuth, setShowAuth, authMode, setAuthMode, handleAuth }) {
  const location = useLocation();

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
      <Header
        user={user}
        onLogout={logout}
        onAuthClick={(mode = 'login') => {
          setAuthMode(mode);
          setShowAuth(true);
        }}
      />

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
          <Route path="/rapport/:id" element={<Rapport />} />
          <Route path="/tarifs" element={<Tarifs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/partenaire" element={<Partenaire user={user} />} />
          <Route path="/partenaire/confirmation" element={<PartenaireConfirmation user={user} />} />
        </Routes>
      </main>

      <Footer />

      <AuthModal
        isOpen={showAuth}
        initialMode={authMode}
        onClose={() => setShowAuth(false)}
        onAuth={handleAuth}
      />
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

  return (
    <Router>
      <AppShell
        user={user}
        logout={logout}
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
