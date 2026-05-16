import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PricingSection from '../components/PricingSection';
import FAQAccordion from '../components/FAQAccordion';
import PartnerCTA from '../components/PartnerCTA';

export default function Tarifs() {
  const navigate = useNavigate();

  const faqItems = [
    {
      question: 'Puis-je payer en plusieurs fois ?',
      answer:
        'Pour le moment, le paiement se fait en une seule fois pour le rapport unique (35 000 FCFA). Pour le White Label Lite, le paiement est mensuel.',
    },
    {
      question: "Que se passe-t-il après le paiement ?",
      answer:
        "Une fois votre paiement Wave signalé, notre équipe le vérifie rapidement. Vous recevez ensuite un email de confirmation et votre rapport complet devient accessible.",
    },
    {
      question: 'Puis-je obtenir un remboursement ?',
      answer:
        "Garantie satisfait ou remboursé 7 jours. Si le rapport ne répond pas à vos attentes après lecture complète, contactez le support sous 7 jours pour un remboursement intégral. Au-delà, aucun remboursement n'est possible. Nous vous recommandons aussi de lancer l'audit gratuit avant pour valider la pertinence de l'outil.",
    },
    {
      question: "Existe-t-il des engagements de durée pour Protect ?",
      answer:
        "Non. Le tarif mensuel est sans engagement. Les formules trimestrielle (-10 %), semestrielle (-15 %) et annuelle (-20 %) offrent une remise immédiate en échange d'un paiement anticipé. La résiliation est possible à tout moment, le solde non consommé est remboursé au prorata sur demande.",
    },
    {
      question: "Puis-je combiner Audit Premium et pack Correction ?",
      answer:
        "Oui. Le pack Audit + Correction Standard combine les deux services avec 15 % de remise (102 000 FCFA au lieu de 120 000 FCFA). Idéal pour passer du diagnostic à la correction sans perdre de temps.",
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center px-4 mb-0"
      >
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
          Tarifs <span className="shiny-text">transparents</span>
        </h1>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          Des prix adaptés à l'Afrique. Pas d'abonnement caché. Des tarifs pensés pour les PME.
        </p>
      </motion.div>

      <PricingSection onScan={() => navigate('/', { state: { scrollToTop: true } })} hideHeader={true} />

      <PartnerCTA />

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-3">Questions sur les tarifs</h2>
          </motion.div>
          <FAQAccordion items={faqItems} />
        </div>
      </section>

      <section className="py-12 px-4">
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
            onClick={() => navigate('/', { state: { scrollToTop: true } })}
            className="px-8 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition-all btn-glow inline-flex items-center gap-2"
          >
            Scanner Gratuitement
            <ArrowRight size={18} />
          </button>
          <p className="text-text-secondary/60 text-xs mt-3">
            Commencez par un audit gratuit — aucune carte bancaire requise
          </p>
        </motion.div>
      </section>
    </div>
  );
}
