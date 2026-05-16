import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Palette,
  FileText,
  Globe,
  Users,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Mail,
  Building2,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { SUPPORT_EMAIL } from '../config/brand';

const FEATURES = [
  {
    icon: Palette,
    title: 'Rebranding complet',
    description:
      "Logo, couleurs primaire/secondaire, typographie et URL personnalisée appliqués automatiquement à l'interface client et au PDF.",
  },
  {
    icon: FileText,
    title: 'PDF en marque blanche',
    description:
      "Chaque rapport généré pour vos clients porte votre logo et votre identité — aucune mention 'Webisafe' visible.",
  },
  {
    icon: Globe,
    title: 'Sous-domaine dédié',
    description:
      "audit.votre-agence.com (ou un domaine que vous nous fournissez). Vous gardez la maîtrise de la relation client.",
  },
  {
    icon: Users,
    title: 'Comptes clients illimités',
    description:
      "Invitez vos clients dans votre console agence, suivez leurs scans et leurs scores depuis un seul tableau de bord.",
  },
  {
    icon: TrendingUp,
    title: 'Suivi multi-sites',
    description:
      "Pipeline agence, portefeuille prioritaire, historique mensuel et alertes — pensé pour facturer du SEO/sécurité récurrent.",
  },
  {
    icon: ShieldCheck,
    title: 'Données isolées',
    description:
      "Vos scans et ceux de vos clients sont rattachés à votre compte agence, jamais mélangés avec d'autres agences.",
  },
];

const FAQ = [
  {
    q: 'Combien coûte la formule White Label ?',
    a: "Sur devis. Les paramètres qui influencent le tarif : nombre de sous-comptes, volume de scans mensuels, sous-domaine dédié, fréquence des rapports automatisés. Les agences existantes paient typiquement entre 100 000 et 250 000 FCFA / mois.",
  },
  {
    q: 'Comment se passe la facturation ?',
    a: "Facturation mensuelle ou annuelle, payable par Wave Money, virement bancaire (UEMOA) ou Stripe pour les agences hors zone CFA. Une facture nominative est émise au nom de votre société, avec mention TVA si vous êtes assujetti. Les abonnements annuels bénéficient de -15 %.",
  },
  {
    q: "Quel est le délai de mise en place ?",
    a: "Compter 5 à 10 jours ouvrés entre la signature du devis et la mise en production : configuration du sous-domaine, import de votre charte graphique, création des comptes utilisateurs, formation visio (60 min) et tests sur 2 sites pilotes.",
  },
  {
    q: "Peut-on tester avant de s'engager ?",
    a: "Oui. Nous proposons un environnement de démonstration gratuit pendant 14 jours, configuré avec votre logo et un sous-domaine de test. Aucun engagement, aucune carte requise.",
  },
  {
    q: "Que se passe-t-il à la fin du contrat ?",
    a: "Vous récupérez l'export complet de vos scans (CSV + PDF) et de votre liste clients. Le sous-domaine est libéré sous 7 jours. Aucune donnée n'est conservée au-delà de 30 jours après résiliation.",
  },
];

export default function WhiteLabel() {
  const [openFaq, setOpenFaq] = useState(0);
  const subjectLine = encodeURIComponent('Demande devis White Label Webisafe');
  const body = encodeURIComponent(
    [
      'Bonjour,',
      '',
      "Je suis intéressé(e) par la formule White Label de Webisafe.",
      '',
      'Voici quelques précisions sur mon agence :',
      '- Nom de l’agence : ',
      '- Nombre de clients actuels : ',
      '- Volume mensuel estimé de scans : ',
      '- Sous-domaine souhaité : ',
      '',
      'Merci de m’envoyer un devis personnalisé.',
    ].join('\n')
  );

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 bg-dark-navy text-text-primary">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Briefcase size={14} /> Offre agences B2B
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Webisafe <span className="text-primary">White Label</span>
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Revendez l’audit Webisafe sous votre marque. Conservez la relation client, automatisez le reporting et ajoutez une ligne de revenu récurrente à votre agence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${subjectLine}&body=${body}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold text-sm transition-all btn-glow"
            >
              <Mail size={16} /> Demander un devis
            </a>
            <Link
              to="/agence"
              className="inline-flex items-center gap-2 px-6 py-3 border border-border-color hover:border-primary/50 text-text-secondary hover:text-white rounded-xl font-semibold text-sm transition-all"
            >
              <Building2 size={16} /> Voir la console agence
              <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>

        {/* Features grid */}
        <section className="mb-16">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
            Tout ce dont une agence a besoin pour revendre du SEO/sécurité
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card-bg border border-border-color rounded-2xl p-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">{feature.title}</h3>
                  <p className="text-text-secondary text-xs leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* T.3 — Facturation agence */}
        <section className="mb-16 bg-card-bg/40 border border-border-color rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={18} className="text-primary" />
            <h2 className="text-xl font-bold text-white">Facturation agence</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-text-secondary">
            <div className="bg-dark-navy/40 border border-border-color rounded-xl p-4">
              <p className="text-white font-semibold mb-1 text-sm">Mensuel ou annuel</p>
              <p>Mensuel sans engagement, ou annuel avec -15 % et facture unique.</p>
            </div>
            <div className="bg-dark-navy/40 border border-border-color rounded-xl p-4">
              <p className="text-white font-semibold mb-1 text-sm">Modes de paiement</p>
              <p>Wave Money, virement bancaire UEMOA, Stripe (hors CFA). Délai de paiement 30 jours par défaut.</p>
            </div>
            <div className="bg-dark-navy/40 border border-border-color rounded-xl p-4">
              <p className="text-white font-semibold mb-1 text-sm">Factures nominatives</p>
              <p>Émises au nom de votre société avec RCCM, NIF, TVA si applicable. Téléchargeables depuis la console agence.</p>
            </div>
          </div>
          <p className="text-text-secondary/60 text-xs mt-4">
            Les conditions précises (taux, droit de rétractation B2B, SLA) sont détaillées dans le contrat envoyé après devis.
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">Questions fréquentes</h2>
          <div className="space-y-2">
            {FAQ.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-card-bg border border-border-color rounded-2xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-white font-semibold text-sm">{item.q}</span>
                    <span
                      className={`text-primary transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      aria-hidden="true"
                    >
                      <ArrowRight size={14} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-text-secondary text-xs leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="text-center bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl p-8">
          <CheckCircle size={28} className="text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-white mb-2">Prêt à revendre l'audit Webisafe sous votre marque ?</h2>
          <p className="text-text-secondary text-sm mb-6 max-w-xl mx-auto">
            Réponse détaillée sous 48h ouvrées. Si l’offre vous convient, votre environnement de démonstration est prêt sous 5 jours.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${subjectLine}&body=${body}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold text-sm transition-all btn-glow"
          >
            <Mail size={16} /> Recevoir un devis personnalisé
          </a>
        </section>
      </div>
    </div>
  );
}
