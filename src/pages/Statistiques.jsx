import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Globe, Activity, Server, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Statistiques() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d);
        } else {
          setError(d.error || 'Erreur');
        }
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const stats = data?.stats;
  const recent = data?.recent_scans ?? [];

  const getScoreColor = (s) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-blue-400';
    if (s >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-white/60 hover:text-primary text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Retour à l'accueil
        </button>

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Webisafe Africa Stats
          </h1>
          <p className="text-white/60 text-lg">
            Les données du web africain, en temps réel.
          </p>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Chargement des statistiques...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Cartes statistiques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <StatCard
                icon={<Activity size={24} />}
                label="Sites analysés"
                value={stats.total_scans.toLocaleString('fr-FR')}
                sub="Depuis le lancement"
              />
              <StatCard
                icon={<BarChart3 size={24} />}
                label="Score moyen"
                value={`${stats.avg_score}/100`}
                sub="Tous pays confondus"
                color={getScoreColor(stats.avg_score)}
              />
              <StatCard
                icon={<Globe size={24} />}
                label="Pays couverts"
                value={stats.countries_count}
                sub="Afrique francophone"
              />
              <StatCard
                icon={<Server size={24} />}
                label="CMS dominant"
                value={stats.top_cms?.[0]?.name ?? '—'}
                sub={`${stats.top_cms?.[0]?.count ?? 0} sites`}
              />
            </div>

            {/* Top CMS */}
            {stats.top_cms?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card-bg border border-border-color rounded-2xl p-6 mb-10"
              >
                <h2 className="text-xl font-bold text-white mb-4">
                  Répartition des CMS détectés
                </h2>
                <div className="space-y-3">
                  {stats.top_cms.map((cms, i) => {
                    const max = stats.top_cms[0].count;
                    const pct = Math.round((cms.count / max) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-white/80 text-sm w-28 truncate">{cms.name}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-white/60 text-sm w-12 text-right">{cms.count}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Feed récent */}
            {recent.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card-bg border border-border-color rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold text-white mb-4">
                  Derniers scans publics
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/40 text-left border-b border-white/10">
                        <th className="pb-3 font-medium">Domaine</th>
                        <th className="pb-3 font-medium">Pays</th>
                        <th className="pb-3 font-medium">CMS</th>
                        <th className="pb-3 font-medium text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recent.map((scan, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 text-white/80">{scan.domain}</td>
                          <td className="py-3 text-white/60">{scan.country}</td>
                          <td className="py-3 text-white/60">{scan.cms ?? '—'}</td>
                          <td className={`py-3 text-right font-semibold ${getScoreColor(scan.score)}`}>
                            {scan.score ?? '—'}/100
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <p className="text-center text-white/30 text-xs mt-8">
              Données anonymisées. Aucune information privée n'est exposée.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card-bg border border-border-color rounded-2xl p-5"
    >
      <div className="text-primary mb-3">{icon}</div>
      <div className={`text-2xl font-bold ${color || 'text-white'} mb-1`}>{value}</div>
      <div className="text-white/80 text-sm font-medium">{label}</div>
      <div className="text-white/40 text-xs mt-1">{sub}</div>
    </motion.div>
  );
}
