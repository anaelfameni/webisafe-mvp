import { motion } from 'framer-motion';
import { Check, ArrowRight, MessageCircle } from 'lucide-react';
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
      name: 'White Label Lite',
      badge: 'Pour Agences',
      badgeColor: 'bg-success/10 text-success',
      price: '250 000',
      oldPrice: '300 000',
      currency: 'FCFA',
      period: '/mois',
      setup: '+ 20 000 FCFA setup (premier mois)',
      description: 'Offrez des audits a vos clients sous votre marque et creez une nouvelle source de revenus.',
      features: [
        '10 scans premium / mois',
        'Logo agence sur les rapports PDF',
        'Rapports heberges sur Webisafe',
        'Dashboard agence inclus',
        'Support email 48h',
        '5 000 FCFA / scan supplementaire',
      ],
      cta: 'Nous Contacter',
      ctaStyle: 'bg-success text-white hover:bg-success/90',
      ctaIcon: <MessageCircle size={16} />,
      popular: false,
      onClick: () =>
        window.open(
          "https://wa.me/2250595335662?text=Bonjour, je suis interesse par l'offre White Label Lite de Webisafe.",
          '_blank'
        ),
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
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Des prix adaptes a l'Afrique</h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Pas d'abonnement cache. Des tarifs penses pour les PME africaines.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-card-bg border rounded-2xl p-6 lg:p-8 flex flex-col ${plan.popular ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'border-border-color'
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
                {plan.setup && <p className="text-text-secondary text-xs mt-1">{plan.setup}</p>}
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-success flex-shrink-0 mt-0.5" />
                    <span className="text-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>

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
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <p className="text-text-secondary text-sm">Paiement securise par Wave</p>
          <p className="text-text-secondary/80 text-xs mt-2">+225 01 70 90 77 80</p>
          <p className="text-text-secondary/60 text-xs mt-2">Engagement 3 mois minimum pour White Label Lite</p>
        </motion.div>
      </div>
    </section>
  );
}
