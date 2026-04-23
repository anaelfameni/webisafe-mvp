import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function FreemiumGate({ isOpen, onClose, onUnlock, scanId }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('capture'); // 'capture' | 'payment'

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast.error('Email invalide');
      return;
    }
    setLoading(true);
    try {
      // Inscription sans mot de passe (magic link optionnel plus tard)
      const { error } = await supabase
        .from('scans')
        .update({ email })
        .eq('id', scanId);

      if (error) throw error;

      // Afficher les résultats complets gratuitement
      // (l'email est capturé, c'est déjà de la valeur pour toi)
      onUnlock(email);
      toast.success('Rapport complet débloqué !');
    } catch (err) {
      toast.error('Erreur, réessayez');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    '4 analyses complètes (Performance, Sécurité, SEO, UX)',
    'Recommandations priorisées par impact',
    'Estimation du coût de correction en FCFA',
    'Plan d\'action 90 jours généré par IA',
    'Rapport PDF téléchargeable (6 pages)',
  ];

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
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-[#0d1b2a] border border-white/10 rounded-3xl p-8 max-w-lg w-full relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={28} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Débloquez le rapport complet
              </h2>
              <p className="text-white/60 text-sm">
                Entrez votre email pour recevoir le rapport complet gratuitement
              </p>
            </div>

            {/* Features list */}
            <ul className="space-y-3 mb-6">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                  <Check size={16} className="text-green-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {/* Email capture form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-primary"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary/20"
              >
                {loading ? 'Chargement...' : 'Voir le rapport complet gratuit →'}
              </button>
            </form>

            <p className="text-white/30 text-xs text-center mt-3">
              Aucun spam. Pas de carte bancaire. Vous pouvez vous désabonner à tout moment.
            </p>

            {/* Option payante en dessous */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-white/50 text-xs text-center mb-3">
                Vous voulez le rapport PDF + 1 rescan dans 30 jours ?
              </p>
              <button
                onClick={() => setStep('payment')}
                className="w-full py-3 border border-primary/50 text-primary hover:bg-primary/10 font-medium rounded-xl transition-all duration-200 text-sm"
              >
                Passer au rapport complet payant — 35 000 FCFA
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
