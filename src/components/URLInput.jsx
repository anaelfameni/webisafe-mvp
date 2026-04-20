import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { isValidURL, isValidEmail, normalizeURL } from '../utils/validators';

export default function URLInput({ onScan, loading }) {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [urlValid, setUrlValid] = useState(null);
  const [emailValid, setEmailValid] = useState(null);
  const [error, setError] = useState('');

  const handleUrlChange = (e) => {
    const value = e.target.value;
    setUrl(value);
    setError('');
    if (value.length > 3) {
      setUrlValid(isValidURL(value));
    } else {
      setUrlValid(null);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value.length > 3) {
      setEmailValid(isValidEmail(value));
    } else {
      setEmailValid(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Veuillez entrer une URL');
      return;
    }

    if (!isValidURL(url)) {
      setError('URL invalide — vérifiez le format (ex: https://votresite.ci)');
      return;
    }

    const normalizedUrl = normalizeURL(url);
    onScan(normalizedUrl, email);
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* URL Input */}
      <div className="relative mb-3">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
          <Search size={20} />
        </div>
        <input
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://votresite.ci"
          className={`w-full pl-12 pr-4 py-4 bg-card-bg border-2 rounded-xl text-white text-lg placeholder:text-text-secondary/50 focus:outline-none transition-all ${
            urlValid === true
              ? 'border-success focus:border-success'
              : urlValid === false
              ? 'border-danger focus:border-danger'
              : 'border-border-color focus:border-primary'
          }`}
          disabled={loading}
        />
        {urlValid === true && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <CheckCircle size={20} className="text-success" />
          </motion.div>
        )}
      </div>

      {/* Email Input */}
      <div className="relative mb-4">
        <input
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="votre@email.com — Recevoir les résultats"
          className={`w-full px-4 py-3 bg-card-bg border-2 rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none transition-all text-sm ${
            emailValid === true
              ? 'border-success/50 focus:border-success'
              : emailValid === false
              ? 'border-danger/50 focus:border-danger'
              : 'border-border-color focus:border-primary'
          }`}
          disabled={loading}
        />
      </div>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-danger text-sm mb-3 text-center"
        >
          {error}
        </motion.p>
      )}

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className="relative overflow-hidden w-full py-4 bg-primary hover:bg-primary-hover text-white font-semibold text-lg rounded-full transition-all btn-glow flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {!loading && (
          <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
        )}
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Analyse en cours...
          </>
        ) : (
          <span className="relative z-10 inline-flex items-center gap-2">
            Scanner Gratuitement
            <ArrowRight size={20} />
          </span>
        )}
      </motion.button>

      {/* Trust badges */}
      <p className="text-success text-xs text-center mt-3 font-medium">
        ✓ Gratuit · ✓ Sans inscription · ✓ Résultats en quelques minutes
      </p>
    </motion.form>
  );
}
