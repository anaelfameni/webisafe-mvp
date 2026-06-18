import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, MessageCircle, Shield, Lock, Wrench, Briefcase } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

// L.2 / L.3 — Périodes de facturation Protect avec remises clairement affichées
const PROTECT_BASE_MONTHLY = 15000; // FCFA
const PROTECT_BILLING_OPTIONS = [
  { id: 'monthly', label: 'Mensuel', months: 1, discount: 0 },
  { id: 'quarterly', label: 'Trimestriel', months: 3, discount: 0.10 },
  { id: 'biannual', label: 'Semestriel', months: 6, discount: 0.15 },
  { id: 'annual', label: 'Annuel', months: 12, discount: 0.20 },
];

function formatFcfa(value) {
  return value.toLocaleString('fr-FR');
}

function getProtectPlanForBilling(billingId) {
  const option = PROTECT_BILLING_OPTIONS.find((opt) => opt.id === billingId) || PROTECT_BILLING_OPTIONS[0];
  const monthly = Math.round(PROTECT_BASE_MONTHLY * (1 - option.discount));
  const total = monthly * option.months;
  const totalRegular = PROTECT_BASE_MONTHLY * option.months;
  const savings = totalRegular - total;
  return { option, monthly, total, totalRegular, savings };
}

export default function PricingSection({ onScan, hideHeader = false }) {
  const navigate = useNavigate();
  const [protectBilling, setProtectBilling] = useState('monthly');
  const protectPricing = useMemo(() => getProtectPlanForBilling(protectBilling), [protectBilling]);

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
        'Résumé des blocages prioritaires détectés',
        'Lecture simple des impacts sur trafic, conversions et crédibilité',
        'Premières explications sur les problèmes visibles',
        'Orientation claire sur les urgences à traiter',
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
      period: 'paiement unique · sans abonnement',
      description: 'Rapport professionnel complet pour comprendre et corriger ce qui freine votre site.',
      features: [
        'Rapport PDF professionnel',
        '25+ métriques analysées',
        'Explications détaillées des failles et impacts business',
        "Plan d'action priorisé en 3 étapes",
        '1 rescan gratuit après 30 jours',
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
      price: formatFcfa(protectPricing.monthly),
      oldPrice: protectPricing.option.discount > 0 ? formatFcfa(PROTECT_BASE_MONTHLY) : null,
      currency: 'FCFA',
      period: '/mois',
      periodNote: protectPricing.option.months > 1
        ? `Facturé ${formatFcfa(protectPricing.total)} FCFA tous les ${protectPricing.option.months} mois · économie ${formatFcfa(protectPricing.savings)} FCFA`
        : 'Facturation mensuelle · sans engagement',
      description: 'Votre site surveillé 24h/24, alertes automatiques et rapport mensuel sans rien faire.',
      bonus: 'Offre Juin–Juillet 2026 : audit initial offert (35 000 FCFA)',
      setup: 'Dès Août 2026 : audit initial 35 000 FCFA requis',
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
      isProtect: true,
      onClick: () => navigate('/protect', { state: { billing: protectBilling } }),
    },
    {
      // L.4 — Plan combiné Audit + Correction Standard (15 % de remise)
      name: 'Audit + Correction',
      badge: 'Économisez 15 %',
      badgeColor: 'bg-success/15 text-success',
      price: '102 000',
      oldPrice: '120 000',
      currency: 'FCFA',
      period: 'paiement unique · pack tout-en-un',
      description: 'Diagnostic complet + correction par notre équipe. La solution la plus rapide pour passer du rapport aux résultats.',
      features: [
        'Audit Premium inclus (35 000 FCFA)',
        'Pack Correction Standard inclus (85 000 FCFA)',
        'Sécurité, performance, SEO et UX corrigés',
        'Rescan post-correction inclus (J+30)',
        'Délai : 3 à 5 jours ouvrés',
        'Garantie 30 jours après correction',
      ],
      cta: 'Demander le pack combo',
      ctaStyle: 'bg-success text-white hover:bg-success/90',
      ctaIcon: <Wrench size={16} />,
      popular: false,
      onClick: () => navigate('/corrections?pack=combo'),
    },
  ];

  return (
    <section id="pricing" className={`${hideHeader ? 'py-6' : 'py-20'} px-4`}>
      <div className="max-w-7xl mx-auto">
        {!hideHeader && (
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
      )}

      {/* J.1 — Grille 4 plans : 1 col mobile, 2 cols tablette, 4 cols desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
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

              {plan.isProtect && (
                <div className="mb-4 flex flex-wrap gap-1.5 p-1 bg-white/5 rounded-full border border-white/10">
                  {PROTECT_BILLING_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setProtectBilling(option.id)}
                      className={`flex-1 min-w-[68px] px-2 py-1.5 rounded-full text-[10px] font-semibold transition-all ${
                        protectBilling === option.id
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'text-text-secondary hover:text-white'
                      }`}
                    >
                      {option.label}
                      {option.discount > 0 && <span className="ml-1 text-[9px] opacity-80">-{Math.round(option.discount * 100)}%</span>}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-6">
                {plan.oldPrice && <span className="text-text-secondary line-through text-sm mr-2">{plan.oldPrice} FCFA</span>}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl font-bold text-white whitespace-nowrap">{plan.price}</span>
                  <span className="text-text-secondary text-sm whitespace-nowrap">{plan.currency}</span>
                  {plan.period && <span className="text-text-secondary text-sm whitespace-nowrap">{plan.period}</span>}
                </div>
                {plan.periodNote && <p className="text-text-secondary text-xs mt-1.5">{plan.periodNote}</p>}
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
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-xl">
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
            className="relative bg-card-bg border border-border-color rounded-2xl p-6 flex flex-col md:col-span-2 lg:col-span-2 lg:col-start-2"
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

            {/* F.4 — CTA structuré vers la page /white-label (formulaire de devis), plus de bouton WhatsApp brut */}
            <Link
              to="/white-label"
              className="relative overflow-hidden w-full py-3 px-6 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-success text-white hover:bg-success/90"
            >
              <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
              <span className="relative z-10 flex items-center gap-2">
                <Briefcase size={16} />
                Demander un devis
              </span>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <p className="text-text-secondary text-sm">Paiement sécurisé par Wave</p>
        </motion.div>
      </div>
    </section>
  );
}
