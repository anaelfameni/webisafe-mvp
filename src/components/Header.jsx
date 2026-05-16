import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header({ user: currentUser, onLogout, onAuthClick }) {
  const { user: contextUser, profile, signOut } = useAuth();
  const user = currentUser || contextUser;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navItems = [
    { label: 'Accueil', path: '/' },
    { label: 'Fonctionnalités', path: '/fonctionnalites' },
    { label: 'Protect', path: '/protect' },
    { label: 'Tarifs', path: '/tarifs' },
    { label: 'Partenaires', path: '/partenaire' },
    { label: 'Contact', path: '/contact' },
  ];

  const handleNavClick = (path) => {
    if (path.startsWith('/#')) {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.getElementById(path.replace('/#', ''))?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById(path.replace('/#', ''))?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
    }
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    if (typeof onLogout === 'function') {
      await onLogout();
      return;
    }
    await signOut();
    navigate('/');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'liquid-glass'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* J.4 — Header se contracte au scroll (h-20 → h-14) */}
        <div
          className={`flex items-center relative transition-[height] duration-300 ${
            isScrolled ? 'h-14 lg:h-16' : 'h-16 lg:h-20'
          }`}
        >
          {/* Logo */}
          <div className="flex-1 flex items-center justify-start">
            <Link
              to="/"
              onClick={() => {
                if (location.pathname === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-2 group"
              aria-label="Webisafe — Retour à l'accueil"
            >
              <img
                src="/logo.svg"
                alt="Webisafe"
                width={36}
                height={36}
                className="h-9 w-9 group-hover:scale-105 transition-transform"
                loading="eager"
                fetchpriority="high"
              />
              <span className="text-xl font-bold text-white">
                Webi<span className="text-primary">safe</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === item.path ? 'text-primary' : 'text-text-secondary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex flex-1 items-center justify-end gap-3 ml-8">
            <LanguageSwitcher />
            {user ? (
              <>
                <button
                  onClick={() => navigate(
                    user?.role === 'admin' ? '/admin' :
                    user?.role === 'agence' ? '/agence' : '/dashboard'
                  )}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card-bg border border-border-color hover:border-primary/50 text-xs text-text-primary font-medium transition-all"
                >
                  <LayoutDashboard size={14} className="text-primary" />
                  {user?.role === 'admin' ? 'Panel Admin' :
                   user?.role === 'agence' ? 'Console Agence' : 'Tableau de bord'}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-color hover:border-danger/40 text-xs text-white/50 hover:text-danger font-medium transition-all"
                >
                  <LogOut size={14} />
                  Se déconnecter
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onAuthClick('login')}
                  className="text-sm font-medium px-4 py-2 rounded-xl border border-border-color hover:border-primary/50 text-text-secondary hover:text-white transition-all"
                >
                  Se connecter
                </button>
                <button
                  onClick={() => onAuthClick('signup')}
                  className="text-sm font-medium px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-full transition-all btn-glow"
                >
                  S'inscrire
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-text-secondary hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-[#060C1A]/98 backdrop-blur-2xl border-t border-white/8"
          >
            <div className="px-4 pt-3 pb-5">
              {/* Nav links */}
              <div className="space-y-0.5 mb-4">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      location.pathname === item.path
                        ? 'bg-primary/15 text-primary'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="h-px bg-white/8 mb-4" />

              <div className="px-4 mb-3 flex items-center justify-between">
                <span className="text-white/40 text-xs uppercase tracking-wider">Langue</span>
                <LanguageSwitcher compact />
              </div>

              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl mb-1">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{profile?.full_name || user?.email}</p>
                      <p className="text-white/40 text-xs truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { navigate(
                      user?.role === 'admin' ? '/admin' :
                      user?.role === 'agence' ? '/agence' : '/dashboard'
                    ); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-all"
                  >
                    <LayoutDashboard size={16} />
                    {user?.role === 'admin' ? 'Panel Admin' :
                     user?.role === 'agence' ? 'Console Agence' : 'Tableau de bord'}
                  </button>
                  <button
                    onClick={async () => { await handleLogout(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 text-white/50 text-sm font-medium hover:text-danger hover:border-danger/30 hover:bg-danger/5 transition-all"
                  >
                    <LogOut size={16} />
                    Se déconnecter
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { onAuthClick('login'); setMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 rounded-xl border border-white/15 text-white text-sm font-semibold hover:bg-white/5 transition-all"
                  >
                    Se connecter
                  </button>
                  <button
                    onClick={() => { onAuthClick('signup'); setMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all"
                  >
                    S'inscrire gratuitement
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
