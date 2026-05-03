import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

// Adapté au nouveau format de recommandation :
// { priorite, categorie, action, explication, impact, difficulte, temps }
// ET à l'ancien format :
// { priority, title, description, impactBusiness, action, difficulty, time }

function getCategorieStyle(categorie) {
  const cat = String(categorie || '').toLowerCase();
  if (cat.includes('sécurité') || cat.includes('securite')) {
    return {
      borderColor: 'border-red-500/30',
      badgeBg: 'bg-red-500/10',
      badgeText: 'text-red-400',
      dot: 'bg-red-500',
    };
  }
  if (cat.includes('performance')) {
    return {
      borderColor: 'border-blue-500/30',
      badgeBg: 'bg-blue-500/10',
      badgeText: 'text-blue-400',
      dot: 'bg-blue-500',
    };
  }
  if (cat.includes('seo')) {
    return {
      borderColor: 'border-purple-500/30',
      badgeBg: 'bg-purple-500/10',
      badgeText: 'text-purple-400',
      dot: 'bg-purple-500',
    };
  }
  if (cat.includes('ux') || cat.includes('mobile')) {
    return {
      borderColor: 'border-green-500/30',
      badgeBg: 'bg-green-500/10',
      badgeText: 'text-green-400',
      dot: 'bg-green-500',
    };
  }
  return {
    borderColor: 'border-warning/30',
    badgeBg: 'bg-warning/10',
    badgeText: 'text-warning',
    dot: 'bg-warning',
  };
}

function getPrioriteLabel(priorite) {
  const p = Number(priorite);
  if (p === 1) return '🔴 Priorité critique';
  if (p === 2) return '🟠 Priorité haute';
  if (p <= 4) return '🟡 Priorité moyenne';
  return '🟢 Amélioration';
}

// Compat ancien format
function getPriorityConfig(priority) {
  const configs = {
    CRITIQUE: { borderColor: 'border-danger/30', badgeBg: 'bg-danger/10', badgeText: 'text-danger', dot: 'bg-danger', label: '🔴 URGENT' },
    IMPORTANT: { borderColor: 'border-warning/30', badgeBg: 'bg-warning/10', badgeText: 'text-warning', dot: 'bg-warning', label: '🟠 IMPORTANT' },
    AMELIORATION: { borderColor: 'border-success/30', badgeBg: 'bg-success/10', badgeText: 'text-success', dot: 'bg-success', label: '🟢 AMÉLIORATION' },
  };
  return configs[priority] ?? configs.IMPORTANT;
}

export default function RecommendationCard({ recommendation, index, isLocked }) {
  if (!recommendation) return null;

  // Détection du format : nouveau (action/explication/priorite) ou ancien (title/description/priority)
  const isNewFormat = recommendation.action !== undefined && recommendation.explication !== undefined;

  if (isNewFormat) {
    // ── Nouveau format ──────────────────────────────────────────────────────
    const style = getCategorieStyle(recommendation.categorie);
    const prioriteLabel = getPrioriteLabel(recommendation.priorite);
    const difficulte = String(recommendation.difficulte || '').split(':')[0].trim();
    const temps = String(recommendation.temps || '');
    const roiLabel = (Number(recommendation.priorite) <= 2) ? 'ROI élevé' : (Number(recommendation.priorite) <= 4 ? 'ROI moyen' : 'ROI faible');

    // Mask sensitive content for critical recommendations (server-side criticals)
    const maskSensitive = isLocked && Boolean(recommendation._mask_sensitive || recommendation.maskSensitive || recommendation.priorite === 1 || recommendation.priority === 'CRITIQUE');

    if (maskSensitive) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.08, 0.5) }}
          className={`bg-card-bg border ${style.borderColor} rounded-2xl p-5 relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${style.badgeBg} ${style.badgeText}`}>
              {recommendation.categorie}
            </span>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-600/10 text-red-300">🔴 Urgent</span>
          </div>
          <h4 className="text-white font-semibold text-sm mb-2">Problème critique détecté</h4>
          <p className="text-text-secondary text-sm mb-3 leading-relaxed">
            La nature exacte de cette faille est masquée pour des raisons de sécurité. Elle peut impacter directement la confiance ou les revenus de votre site. Débloquez le rapport complet pour obtenir la liste détaillée et le plan de correction priorisé.
          </p>
          <div className="mt-3">
            <button className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold">Obtenir le rapport complet</button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.08, 0.5) }}
        className={`bg-card-bg border ${style.borderColor} rounded-2xl p-5 relative overflow-hidden`}
      >
        {isLocked && (
          <div className="absolute inset-0 bg-card-bg/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="text-center p-4">
              <Lock size={24} className="text-white mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Audit premium</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${style.badgeBg} ${style.badgeText}`}>
              {recommendation.categorie}
            </span>
            <span className="text-white/50 text-xs">{prioriteLabel}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/5 text-white/80">{roiLabel}</span>
          </div>
        </div>

        {/* Action (titre de la recommandation) */}
        <h4 className="text-white font-semibold text-sm mb-2 leading-snug">
          {recommendation.action}
        </h4>

        {/* Explication (texte simple pour le client) */}
        {recommendation.explication && (
          <p className="text-text-secondary text-sm mb-3 leading-relaxed">
            {recommendation.explication}
          </p>
        )}

        {/* Impact */}
        {recommendation.impact && (
          <div className={`${style.badgeBg} border ${style.borderColor} rounded-lg px-3 py-2`}>
            <p className={`${style.badgeText} text-xs font-medium`}>
              Impact : {recommendation.impact}
            </p>
          </div>
        )}
      </motion.div>
    );
  }

  // ── Ancien format (compat) ────────────────────────────────────────────────
  const config = getPriorityConfig(recommendation.priority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.08, 0.5) }}
      className={`bg-card-bg border ${config.borderColor} rounded-2xl p-5 relative overflow-hidden`}
    >
      {isLocked && (
        <div className="absolute inset-0 bg-card-bg/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <div className="text-center p-4">
            <Lock size={24} className="text-white mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Audit premium</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${config.badgeBg} ${config.badgeText}`}>
          {config.label}
        </span>
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/5 text-white/80">
          {recommendation.priority === 'CRITIQUE' ? 'ROI élevé' : (recommendation.priority === 'IMPORTANT' ? 'ROI moyen' : 'ROI faible')}
        </span>
      </div>

      <h4 className="text-white font-semibold mb-2 text-sm">
        {recommendation.title}
      </h4>

      <p className="text-text-secondary text-sm mb-3 leading-relaxed">
        {recommendation.description || recommendation.impact}
      </p>

      {recommendation.impactBusiness && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
          <p className="text-primary text-sm font-medium">
            💡 {recommendation.impactBusiness}
          </p>
        </div>
      )}

      {recommendation.action && (
        <div className="flex items-start gap-2">
          <span className="text-success mt-0.5 flex-shrink-0">→</span>
          <p className="text-text-secondary text-sm">{recommendation.action}</p>
        </div>
      )}
    </motion.div>
  );
}