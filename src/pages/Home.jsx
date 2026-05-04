import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLiveStats } from '../hooks/useLiveStats';
import { supabase } from '../lib/supabaseClient';
import { Zap, Shield, Search, Smartphone, ArrowRight, TrendingDown, Eye, Activity, Globe, Radio, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import URLInput from '../components/URLInput';
import PricingSection from '../components/PricingSection';
import FAQAccordion from '../components/FAQAccordion';
import ScoreGaugeChart from '../components/ScoreGaugeChart';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  return `il y a ${Math.floor(diff / 3600)}h`;
}

function getScoreColor(score) {
  if (score >= 70) return 'green';
  if (score >= 40) return 'amber';
  return 'red';
}

function getScoreBadgeClasses(score) {
  if (score >= 70) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (score >= 40) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (location.state?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state]);

  const normalizeUrl = (input) => {
    let normalized = input.trim();
    if (!normalized) return null;
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    try {
      new URL(normalized);
      return normalized;
    } catch {
      return null;
    }
  };

  const handleScan = async (url, email) => {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      toast.error('Entrez une URL valide (ex: monsite.ci)');
      return;
    }
    if (email) {
      try {
        await supabase.from('leads').upsert({
          email,
          url_scanned: normalized,
          source: 'scan_gratuit',
          created_at: new Date().toISOString()
        }, { onConflict: 'email,url_scanned' });
      } catch (_) {
        // Silencieux — ne bloque pas le scan
      }
    }
    const params = new URLSearchParams({ url: normalized });
    if (email) params.set('email', email);
    navigate(`/analyse?${params.toString()}`);
  };

  const problemCards = [
    {
      icon: '🐌',
      title: 'Site Lent',
      description: 'Un délai de 1 seconde = 7% de conversions perdues. Votre site fait-il fuir vos clients ?',
      statLabel: 'Baisse de trafic',
    },
    {
      icon: '🔒',
      title: 'Faille Sécurité',
      description: '73% des sites africains ont une vulnérabilité critique non détectée.',
      statLabel: 'Risques de perte de données',
    },
    {
      icon: '📉',
      title: 'SEO Invisible',
      description: 'Si Google ne vous trouve pas, vos clients non plus. Votre site est-il indexé correctement ?',
      statLabel: 'Perte de clients',
    },
  ];

  const solutionCards = [
    { icon: <Zap size={24} />, title: 'Performance', description: 'Votre site charge-t-il assez vite ? Un retard de 1 seconde = 7% de clients perdus.', color: 'text-warning' },
    { icon: <Shield size={24} />, title: 'Sécurité', description: 'Votre site est-il une cible facile ? 73% des sites africains ont une faille non détectée.', color: 'text-danger' },
    { icon: <Search size={24} />, title: 'SEO', description: 'Google vous trouve-t-il ? Un site invisible sur Google = zéro nouveau client organique.', color: 'text-success' },
    { icon: <Smartphone size={24} />, title: 'UX Mobile', description: 'Votre site fonctionne-t-il sur téléphone ? 78% de vos visiteurs sont sur mobile.', color: 'text-primary' },
  ];

  const { totalScans, activity, loading: liveLoading } = useLiveStats();

  const faqItems = [
    {
      question: "Comment Webisafe analyse-t-il mon site sans risque ?",
      answer:
        "Webisafe effectue uniquement des analyses passives à partir des éléments publics de votre site : performances, headers, balises, structure SEO et signaux d'expérience utilisateur. Nous ne modifions rien sur votre site et n'accédons à aucune donnée privée.",
    },
    {
      question: "Combien de temps dure l'analyse ?",
      answer:
        "L'analyse complète prend entre 30 et 90 secondes selon la taille de votre site et la vitesse de votre serveur. Vous recevez les résultats directement sur la page, en temps réel.",
    },
    {
      question: 'Mes données sont-elles sécurisées ?',
      answer:
        "Oui. Nous ne stockons pas le contenu de votre site. Seuls les résultats de l'audit sont conservés pour votre historique. Vos données ne sont jamais partagées avec des tiers.",
    },
    {
      question: 'Le rapport est-il en français ?',
      answer:
        "Oui, 100% en français. Toutes les recommandations sont rédigées dans un langage simple et actionnable, sans jargon technique. Chaque problème est expliqué avec son impact business et une solution pas à pas.",
    },
    {
      question: 'Quels paiements acceptez-vous ?',
      answer:
        'Nous acceptons le paiement via Wave. Envoyez 35 000 FCFA au +225 01 70 90 77 80 et votre rapport sera disponible dès que votre paiement sera confirmé.',
    },
  ];

  const animationProps = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 1.2, ease: 'easeOut' },
  };

  return (
    <div className="min-h-screen">
      <section id="hero" className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6"
          >
            <span className="text-sm">🌍</span>
            <span className="text-primary text-sm font-medium">
              Premier outil d'audit web d'Afrique francophone
            </span>
          </motion.div>

          <h1 className="sr-only">
            Auditez la sécurité de votre site web en 30 secondes — Webisafe
          </h1>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 1.2, ease: 'easeOut' }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight flex flex-col items-center gap-2"
          >
            <span>Analysez votre site web</span>
            <span className="shiny-text">en 1 seul clic</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 1.2, ease: 'easeOut' }}
          >
          
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1.2, ease: 'easeOut' }}
            className="text-text-secondary text-lg lg:text-xl mb-6 max-w-2xl mx-auto"
          >
            Performance · Sécurité · SEO · UX
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
            className="flex flex-wrap items-center justify-center gap-3 mb-10"
          >
            {[
              '60% des sites africains +4s de chargement',
              '73% des sites africains ont une faille securite critique',
              '53% des visiteurs quittent un site lent',
            ].map((stat, index) => (
              <span
                key={index}
                className="text-xs px-3 py-1.5 bg-danger/10 text-danger/80 rounded-full border border-danger/20"
              >
                {stat}
              </span>
            ))}
          </motion.div>

          <URLInput onScan={handleScan} user={user} />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1.2 }}
            className="text-text-secondary/60 text-sm mt-6"
          >
            Aucune inscription requise · Résultats en 30 secondes · 100% gratuit
          </motion.p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div {...animationProps} className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Votre site vous fait peut-être perdre des clients
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Sans le savoir, votre site web repousse peut-être vos visiteurs. Découvrez pourquoi.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {problemCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 1.2, ease: 'easeOut' }}
                className="bg-card-bg border border-border-color rounded-2xl p-6 card-hover"
              >
                <span className="text-4xl mb-4 block">{card.icon}</span>
                <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                <p className="text-text-secondary text-sm mb-4 leading-relaxed">{card.description}</p>
                <div className="flex items-center gap-2 text-danger">
                  <TrendingDown size={16} />
                  <span className="text-sm font-medium">{card.statLabel}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-card-bg/30">
        <div className="max-w-7xl mx-auto">
          <motion.div {...animationProps} className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Données mises à jour en temps réel depuis nos serveurs de surveillance analyse pour vous</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Pas des métriques techniques — des impacts concrets sur votre business
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {solutionCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 1.2, ease: 'easeOut' }}
                className="bg-card-bg border border-border-color rounded-2xl p-6 card-hover text-center"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4 ${card.color}`}>
                  {card.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{card.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div {...animationProps} className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Aperçu d'un rapport Webisafe</h2>
            <p className="text-text-secondary">Un rapport complet, en français, avec des recommandations actionnables</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="bg-card-bg border border-border-color rounded-2xl p-6 lg:p-8 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-color">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-sm">W</div>
                <div>
                  <p className="text-white font-semibold text-sm">Rapport Webisafe</p>
                  <p className="text-text-secondary text-xs">exemple-site.ci · 19 avril 2025</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-text-secondary text-xs">Score Global</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
              <div className="lg:col-span-1 flex justify-center items-start">
                <div className="scale-[0.82] origin-top">
                  <ScoreGaugeChart score={74} compact={true} showLegend={false} />
                </div>
              </div>

              <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                {[
                  { name: '⚡ Performance', score: 68, color: 'bg-warning' },
                  { name: '🔒 Sécurité', score: 45, color: 'bg-danger' },
                  { name: '🔍 SEO', score: 82, color: 'bg-success' },
                  { name: '📱 UX Mobile', score: 71, color: 'bg-primary' },
                ].map((cat, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-text-secondary text-sm">{cat.name}</span>
                      <span className="text-white font-semibold text-sm">{cat.score}/100</span>
                    </div>
                    <div className="h-2 bg-dark-navy rounded-full overflow-hidden">
                      <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-white font-semibold text-sm mb-3">Remarques prioritaires :</p>
              {[
                { priority: '🟢', title: 'Texte ok sur mobile' },
                { priority: '🟢', title: 'Images compressées' },
                { priority: '🟠', title: 'Meta description absente' },
                { priority: '🔴', title: 'Headers de sécurité manquants' },
                { priority: '🔴', title: 'Sitemap.xml non trouvé' },
              ].map((rec, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-dark-navy rounded-lg">
                  <span>{rec.priority}</span>
                  <span className="text-text-primary text-sm">{rec.title}</span>
                </div>
              ))}

              <div className="mt-5 pt-4 border-t border-border-color">
                <p className="text-white font-semibold text-sm mb-3">Plan de correction :</p>
                {[
                  { icon: '✅', fix: 'Responsive validé — texte lisible sans zoom' },
                  { icon: '🖼️', fix: 'Convertir images en WebP/AVIF, lazy-load' },
                  { icon: '📝', fix: 'Ajouter <meta name="description"> par page' },
                  { icon: '🛡️', fix: 'Activer HSTS + CSP + X-Frame-Options' },
                  { icon: '📍', fix: 'Générer sitemap.xml + robots.txt' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-text-primary text-sm">{item.fix}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <PricingSection onScan={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })} />

      <section className="py-20 px-4 bg-card-bg/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-full mb-4 shadow-[0_0_12px_rgba(244,63,94,0.35)] animate-pulse">
              <Radio size={14} className="text-rose-400" />
              <span className="text-rose-400 text-xs font-semibold uppercase tracking-wider">Live</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">Transparence totale</h2>
            <p className="text-text-secondary max-w-xl mx-auto text-sm">
              Aucun chiffre inventé. Chaque entrée dans ce feed correspond à une vraie analyse effectuée par un utilisateur réel. Ce que vous voyez, c'est Webisafe au travail.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 bg-card-bg border border-border-color rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Globe size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Sites analysés</p>
                  <p className="text-text-secondary/60 text-xs">Compteur global depuis le lancement</p>
                </div>
              </div>
              <p className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                {liveLoading ? (
                  <span className="text-text-secondary/40">···</span>
                ) : (
                  totalScans?.toLocaleString('fr-FR') ?? '0'
                )}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card-bg border border-border-color rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Activity size={20} className="text-success" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Activité</p>
                  <p className="text-text-secondary/60 text-xs">Derniers scans reçus</p>
                </div>
              </div>
              <p className="text-5xl font-black text-white tracking-tight">
                {liveLoading ? (
                  <span className="text-text-secondary/40">···</span>
                ) : (
                  activity?.length ?? 0
                )}
              </p>
              <p className="text-text-secondary/60 text-xs mt-2">
                {liveLoading ? 'Chargement...' : activity?.length === 1 ? 'scan visible' : 'scans visibles'}
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-card-bg border border-border-color rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border-color flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                <p className="text-white font-semibold text-sm">Activité en temps réel</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 text-[11px] font-medium">En ligne</span>
              </div>
            </div>

            <div className="p-2">
              {liveLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center gap-2 text-text-secondary/60 text-sm">
                    <Activity size={16} className="animate-spin" />
                    Chargement des scans...
                  </div>
                </div>
              ) : activity.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                    <Globe size={20} className="text-primary" />
                  </div>
                  <p className="text-white font-semibold text-sm mb-1">Soyez le premier à scanner votre site</p>
                  <p className="text-text-secondary/60 text-xs max-w-xs mx-auto">
                    Aucun scan n'a encore été effectué. Lancez une analyse et faites partie des premiers utilisateurs.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activity.map((scan, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate">{scan.domain}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary/80 border border-primary/20">
                            {scan.country || 'CI'}
                          </span>
                        </div>
                        <p className="text-text-secondary/50 text-xs mt-0.5">{timeAgo(scan.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getScoreBadgeClasses(scan.score)}`}
                        >
                          {scan.score ?? '—'}/100
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          scan.score >= 70 ? 'bg-emerald-400' : scan.score >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          <p className="text-text-secondary/30 text-[11px] text-center mt-4">
            Données synchronisées en temps réel depuis Supabase · Mises à jour instantanées
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Questions fréquentes</h2>
          </motion.div>

          <FAQAccordion items={faqItems} />
        </div>
      </section>

      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center bg-gradient-to-b from-primary/10 to-transparent border border-primary/20 rounded-2xl p-8 lg:p-12"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">Votre site a peut-être une faille critique en ce moment</h2>
          <p className="text-text-secondary mb-6">
            Découvrez-le en 60 secondes gratuitement. Aucune inscription requise.
          </p>
          <button
            onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
            className="relative overflow-hidden px-8 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition-all btn-glow inline-flex items-center gap-2"
          >
            <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
            <span className="relative z-10 inline-flex items-center gap-2">
              Scanner mon site maintenant
              <ArrowRight size={18} />
            </span>
          </button>
        </motion.div>
      </section>
    </div>
  );
}