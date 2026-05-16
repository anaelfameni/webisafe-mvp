import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link as LinkIcon, MousePointer, ShoppingCart, Percent, Wallet, ArrowLeft, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AffiliateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // V.1 — Auth Supabase obligatoire ; on récupère le token pour l'API.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setError('Connexion requise pour accéder à votre dashboard affiliation.');
      return;
    }

    let cancelled = false;
    async function loadStats() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) {
          if (!cancelled) {
            setError('Session expirée. Reconnectez-vous.');
            setLoading(false);
          }
          return;
        }

        const response = await fetch('/api/affiliate-stats', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (!response.ok) {
          setError(payload?.error || 'Affilié introuvable ou problème de connexion.');
          setLoading(false);
          return;
        }

        setStats(payload.stats);
      } catch (err) {
        if (!cancelled) setError('Erreur lors du chargement des statistiques.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStats();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  const statCards = [
    { icon: <MousePointer size={18} />, label: 'Clics', value: stats?.clicks ?? 0, color: 'text-primary' },
    { icon: <ShoppingCart size={18} />, label: 'Ventes', value: stats?.conversions ?? 0, color: 'text-success' },
    { icon: <Percent size={18} />, label: 'Taux conv.', value: `${stats?.conversionRate ?? 0}%`, color: 'text-amber-400' },
    { icon: <Wallet size={18} />, label: 'À recevoir', value: `${(stats?.pendingPayout ?? 0).toLocaleString()} FCFA`, color: 'text-emerald-400' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-navy">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary text-sm">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-28 pb-20 px-4 bg-dark-navy">
        <div className="max-w-md mx-auto text-center">
          <p className="text-danger mb-4">{error}</p>
          <a href="/partenaire" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
            <ArrowLeft size={16} /> Devenir affilié
          </a>
        </div>
      </div>
    );
  }

  const dailyClicks = stats?.dailyClicks ?? [];
  const maxDailyClicks = dailyClicks.reduce((max, d) => Math.max(max, d.clicks), 0) || 1;

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 bg-dark-navy">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard Affiliation</h1>
          <p className="text-text-secondary text-sm mb-8">Bonjour {stats.name} — voici vos performances.</p>

          <div className="bg-card-bg border border-border-color rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <LinkIcon size={18} className="text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-text-secondary text-xs mb-1">Votre lien à partager</p>
              <code className="text-white text-sm font-mono break-all">{stats.link}</code>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(stats.link)}
              className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg border border-primary/20 transition flex-shrink-0"
            >
              Copier
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card-bg border border-border-color rounded-2xl p-5 text-center"
              >
                <div className={`mx-auto w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3 ${card.color}`}>
                  {card.icon}
                </div>
                <p className="text-2xl font-black text-white mb-1">{card.value}</p>
                <p className="text-text-secondary/60 text-xs">{card.label}</p>
              </motion.div>
            ))}
          </div>

          {/* V.3 — Activité 30 derniers jours */}
          <div className="bg-card-bg border border-border-color rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-primary" />
              <h2 className="text-white font-semibold text-sm">Activité sur 30 jours</h2>
            </div>
            {dailyClicks.length === 0 ? (
              <p className="text-text-secondary/60 text-xs">Aucun clic enregistré sur les 30 derniers jours.</p>
            ) : (
              <div className="flex items-end gap-1 h-24" role="img" aria-label="Graphique des clics quotidiens sur 30 jours">
                {dailyClicks.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col justify-end" title={`${d.date} — ${d.clicks} clic${d.clicks > 1 ? 's' : ''}`}>
                    <div
                      className="w-full bg-primary/40 hover:bg-primary/70 transition-colors rounded-t"
                      style={{ height: `${(d.clicks / maxDailyClicks) * 100}%`, minHeight: d.clicks > 0 ? '2px' : '0' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card-bg border border-border-color rounded-2xl p-5">
              <p className="text-text-secondary/60 text-xs mb-1">Commission totale générée</p>
              <p className="text-2xl font-bold text-white">{(stats.totalCommission ?? 0).toLocaleString()} FCFA</p>
            </div>
            <div className="bg-card-bg border border-border-color rounded-2xl p-5">
              <p className="text-text-secondary/60 text-xs mb-1">Membre depuis</p>
              <p className="text-2xl font-bold text-white">{stats.since ? new Date(stats.since).toLocaleDateString('fr-FR') : '—'}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
