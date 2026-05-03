import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ onAuthClick }) {
  const { user, profile, signOut } = useAuth();
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
    { label: 'Fonctionnalités', path: '/#features' },
    { label: 'Tarifs', path: '/tarifs' },
    { label: 'Affiliation', path: '/partenaire' },
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'liquid-glass'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 lg:h-20 relative">
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
            >
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-lg group-hover:scale-110 transition-transform">
                W
              </div>
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
          <div className="hidden lg:flex flex-1 items-center justify-end gap-3">
            {user ? (
              <>
                <button
                  onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card-bg border border-border-color hover:border-primary/50 text-sm text-text-primary font-medium transition-all"
                >
                  <LayoutDashboard size={15} className="text-primary" />
                  {user?.role === 'admin' ? 'Panel Admin' : 'Tableau de bord'}
                </button>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-color hover:border-danger/40 text-sm text-white/50 hover:text-danger font-medium transition-all"
                >
                  <LogOut size={15} />
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
                    onClick={() => { navigate(user?.role === 'admin' ? '/admin' : '/dashboard'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-all"
                  >
                    <LayoutDashboard size={16} />
                    {user?.role === 'admin' ? 'Panel Admin' : 'Tableau de bord'}
                  </button>
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
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
