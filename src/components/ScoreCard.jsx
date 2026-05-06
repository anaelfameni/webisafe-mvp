import { motion } from 'framer-motion';
import { getScoreColor, getScoreBadge } from '../utils/calculateScore';
import { ChevronRight, Lock } from 'lucide-react';

export default function ScoreCard({ title, icon, score, metrics, isPaid, onViewDetails, extra }) {
  const isNull = score === null;
  const safeScore = isNull ? 0 : (score ?? 0);
  const color = isNull ? '#6b7280' : getScoreColor(safeScore);
  const badge = isNull
    ? { text: 'Partiel', color: 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' }
    : getScoreBadge(safeScore);
  const progressWidth = isNull ? '0%' : `${safeScore}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card-bg border border-border-color rounded-2xl p-5 card-hover"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="text-white font-semibold text-sm">{title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
              {badge.text}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold" style={{ color }}>
            {isNull ? '—' : (score ?? 'N/A')}
          </span>
          {!isNull && score != null && <span className="text-white text-sm">/100</span>}
        </div>
      </div>

      {/* Barre de progression */}
      <div className="h-2 bg-dark-navy rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: progressWidth }}
          transition={{ duration: isNull ? 0 : 1, delay: 0.3, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      {isNull && (
        <p className="text-xs text-white/40 mb-3">
          Scan partiel — ce score est indisponible car une protection anti-bot a été détectée.
        </p>
      )}

      {/* Métriques */}
      <div className="space-y-2.5">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span className="text-white">{metric.label}</span>
            <div className="flex items-center gap-2">
              {index >= 2 && !isPaid ? (
                <span className="premium-blur text-white">{metric.value}</span>
              ) : (
                <span className="text-text-primary">{metric.value}</span>
              )}
              {metric.status && (
                <span>
                  {metric.status === 'pass' ? '✅' : metric.status === 'warn' ? '⚠️' : metric.status === 'unknown' ? '—' : '❌'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Extra (headers manquants, issues UX, géo...) */}
      {extra && <div className="mt-3 pt-3 border-t border-white/5">{extra}</div>}

      {/* Bouton détails */}
      <button
        onClick={onViewDetails}
        className="flex items-center gap-1 mt-4 text-primary text-sm font-medium hover:gap-2 transition-all"
      >
        {isPaid ? (
          <>Voir détails <ChevronRight size={16} /></>
        ) : (
          <><Lock size={14} /> Voir détails <ChevronRight size={16} /></>
        )}
      </button>
    </motion.div>
  );
}