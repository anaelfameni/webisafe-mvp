import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, Phone, User, X } from 'lucide-react';
import {
  buildInternationalPhone,
  COUNTRY_DIAL_CODES,
  DEFAULT_PHONE_COUNTRY,
  findCountryByCode,
  getFlagImageUrl,
  normalizePhoneDigits,
} from '../utils/phoneCountries';

export default function AuthModal({ isOpen, onClose, onAuth, initialMode = 'login' }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) {
      setShowCountryMenu(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhoneCountry(DEFAULT_PHONE_COUNTRY);
    setPhone('');
    setPassword('');
    setShowPassword(false);
    setShowCountryMenu(false);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Validation téléphone seulement en signup
    if (mode === 'signup') {
      const localPhone = normalizePhoneDigits(phone);
      if (localPhone.length < 6) {
        setError('Le numéro de téléphone doit contenir au moins 6 chiffres.');
        return;
      }
    }

    setLoading(true);

    // Petit délai UX (optionnel)
    await new Promise((resolve) => setTimeout(resolve, 800));

    let result;
    try {
      result = await onAuth(mode, {
        name,
        email,
        phone: buildInternationalPhone(phoneCountry, phone),
        phoneCountry,
        password,
      });
    } catch (e) {
      setLoading(false);
      setError("Une erreur est survenue. Veuillez réessayer.");
      return;
    }

    if (result?.success) {
      setLoading(false);
      resetForm();

      // ✅ Fix : on ferme la modal par défaut après succès
      // Le parent peut empêcher la fermeture en renvoyant { close: false }
      if (result.close !== false) {
        onClose();
      }

      // Navigation uniquement si le parent la demande explicitement
      if (result.redirectTo) {
        navigate(result.redirectTo);
      }

      return;
    }

    setLoading(false);
    setError(result?.error || 'Email ou mot de passe incorrect');
  };

  const selectedCountry = findCountryByCode(phoneCountry);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(event) => event.stopPropagation()}
            className="bg-card-bg border border-border-color rounded-2xl w-full max-w-md overflow-visible"
          >
            <div className="flex items-center justify-between p-5 border-b border-border-color">
              <h3 className="text-lg font-bold text-white">
                {mode === 'login' ? 'Connexion' : 'Créer un compte'}
              </h3>
              <button
                onClick={onClose}
                className="p-1 text-text-secondary hover:text-white transition-colors"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="text-text-secondary text-sm mb-1 block">Nom complet</label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      />
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Votre nom"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm mb-1 block">
                      Numéro de téléphone
                    </label>
                    <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1.65fr)] gap-3">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowCountryMenu((current) => !current)}
                          className="w-full flex items-center gap-3 px-3 py-3 bg-dark-navy border border-border-color rounded-xl text-white focus:outline-none focus:border-primary transition-colors text-sm"
                        >
                          <img
                            src={getFlagImageUrl(selectedCountry.code)}
                            alt={`Drapeau ${selectedCountry.name}`}
                            className="h-4 w-6 rounded-[2px] object-cover shadow-sm flex-shrink-0"
                          />
                          <span className="min-w-0 flex-1 truncate text-left">
                            {selectedCountry.name}
                          </span>
                          <span className="text-primary text-xs font-medium">
                            {selectedCountry.dialCode}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`text-text-secondary transition-transform ${showCountryMenu ? 'rotate-180' : ''
                              }`}
                          />
                        </button>

                        <AnimatePresence>
                          {showCountryMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              className="absolute z-20 mt-2 w-[320px] max-w-[calc(100vw-3rem)] rounded-2xl border border-border-color bg-[#0f172a] shadow-2xl overflow-hidden"
                            >
                              <div className="max-h-72 overflow-y-auto py-2">
                                {COUNTRY_DIAL_CODES.map((country) => (
                                  <button
                                    key={`${country.code}-${country.dialCode}`}
                                    type="button"
                                    onClick={() => {
                                      setPhoneCountry(country.code);
                                      setShowCountryMenu(false);
                                    }}
                                    className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${country.code === phoneCountry
                                        ? 'bg-primary/12 text-white'
                                        : 'text-slate-200 hover:bg-white/5'
                                      }`}
                                  >
                                    <img
                                      src={getFlagImageUrl(country.code)}
                                      alt={`Drapeau ${country.name}`}
                                      loading="lazy"
                                      className="h-4 w-6 rounded-[2px] object-cover shadow-sm flex-shrink-0"
                                    />
                                    <span className="min-w-0 flex-1 truncate text-sm">
                                      {country.name}
                                    </span>
                                    <span className="text-xs text-primary font-medium">
                                      {country.dialCode}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="relative">
                        <Phone
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                        />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(normalizePhoneDigits(event.target.value))}
                          placeholder="0700000000"
                          required
                          className="w-full pl-10 pr-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-text-secondary text-sm mb-1 block">Email</label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="votre@email.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-text-secondary text-sm mb-1 block">Mot de passe</label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={4}
                    className="w-full pl-10 pr-10 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-danger text-sm text-center bg-danger/10 rounded-lg p-2"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : mode === 'login' ? (
                  'Se connecter'
                ) : (
                  'Créer mon compte'
                )}
              </button>

              <p className="text-center text-text-secondary text-sm">
                {mode === 'login' ? (
                  <>
                    Pas de compte ?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setError('');
                      }}
                      className="text-primary hover:underline"
                    >
                      Créer un compte
                    </button>
                  </>
                ) : (
                  <>
                    Déjà un compte ?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError('');
                      }}
                      className="text-primary hover:underline"
                    >
                      Se connecter
                    </button>
                  </>
                )}
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}