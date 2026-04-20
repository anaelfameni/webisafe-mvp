import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';

export default function Header({ user, onLogout, onAuthClick }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
          <div className="hidden lg:flex flex-1 items-center justify-end gap-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card-bg border border-border-color hover:border-primary/50 transition-all"
                >
                  <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center">
                    <User size={14} className="text-primary" />
                  </div>
                  <span className="text-sm text-text-primary">{user.name?.split(' ')[0]}</span>
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-48 bg-card-bg border border-border-color rounded-xl shadow-xl overflow-hidden"
                    >
                      <button
                        onClick={() => { navigate('/dashboard'); setUserMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-text-primary hover:bg-primary/10 transition-colors"
                      >
                        <LayoutDashboard size={16} />
                        Tableau de bord
                      </button>
                      <button
                        onClick={() => { onLogout(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-danger hover:bg-danger/10 transition-colors border-t border-border-color"
                      >
                        <LogOut size={16} />
                        Déconnexion
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onAuthClick('login')}
                  className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
                >
                  Connexion
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-dark-navy/95 backdrop-blur-xl border-t border-border-color"
          >
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className="block w-full text-left px-4 py-3 rounded-lg text-text-secondary hover:text-white hover:bg-card-bg transition-all"
                >
                  {item.label}
                </button>
              ))}
              <hr className="border-border-color" />
              {user ? (
                <>
                  <button
                    onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                    className="block w-full text-left px-4 py-3 rounded-lg text-text-secondary hover:text-white hover:bg-card-bg transition-all"
                  >
                    📊 Tableau de bord
                  </button>
                  <button
                    onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                    className="block w-full text-left px-4 py-3 rounded-lg text-danger hover:bg-danger/10 transition-all"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => { onAuthClick('login'); setMobileMenuOpen(false); }}
                    className="block w-full text-center px-4 py-3 rounded-xl border border-border-color text-text-primary font-medium hover:bg-card-bg transition-all"
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => { onAuthClick('signup'); setMobileMenuOpen(false); }}
                    className="block w-full text-center px-4 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-all"
                  >
                    S'inscrire
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
