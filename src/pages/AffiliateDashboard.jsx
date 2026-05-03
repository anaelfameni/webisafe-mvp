import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, MousePointer, ShoppingCart, Percent, Wallet, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function AffiliateDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refCode = new URLSearchParams(window.location.search).get('code');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (!refCode) {
      setLoading(false);
      setError('Aucun code affilié fourni. Utilisez ?code=VOTRE_CODE dans l\'URL.');
      return;
    }

    async function loadStats() {
      try {
        const [clicksRes, conversionsRes, affiliateRes] = await Promise.all([
          supabase.from('affiliate_clicks')
            .select('*', { count: 'exact', head: true })
            .eq('ref_code', refCode),

          supabase.from('affiliate_conversions')
            .select('commission_fcfa, paid, created_at')
            .eq('ref_code', refCode),

          supabase.from('affiliates')
            .select('name, created_at')
            .eq('ref_code', refCode)
            .single()
        ]);

        if (affiliateRes.error && affiliateRes.error.code !== 'PGRST116') {
          setError('Affilié introuvable ou problème de connexion.');
          setLoading(false);
          return;
        }

        const conversions = conversionsRes.data || [];
        const totalCommission = conversions.reduce((sum, c) => sum + (c.commission_fcfa || 0), 0);
        const pendingPayout = conversions.filter(c => !c.paid).reduce((sum, c) => sum + (c.commission_fcfa || 0), 0);
        const clicks = clicksRes.count || 0;
        const conversionsCount = conversions.length;

        setStats({
          name: affiliateRes.data?.name || 'Affilié',
          link: `https://webisafe.ci/?ref=${refCode}`,
          clicks,
          conversions: conversionsCount,
          totalCommission,
          pendingPayout,
          conversionRate: clicks > 0 ? ((conversionsCount / clicks) * 100).toFixed(1) : 0,
          since: affiliateRes.data?.created_at
        });
      } catch (err) {
        setError('Erreur lors du chargement des statistiques.');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [refCode]);

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

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 bg-dark-navy">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard Affiliation</h1>
          <p className="text-text-secondary text-sm mb-8">Bonjour {stats.name} — voici vos performances.</p>

          <div className="bg-card-bg border border-border-color rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link size={18} className="text-primary flex-shrink-0" />
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
