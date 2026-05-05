import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const SEVERITY_STYLE = {
  critical: 'bg-red-500/15 border-red-500/40 text-red-300',
  high: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
  warning: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200',
};

const SEVERITY_ICON = {
  critical: '🚨',
  high: '⚠️',
  warning: '🌍',
};

const SEVERITY_LABEL = {
  critical: 'Alerte critique',
  high: 'Alerte élevée',
  warning: 'Avertissement',
};

export default function CriticalAlertsBanner({ alerts }) {
  const [dismissed, setDismissed] = useState([]);

  if (!Array.isArray(alerts) || alerts.length === 0) return null;

  const visible = alerts.filter((_, i) => !dismissed.includes(i));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-3 mb-8" role="region" aria-label="Alertes critiques">
      <AnimatePresence>
        {alerts.map((alert, i) => {
          if (dismissed.includes(i)) return null;
          const style = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.warning;
          const icon = SEVERITY_ICON[alert.severity] ?? '⚠️';
          const label = SEVERITY_LABEL[alert.severity] ?? 'Avertissement';

          return (
            <motion.div
              key={`${alert.title}-${i}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex items-start gap-3 p-4 rounded-xl border ${style}`}
              role="alert"
              aria-live="polite"
            >
              <span className="text-xl flex-shrink-0" aria-hidden="true">
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  <span className="sr-only">{label} : </span>
                  {alert.title}
                </p>
                {alert.message && (
                  <p className="text-white/70 text-xs mt-0.5">{alert.message}</p>
                )}
                {alert.impact && (
                  <p className="text-white/50 text-xs mt-0.5">Impact : {alert.impact}</p>
                )}
                {alert.recommendation && (
                  <p className="text-white/50 text-xs mt-0.5">Conseil : {alert.recommendation}</p>
                )}
              </div>
              <button
                onClick={() => setDismissed((d) => [...d, i])}
                className="flex-shrink-0 text-white/30 hover:text-white/70 transition-colors"
                aria-label={`Fermer l'alerte : ${alert.title}`}
                type="button"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
