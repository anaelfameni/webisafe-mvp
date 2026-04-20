import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Shield, Search, Smartphone, Star, ArrowRight, TrendingDown, Eye } from 'lucide-react';
import URLInput from '../components/URLInput';
import PricingSection from '../components/PricingSection';
import FAQAccordion from '../components/FAQAccordion';
import PartnerCTA from '../components/PartnerCTA';
import ScoreGaugeChart from '../components/ScoreGaugeChart';

export default function Home({ user, onAuthRequest }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state]);

  const handleScan = (url, email) => {
    if (!user) {
      onAuthRequest();
      return;
    }
    const params = new URLSearchParams({ url });
    if (email) params.set('email', email);
    navigate(`/analyse?${params.toString()}`);
  };

  const problemCards = [
    {
      icon: '🐌',
      title: 'Site Lent',
      description: 'Un délai de 1 seconde = 7% de conversions perdues. Votre site fait-il fuir vos clients ?',
      stat: '60%',
      statLabel: 'Baisse de trafic',
    },
    {
      icon: '🔒',
      title: 'Faille Sécurité',
      description: '73% des sites africains ont une vulnérabilité critique non détectée.',
      stat: '73%',
      statLabel: 'Risques de perte de données',
    },
    {
      icon: '📉',
      title: 'SEO Invisible',
      description: 'Si Google ne vous trouve pas, vos clients non plus. Votre site est-il indexé correctement ?',
      stat: '53%',
      statLabel: 'Perte de clients',
    },
  ];

  const solutionCards = [
    { icon: <Zap size={24} />, title: 'Performance', description: 'Score vitesse, Core Web Vitals, temps de chargement, poids de la page', color: 'text-warning' },
    { icon: <Shield size={24} />, title: 'Sécurité', description: 'Headers HTTP, certificat SSL, détection malware, failles OWASP', color: 'text-danger' },
    { icon: <Search size={24} />, title: 'SEO', description: 'Meta tags, structure H1, sitemap, indexation Google, Open Graph', color: 'text-success' },
    { icon: <Smartphone size={24} />, title: 'UX Mobile', description: 'Responsive design, taille texte, éléments tactiles, vitesse mobile', color: 'text-primary' },
  ];

  const testimonials = [
    {
      name: 'Kouassi Aimé',
      location: "Abidjan, Côte d'Ivoire",
      role: 'Directeur, AgenceDigital.ci',
      text: "Webisafe nous a permis d'identifier 12 failles de sécurité sur notre site. Le rapport est clair, en français, et le plan d'action nous a fait gagner 3 semaines.",
      stars: 5,
    },
    {
      name: 'Fatou Diallo',
      location: 'Dakar, Sénégal',
      role: 'Fondatrice, ShopSenegal',
      text: "Notre site mettait 8 secondes à charger. Grâce aux recommandations Webisafe, on est passé à 2.3 secondes. Nos ventes ont augmenté de 35% le mois suivant.",
      stars: 5,
    },
    {
      name: 'Paul Mbarga',
      location: 'Douala, Cameroun',
      role: 'CEO, TechCam Solutions',
      text: "Le meilleur rapport qualité/prix du marché. 35 000 FCFA pour un audit aussi complet, c'est imbattable face aux outils occidentaux à 100€/mois.",
      stars: 5,
    },
  ];

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
        "Oui, 100% en français. Toutes les recommandations sont rédigées dans un langage simple et actionnable, sans jargon technique. Chaque problème est expliqué avec son impact business et une solution pas-à-pas.",
    },
    {
      question: 'Quels paiements acceptez-vous ?',
      answer:
        'Nous acceptons Wave, Orange Money, MTN MoMo et les cartes bancaires via notre partenaire CinetPay. Le paiement est sécurisé et instantané.',
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
              Premier Outil d'Audit Web d'Afrique Francophone
            </span>
          </motion.div>

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
              '73% des sites africains ont une faille sécurité critique',
              '53% des visiteurs quittent un site lent',
            ].map((stat, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 bg-danger/10 text-danger/80 rounded-full border border-danger/20"
              >
                {stat}
              </span>
            ))}
          </motion.div>

          <URLInput onScan={handleScan} />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1.2 }}
            className="text-text-secondary/60 text-sm mt-6"
          >
            ⭐ Déjà 50+ sites analysés en Côte d'Ivoire
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
              Sans le savoir, votre site web repousse peut être vos visiteurs. Découvrez pourquoi.
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
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Ce que Webisafe analyse
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              4 piliers essentiels pour un site web performant et professionnel
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
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4 ${card.color}`}
                >
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
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Aperçu d'un rapport Webisafe
            </h2>
            <p className="text-text-secondary">
              Un rapport complet, en français, avec des recommandations actionnables
            </p>
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
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-sm">
                  W
                </div>
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
                ].map((cat, i) => (
                  <div key={i}>
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
              ].map((rec, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-dark-navy rounded-lg">
                  <span>{rec.priority}</span>
                  <span className="text-text-primary text-sm">{rec.title}</span>
                </div>
              ))}

              <div className="relative mt-3">
                <div className="premium-blur space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-dark-navy rounded-lg">
                    <span>🔴</span>
                    <span className="text-text-primary text-sm">Headers de sécurité manquants</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-navy rounded-lg">
                    <span>🔴</span>
                    <span className="text-text-primary text-sm">Sitemap.xml non trouvé</span>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => {
                      const hero = document.getElementById('hero');
                      hero?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary/90 text-white text-sm font-medium rounded-full btn-glow hover:bg-primary transition-all"
                  >
                    <Eye size={16} />
                    Débloquer le rapport complet
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <PricingSection onScan={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })} />

      <PartnerCTA />

      <section className="py-20 px-4 bg-card-bg/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Ils font confiance à Webisafe
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card-bg border border-border-color rounded-2xl p-6 card-hover"
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={14} className="text-warning" fill="currentColor" />
                  ))}
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-4 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {t.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{t.name}</p>
                    <p className="text-text-secondary text-xs">
                      {t.role} · {t.location}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            Prêt à améliorer votre site ?
          </h2>
          <p className="text-text-secondary mb-6">
            Lancez votre premier audit gratuit en 60 secondes. Aucune inscription requise.
          </p>
          <button
            onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
            className="relative overflow-hidden px-8 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition-all btn-glow inline-flex items-center gap-2"
          >
            <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
            <span className="relative z-10 inline-flex items-center gap-2">
              Scanner Gratuitement
              <ArrowRight size={18} />
            </span>
          </button>
        </motion.div>
      </section>
    </div>
  );
}
