import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Check } from 'lucide-react';

export default function WaveCheckoutModal({
  isOpen,
  onClose,
  onPay,
  scanUrl = '',
  globalScore = 0,
  initialEmail = '',
  amount = 35000,
}) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setEmailError('');
      setLoading(false);
    }
  }, [isOpen, initialEmail]);

  const handleSubmit = async () => {
    setEmailError('');
    if (!email || !email.includes('@') || !email.includes('.')) {
      setEmailError('Veuillez entrer un email valide.');
      return;
    }
    try {
      setLoading(true);
      await onPay(email);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'PDF professionnel',
    '25+ métriques détaillées',
    "Plan d'action priorisé",
    '1 rescan gratuit dans 30 jours',
  ];

  // Tronque l'URL pour l'affichage
  const displayUrl = scanUrl.length > 32
    ? scanUrl.replace(/^https?:\/\//, '').slice(0, 29) + '...'
    : scanUrl;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="bg-[#141e2e] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <h2 className="text-white font-semibold text-xl">Obtenir le rapport complet</h2>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white/80 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6">
              {/* Résumé scan */}
              <div className="bg-[#0d1520] border border-white/5 rounded-2xl px-5 py-4 mb-5">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-white/60 text-sm">Site analysé</span>
                  <span className="text-blue-400 text-sm font-medium">{displayUrl}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-white/60 text-sm">Score global</span>
                  <span className="text-white font-bold text-xl">{globalScore}/100</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-white/60 text-sm">Rapport complet</span>
                  <span className="text-white font-bold text-xl">
                    {amount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Champ email */}
              <div className="mb-5">
                <label className="text-white/70 text-sm mb-2 block">
                  Email pour recevoir le rapport
                </label>
                <div className={`flex items-center gap-3 rounded-xl border ${emailError ? 'border-red-500/60' : 'border-white/10'} bg-[#0d1520] px-4 py-3`}>
                  <Mail size={17} className="text-white/30 shrink-0" />
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-full bg-transparent outline-none text-white placeholder-white/30 text-sm"
                  />
                </div>
                {emailError && (
                  <p className="text-red-400 text-xs mt-1.5">{emailError}</p>
                )}
              </div>

              {/* Inclus */}
              <div className="mb-6">
                <p className="text-white/60 text-sm mb-3">Ce rapport comprend :</p>
                <ul className="space-y-2.5">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/85">
                      <Check size={16} className="text-green-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bouton paiement Wave */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-white font-semibold text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                {/* Icône Wave custom (SVG inline simple) */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <rect width="24" height="24" rx="6" fill="#1d9bf0" />
                  <path d="M5 14c1-3 2-5 4-5s3 4 5 4 3-4 5-2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                {loading ? 'Redirection en cours...' : `Payer ${amount.toLocaleString('fr-FR')} FCFA via Wave`}
              </button>

              {/* Sécurité */}
              <div className="mt-4 text-center">
                <p className="text-white/35 text-xs">🔒 Paiement sécurisé via Wave</p>
              </div>

              {/* Badge Wave */}
              <div className="flex justify-center mt-3">
                <span className="bg-[#0d1520] border border-white/5 rounded-lg px-4 py-1.5 text-white/70 text-xs font-medium">
                  Wave
                </span>
              </div>

              <p className="text-center text-white/25 text-xs mt-4 leading-relaxed">
                Rapport envoyé par email après confirmation du paiement.<br />
                Aucun remboursement après génération du rapport.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}