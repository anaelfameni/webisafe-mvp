import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function RecommendationCard({ recommendation, index, isLocked }) {
  const priorityConfig = {
    CRITIQUE: { color: 'bg-danger', textColor: 'text-danger', borderColor: 'border-danger/30', label: '🔴 URGENT' },
    IMPORTANT: { color: 'bg-warning', textColor: 'text-warning', borderColor: 'border-warning/30', label: '🟠 IMPORTANT' },
    AMELIORATION: { color: 'bg-success', textColor: 'text-success', borderColor: 'border-success/30', label: '🟢 AMÉLIORATION' },
  };

  const config = priorityConfig[recommendation.priority] || priorityConfig.IMPORTANT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-card-bg border ${config.borderColor} rounded-2xl p-5 relative overflow-hidden`}
    >
      {isLocked && (
        <div className="absolute inset-0 bg-card-bg/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center p-4">
            <Lock size={24} className="text-white mx-auto mb-2" />
            <p className="text-white text-sm">Contenu premium</p>
          </div>
        </div>
      )}

      {/* Priority badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${config.color}/10 ${config.textColor}`}>
          {config.label}
        </span>
        <span className="text-white text-xs">{recommendation.difficulty} · {recommendation.time}</span>
      </div>

      {/* Title */}
      <h4 className="text-white font-semibold mb-2">{recommendation.title}</h4>

      {/* Description */}
      <p className="text-white text-sm mb-3 leading-relaxed">
        {recommendation.description || recommendation.impact}
      </p>

      {/* Impact */}
      {recommendation.impactBusiness && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
          <p className="text-primary text-sm font-medium">
            💡 {recommendation.impactBusiness}
          </p>
        </div>
      )}

      {/* Action */}
      <div className="flex items-start gap-2">
        <span className="text-success mt-0.5">→</span>
        <p className="text-text-primary text-sm">{recommendation.action}</p>
      </div>
    </motion.div>
  );
}
