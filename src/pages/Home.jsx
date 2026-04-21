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
      description: 'Un delai de 1 seconde = 7% de conversions perdues. Votre site fait-il fuir vos clients ?',
      statLabel: 'Baisse de trafic',
    },
    {
      icon: '🔒',
      title: 'Faille Securite',
      description: '73% des sites africains ont une vulnerabilite critique non detectee.',
      statLabel: 'Risques de perte de donnees',
    },
    {
      icon: '📉',
      title: 'SEO Invisible',
      description: 'Si Google ne vous trouve pas, vos clients non plus. Votre site est-il indexe correctement ?',
      statLabel: 'Perte de clients',
    },
  ];

  const solutionCards = [
    { icon: <Zap size={24} />, title: 'Performance', description: 'Score vitesse, Core Web Vitals, temps de chargement, poids de la page', color: 'text-warning' },
    { icon: <Shield size={24} />, title: 'Securite', description: 'Headers HTTP, certificat SSL, detection malware, failles OWASP', color: 'text-danger' },
    { icon: <Search size={24} />, title: 'SEO', description: 'Meta tags, structure H1, sitemap, indexation Google, Open Graph', color: 'text-success' },
    { icon: <Smartphone size={24} />, title: 'UX Mobile', description: 'Responsive design, taille texte, elements tactiles, vitesse mobile', color: 'text-primary' },
  ];

  const testimonials = [
    {
      name: 'Kouassi Aime',
      location: "Abidjan, Cote d'Ivoire",
      role: 'Directeur, AgenceDigital.ci',
      text: "Webisafe nous a permis d'identifier 12 failles de securite sur notre site. Le rapport est clair, en francais, et le plan d'action nous a fait gagner 3 semaines.",
      stars: 5,
    },
    {
      name: 'Fatou Diallo',
      location: 'Dakar, Senegal',
      role: 'Fondatrice, ShopSenegal',
      text: "Notre site mettait 8 secondes a charger. Grace aux recommandations Webisafe, on est passe a 2.3 secondes. Nos ventes ont augmente de 35% le mois suivant.",
      stars: 5,
    },
    {
      name: 'Paul Mbarga',
      location: 'Douala, Cameroun',
      role: 'CEO, TechCam Solutions',
      text: "Le meilleur rapport qualite/prix du marche. 35 000 FCFA pour un audit aussi complet, c'est imbattable face aux outils occidentaux a 100 EUR/mois.",
      stars: 5,
    },
  ];

  const faqItems = [
    {
      question: "Comment Webisafe analyse-t-il mon site sans risque ?",
      answer:
        "Webisafe effectue uniquement des analyses passives a partir des elements publics de votre site : performances, headers, balises, structure SEO et signaux d'experience utilisateur. Nous ne modifions rien sur votre site et n'accedons a aucune donnee privee.",
    },
    {
      question: "Combien de temps dure l'analyse ?",
      answer:
        "L'analyse complete prend entre 30 et 90 secondes selon la taille de votre site et la vitesse de votre serveur. Vous recevez les resultats directement sur la page, en temps reel.",
    },
    {
      question: 'Mes donnees sont-elles securisees ?',
      answer:
        "Oui. Nous ne stockons pas le contenu de votre site. Seuls les resultats de l'audit sont conserves pour votre historique. Vos donnees ne sont jamais partagees avec des tiers.",
    },
    {
      question: 'Le rapport est-il en francais ?',
      answer:
        "Oui, 100% en francais. Toutes les recommandations sont redigees dans un langage simple et actionnable, sans jargon technique. Chaque probleme est explique avec son impact business et une solution pas-a-pas.",
    },
    {
      question: 'Quels paiements acceptez-vous ?',
      answer:
        'Nous acceptons le paiement via Wave. Envoyez 35 000 FCFA au +225 01 70 90 77 80 et votre rapport sera disponible des que votre paiement sera confirme.',
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
            Performance · Securite · SEO · UX
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

          <URLInput onScan={handleScan} />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1.2 }}
            className="text-text-secondary/60 text-sm mt-6"
          >
            Deja 50+ sites analyses en Cote d'Ivoire
          </motion.p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div {...animationProps} className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Votre site vous fait peut-etre perdre des clients
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Sans le savoir, votre site web repousse peut etre vos visiteurs. Decouvrez pourquoi.
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
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Ce que Webisafe analyse</h2>
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
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Apercu d'un rapport Webisafe</h2>
            <p className="text-text-secondary">Un rapport complet, en francais, avec des recommandations actionnables</p>
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
                  { name: '🔒 Securite', score: 45, color: 'bg-danger' },
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
                { priority: '🟢', title: 'Images compressees' },
                { priority: '🟠', title: 'Meta description absente' },
              ].map((rec, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-dark-navy rounded-lg">
                  <span>{rec.priority}</span>
                  <span className="text-text-primary text-sm">{rec.title}</span>
                </div>
              ))}

              <div className="relative mt-3">
                <div className="premium-blur space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-dark-navy rounded-lg">
                    <span>🔴</span>
                    <span className="text-text-primary text-sm">Headers de securite manquants</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-navy rounded-lg">
                    <span>🔴</span>
                    <span className="text-text-primary text-sm">Sitemap.xml non trouve</span>
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
                    Debloquer le rapport complet
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
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Ils font confiance a Webisafe</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card-bg border border-border-color rounded-2xl p-6 card-hover"
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: testimonial.stars }).map((_, starIndex) => (
                    <Star key={starIndex} size={14} className="text-warning" fill="currentColor" />
                  ))}
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {testimonial.name.split(' ').map((name) => name[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-text-secondary text-xs">
                      {testimonial.role} · {testimonial.location}
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
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Questions frequentes</h2>
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
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">Pret a ameliorer votre site ?</h2>
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
