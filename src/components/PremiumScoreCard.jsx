import ScoreGaugeChart from './ScoreGaugeChart';

export default function PremiumScoreCard({ score, ctaButton, compact = false, badgeLiftMobile = false }) {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={`relative w-full ${compact ? 'max-w-2xl' : 'max-w-4xl'} mx-auto mb-12`}>
      <div
        className={`bg-gradient-to-br from-[#0d1530] via-[#111827] to-[#0d1530] border border-white/5 rounded-[28px] ${
          compact ? 'p-6 sm:p-8' : 'p-8 sm:p-12'
        } shadow-2xl relative w-full flex flex-col items-center`}
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[radial-gradient(circle,_rgba(99,179,237,0.06)_0%,_transparent_70%)] pointer-events-none" />

        <div className={`flex ${compact ? 'flex-col items-center' : 'flex-col md:flex-row'} items-center justify-between ${compact ? 'gap-6' : 'gap-8 md:gap-16'} w-full z-10`}>
          <ScoreGaugeChart score={score} compact={compact} showLegend={!compact} badgeLiftMobile={badgeLiftMobile} />

          {!compact && (
            <div className="flex flex-col gap-2.5 w-full md:w-1/2 z-10">
              {[
                { range: '0-30', label: 'CRITIQUE', desc: 'Action urgente requise', color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.4)' },
                { range: '30-50', label: 'MAUVAIS', desc: 'Corrections necessaires', color: '#f97316', glowColor: 'rgba(249, 115, 22, 0.4)' },
                { range: '50-75', label: 'ACCEPTABLE', desc: 'Ameliorations recommandees', color: '#eab308', glowColor: 'rgba(234, 179, 8, 0.4)' },
                { range: '75-90', label: 'BON', desc: 'Optimisations mineures', color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.4)' },
                { range: '90-100', label: 'EXCELLENT', desc: 'Site tres bien protege', color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.4)' },
              ].map((seg) => {
                const isActive =
                  (score >= 0 && score < 30 && seg.label === 'CRITIQUE') ||
                  (score >= 30 && score < 50 && seg.label === 'MAUVAIS') ||
                  (score >= 50 && score < 75 && seg.label === 'ACCEPTABLE') ||
                  (score >= 75 && score < 90 && seg.label === 'BON') ||
                  (score >= 90 && seg.label === 'EXCELLENT');

                return (
                  <div
                    key={seg.label}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      isActive
                        ? 'scale-[1.02]'
                        : 'hover:bg-white/[0.06] hover:border-white/10 hover:translate-x-1 bg-white/[0.03] border-white/[0.05]'
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: `${seg.color}20`,
                            borderColor: `${seg.color}50`,
                            boxShadow: `0 0 15px ${seg.glowColor}`,
                          }
                        : {}
                    }
                  >
                    <div
                      className="w-3 h-3 rounded shrink-0"
                      style={{
                        backgroundColor: seg.color,
                        opacity: isActive ? 1 : 0.5,
                        boxShadow: isActive ? `0 0 8px ${seg.glowColor}` : 'none',
                      }}
                    />
                    <span className={`text-xs font-medium w-[52px] shrink-0 tabular-nums ${isActive ? 'text-white/80' : 'text-white/35'}`}>
                      {seg.range}
                    </span>
                    <span className={`text-[13px] font-bold flex-1 tracking-wide ${isActive ? 'text-white' : 'text-white/75'}`}>
                      {seg.label}
                    </span>
                    <span className={`text-[11px] text-right hidden sm:block ${isActive ? 'text-white/70 font-medium' : 'text-white/30'}`}>
                      {seg.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-10 mt-4 mb-4" />

        <div className="flex items-center justify-between w-full z-10">
          <span className="text-xs text-white/25">webisafe.ci · Analyse complète</span>
          <span className="text-xs text-white/20">Analysé le {formattedDate}</span>
        </div>

        {ctaButton && <div className="mt-8 w-full flex justify-center z-10">{ctaButton}</div>}
      </div>
    </div>
  );
}
