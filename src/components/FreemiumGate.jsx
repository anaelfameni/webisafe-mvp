import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, X } from 'lucide-react';

export default function FreemiumGate({ isOpen, onClose, onUnlock, onUpgrade, scanData }) {
  const recommendationCount = scanData?.recommendations?.length ?? 7;

  const features = [
    'PDF professionnel',
    '25+ métriques détaillées avec explications',
    "Plan d'action priorisé en 3 étapes",
    '1 rescan gratuit dans 30 jours',
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
                <span className="text-white font-semibold text-lg">Contenu Premium</span>
              </div>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white/80 transition-colors"
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
                  onClose();
                  onUpgrade();
                }}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                Obtenir le rapport — 35 000 FCFA →
              </button>

              {/* Lien secondaire */}
              <button
                onClick={onClose}
                className="w-full mt-4 text-white/50 hover:text-white/80 transition-colors text-sm text-center"
              >
                Continuer avec la version gratuite
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}