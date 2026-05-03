import { motion } from 'framer-motion';
import { Check, ArrowRight, MessageCircle, Shield, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PricingSection({ onScan }) {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Audit Gratuit',
      badge: 'Freemium',
      badgeColor: 'bg-text-secondary/10 text-text-secondary',
      price: '0',
      currency: 'FCFA',
      period: '',
      description: "Obtenez un premier diagnostic fiable avant d'aller plus loin.",
      features: [
        'Score global /100',
        'Resume des blocages prioritaires detectes',
        'Lecture simple des impacts sur trafic, conversions et credibilite',
        'Premieres explications sur les problemes visibles',
        'Orientation claire sur les urgences a traiter',
        'Limite : 1 scan / jour',
      ],
      cta: 'Scanner Gratuitement',
      ctaStyle: 'bg-primary text-white hover:bg-primary-hover btn-glow',
      popular: false,
      onClick: () => onScan?.(),
    },
    {
      name: 'Audit Premium',
      badge: 'Le plus populaire',
      badgeColor: 'bg-primary text-white',
      price: '35 000',
      oldPrice: '40 000',
      currency: 'FCFA',
      period: 'paiement unique',
      description: 'Rapport professionnel complet pour comprendre et corriger ce qui freine votre site.',
      features: [
        'Rapport PDF professionnel',
        '25+ metriques analysees',
        'Explications detaillees des failles et impacts business',
        "Plan d'action priorise en 3 etapes",
        '1 rescan gratuit apres 30 jours',
        'Support email 48h',
      ],
      cta: 'Obtenir Mon Rapport',
      ctaStyle: 'bg-primary text-white hover:bg-primary-hover btn-glow',
      popular: true,
      onClick: () => {
        const heroSection = document.getElementById('hero');
        if (heroSection) {
          heroSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          navigate('/');
        }
      },
    },
    {
      name: 'Webisafe Protect',
      badge: 'Surveillance Continue',
      badgeColor: 'bg-primary/15 text-primary',
      price: '15 000',
      currency: 'FCFA',
      period: '/mois',
      description: 'Votre site surveillé 24h/24, alertes automatiques et rapport mensuel sans rien faire.',
      bonus: 'Offre mai 2026 : audit initial offert (35 000 FCFA)',
      setup: 'Dès juin 2026 : audit initial 35 000 FCFA requis',
      features: [
        'Audit initial inclus (valeur 35 000 FCFA)',
        'Scan mensuel automatique complet',
        'Monitoring uptime toutes les 5 minutes',
        'Alertes email critiques uniquement',
        'Historique 6 mois avec graphiques',
        'Alerte SSL proactive J-14, J-7, J-1',
        'Badge "Sécurisé par Webisafe"',
      ],
      cta: 'Souscrire à Protect',
      ctaStyle: 'bg-primary text-white hover:bg-primary-hover',
      ctaIcon: <Shield size={16} />,
      popular: false,
      onClick: () => navigate('/protect'),
    },
  ];

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Des prix adaptés à l'Afrique</h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Pas d'abonnement caché. Des tarifs pensés pour les PME.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-card-bg border rounded-2xl p-6 flex flex-col ${
                  plan.popular ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                  : plan.prerequisite ? 'border-primary/30'
                  : 'border-border-color'
                }`}
            >
              <span className={`inline-block self-start text-xs font-semibold px-3 py-1 rounded-full mb-4 ${plan.badgeColor}`}>
                {plan.badge}
              </span>

              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-text-secondary text-sm mb-4">{plan.description}</p>

              <div className="mb-6">
                {plan.oldPrice && <span className="text-text-secondary line-through text-sm mr-2">{plan.oldPrice} FCFA</span>}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl font-bold text-white whitespace-nowrap">{plan.price}</span>
                  <span className="text-text-secondary text-sm whitespace-nowrap">{plan.currency}</span>
                  {plan.period && <span className="text-text-secondary text-sm whitespace-nowrap">{plan.period}</span>}
                </div>
                {plan.bonus && <p className="text-success text-xs mt-1 font-semibold">{plan.bonus}</p>}
                {plan.setup && <p className="text-text-secondary text-xs mt-2">{plan.setup}</p>}
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-success flex-shrink-0 mt-0.5" />
                    <span className="text-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.prerequisite && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-warning/8 border border-warning/20 rounded-xl">
                  <Lock size={11} className="text-warning flex-shrink-0" />
                  <p className="text-warning/80 text-[11px] leading-tight">Addon mensuel — requiert un audit premium initial (35 000 FCFA)</p>
                </div>
              )}
              <button
                onClick={plan.onClick}
                className={`relative overflow-hidden w-full py-3 px-6 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-2 ${plan.ctaStyle}`}
              >
                <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
                <span className="relative z-10 flex items-center gap-2">
                  {plan.ctaIcon}
                  {plan.cta}
                  {!plan.ctaIcon && <ArrowRight size={16} />}
                </span>
              </button>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="relative bg-card-bg border border-border-color rounded-2xl p-6 flex flex-col"
          >
            <span className="inline-block self-start text-xs font-semibold px-3 py-1 rounded-full mb-4 bg-success/10 text-success">
              Agences
            </span>

            <h3 className="text-xl font-bold text-white mb-2">White Label</h3>
            <p className="text-text-secondary text-sm mb-4">
              Vous gérez plusieurs sites clients ? Devenez partenaire Webisafe
              et proposez des audits de sécurité sous votre marque.
            </p>

            <div className="mb-6">
              <span className="text-2xl font-bold text-white">Tarif sur devis</span>
              <p className="text-text-secondary text-xs mt-1">Selon volume et besoins</p>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              {[
                'Rapports PDF à votre logo',
                'Dashboard agence multi-clients',
                'API d\'intégration disponible',
                'Support prioritaire dédié',
                'Tarif sur devis selon volume',
                'Formation commerciale incluse',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-success flex-shrink-0 mt-0.5" />
                  <span className="text-text-secondary">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() =>
                window.open(
                  "https://wa.me/2250595335662?text=Bonjour, je suis interesse par l'acces agence Webisafe.",
                  '_blank'
                )
              }
              className="relative overflow-hidden w-full py-3 px-6 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-success text-white hover:bg-success/90"
            >
              <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
              <span className="relative z-10 flex items-center gap-2">
                <MessageCircle size={16} />
                Demander un accès
              </span>
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <p className="text-text-secondary text-sm">Paiement securise par Wave</p>
        </motion.div>
      </div>
    </section>
  );
}
