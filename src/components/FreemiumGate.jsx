import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, ArrowRight } from 'lucide-react';

export default function FreemiumGate({ isOpen, onClose, onUpgrade, scanData }) {
  if (!isOpen) return null;

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
            onClick={(e) => e.stopPropagation()}
            className="bg-card-bg border border-border-color rounded-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border-color">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-primary" />
                <h3 className="text-lg font-bold text-white">Contenu Premium</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-white hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview flou */}
            <div className="p-5">
              <div className="bg-dark-navy rounded-xl p-4 mb-5 relative overflow-hidden">
                <div className="premium-blur">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Content-Security-Policy</span>
                      <span className="text-danger text-sm">❌ Absent</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">X-Frame-Options</span>
                      <span className="text-danger text-sm">❌ Absent</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">HSTS</span>
                      <span className="text-danger text-sm">❌ Absent</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Permissions-Policy</span>
                      <span className="text-warning text-sm">⚠️ Partiel</span>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-card-bg/90 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
                    <Lock size={24} className="text-primary mx-auto mb-2" />
                    <p className="text-white text-sm font-medium">Détails verrouillés</p>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="text-center mb-6">
                <p className="text-white font-semibold mb-1">
                  Ce rapport contient {scanData?.recommendations?.length || 12} recommandations détaillées
                </p>
                <p className="text-white text-sm">
                  Débloquez l'accès complet pour corriger tous les problèmes identifiés sur votre site
                </p>
              </div>

              {/* Inclus */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
                <p className="text-primary text-sm font-medium mb-2">Le rapport complet inclut :</p>
                <ul className="text-white text-sm space-y-1.5">
                  <li>✅ PDF professionnel de 6 pages</li>
                  <li>✅ 25+ métriques détaillées avec explications</li>
                  <li>✅ Plan d'action priorisé en 3 étapes</li>
                  <li>✅ 1 rescan gratuit dans 30 jours</li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  onClick={onUpgrade}
                  className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 btn-glow"
                >
                  Obtenir le rapport — 35 000 FCFA
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 text-white hover:text-white text-sm transition-colors"
                >
                  Continuer avec la version gratuite
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
