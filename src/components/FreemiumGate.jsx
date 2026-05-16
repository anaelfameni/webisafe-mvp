import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, X, Clock, Mail, Loader2 } from 'lucide-react';

export default function FreemiumGate({ isOpen, onClose, onUnlock, onUpgrade, scanData, scannedUrl }) {
  const recommendationCount = scanData?.recommendations?.length ?? 7;

  const features = [
    'PDF professionnel',
    '25+ métriques détaillées avec explications',
    "Plan d'action de corrections",
    '1 rescan gratuit dans 30 jours',
  ];

  // I.2 — État du formulaire "Me rappeler dans 24h"
  const [remindMode, setRemindMode] = useState(false);
  const [remindEmail, setRemindEmail] = useState('');
  const [remindLoading, setRemindLoading] = useState(false);
  const [remindError, setRemindError] = useState('');
  const [remindSent, setRemindSent] = useState(false);

  const handleRemindSubmit = async (event) => {
    event.preventDefault();
    setRemindError('');

    const email = remindEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRemindError('Adresse email invalide.');
      return;
    }

    setRemindLoading(true);
    try {
      const response = await fetch('/api/remind-later', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          url: scannedUrl || null,
          scanId: scanData?.scan_id || scanData?.id || null,
          source: 'freemium_gate',
        }),
      });

      if (!response.ok) {
        let message = 'Une erreur est survenue. Réessayez.';
        try {
          const payload = await response.json();
          if (payload?.error) message = payload.error;
        } catch {
          // ignore parse error
        }
        setRemindError(message);
        return;
      }
      setRemindSent(true);
    } catch {
      setRemindError('Réseau indisponible. Réessayez plus tard.');
    } finally {
      setRemindLoading(false);
    }
  };

  const handleClose = () => {
    // Réinitialise le mode rappel à chaque fermeture
    setRemindMode(false);
    setRemindEmail('');
    setRemindError('');
    setRemindSent(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-blue-400" />
                <span className="text-white font-semibold text-lg">Audit Premium</span>
              </div>
              <button
                onClick={handleClose}
                className="text-white/40 hover:text-white/80 transition-colors"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6">
              {/* Aperçu flouté */}
              <div className="rounded-2xl bg-[#0d1520] border border-white/5 p-5 mb-6 relative overflow-hidden min-h-[110px]">
                <div className="blur-[3px] opacity-60 space-y-3">
                  {[['w-3/4', 'w-16'], ['w-2/3', 'w-12'], ['w-1/2', 'w-20'], ['w-3/5', 'w-10']].map(([l, r], i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className={`h-2.5 rounded bg-white/20 ${l}`} />
                      <div className={`h-2.5 rounded ${i < 2 ? 'bg-red-400/60' : i === 2 ? 'bg-red-400/60' : 'bg-green-400/50'} ${r}`} />
                    </div>
                  ))}
                </div>

                {/* Badge verrouillé centré */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-[#1e2d45] border border-white/10 rounded-2xl px-8 py-5 flex flex-col items-center shadow-xl">
                    <Lock size={22} className="text-blue-400 mb-2" />
                    <span className="text-white font-medium text-sm">Détails verrouillés</span>
                  </div>
                </div>
              </div>

              {/* Titre */}
              <div className="text-center mb-5">
                <h2 className="text-[22px] font-bold text-white leading-snug mb-2">
                  Ce rapport contient {recommendationCount} recommandations détaillées
                </h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  Débloquez l'accès complet pour corriger tous les problèmes identifiés
                  sur votre site
                </p>
              </div>

              {/* Liste features */}
              <div className="bg-[#0d1520] border border-white/5 rounded-2xl px-5 py-4 mb-6">
                <p className="text-blue-400 text-sm font-medium mb-3">Le rapport complet inclut :</p>
                <ul className="space-y-2.5">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/85">
                      <Check size={16} className="text-green-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA principal — ouvre AuthModal (signup) */}
              <button
                onClick={() => {
                  handleClose();
                  onUpgrade();
                }}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 relative overflow-hidden"
              >
                <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
                Obtenir le rapport : 35 000 FCFA
              </button>

              {/* I.2 — Option "Pas maintenant, me rappeler dans 24h" */}
              {!remindMode && !remindSent && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleClose}
                    className="py-3 rounded-2xl border border-white/10 text-white/85 hover:bg-white/5 font-medium text-sm transition-colors"
                  >
                    Version gratuite
                  </button>
                  <button
                    onClick={() => setRemindMode(true)}
                    className="py-3 rounded-2xl border border-white/10 text-white/85 hover:bg-white/5 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Clock size={14} className="text-blue-400" aria-hidden="true" />
                    Me rappeler 24h
                  </button>
                </div>
              )}

              {remindMode && !remindSent && (
                <form onSubmit={handleRemindSubmit} className="mt-4 space-y-3">
                  <label className="block text-white/70 text-xs" htmlFor="remind-email">
                    Votre email — nous vous renvoyons le rapport dans 24h, une seule fois.
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                      aria-hidden="true"
                    />
                    <input
                      id="remind-email"
                      type="email"
                      value={remindEmail}
                      onChange={(e) => setRemindEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      required
                      autoFocus
                      disabled={remindLoading}
                      className="w-full pl-10 pr-4 py-3 bg-[#0d1520] border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/60 transition-colors text-sm"
                    />
                  </div>
                  {remindError && (
                    <p className="text-rose-400 text-xs">{remindError}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRemindMode(false);
                        setRemindError('');
                      }}
                      disabled={remindLoading}
                      className="py-3 rounded-2xl border border-white/10 text-white/70 hover:bg-white/5 font-medium text-sm transition-colors"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={remindLoading}
                      className="py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {remindLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                          Envoi…
                        </>
                      ) : (
                        'Programmer'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {remindSent && (
                <div className="mt-4 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center">
                  <p className="text-emerald-300 font-semibold text-sm">
                    C'est noté.
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    Nous vous renvoyons votre rapport et l'offre demain à la même heure.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-3 text-blue-400 hover:underline text-xs font-medium"
                  >
                    Continuer la lecture du rapport gratuit
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}