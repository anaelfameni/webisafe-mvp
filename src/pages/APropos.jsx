import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Globe, Zap, Shield, Wrench, MapPin, Mail, MessageCircle, User,
} from 'lucide-react';
import {
  SUPPORT_EMAIL, REPORT_FIX_PHONE, REPORT_FIX_PHONE_RAW, SCAN_DURATION_AVG_LABEL,
} from '../config/brand';

const WHY_PILLARS = [
  {
    icon: MapPin,
    color: 'text-primary',
    bg: 'bg-primary/10',
    title: 'Conçu pour l\u2019Afrique de l\u2019Ouest',
    desc: 'Tarifs en FCFA, interface 100\u00a0% en français, support local. Webisafe est pensé pour les PME ivoiriennes et ouest-africaines \u2014 pas adapté d\u2019un outil étranger.',
  },
  {
    icon: Zap,
    color: 'text-warning',
    bg: 'bg-warning/10',
    title: 'Résultats en 60 secondes',
    desc: 'Une URL, un clic, un rapport complet. Aucune installation, aucune expertise requise pour comprendre les recommandations et savoir quoi corriger en premier.',
  },
  {
    icon: Shield,
    color: 'text-danger',
    bg: 'bg-danger/10',
    title: 'Des détections vraiment utiles',
    desc: 'Pas des métriques cosmétiques. Des failles concrètes\u00a0: HTTPS mal configuré, headers manquants, lenteurs sur réseau 3G, invisibilité Google.',
  },
  {
    icon: Wrench,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    title: 'Du diagnostic à la correction',
    desc: 'Webisafe ne s\u2019arrête pas au rapport. Notre équipe corrige votre site directement \u2014 sans passer par une agence ni chercher un développeur.',
  },
];

const animationProps = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 1.2, ease: 'easeOut' },
};

export default function APropos() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-dark-navy">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-8 transition-colors"
          >
            ← Retour à l'accueil
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-5">
              <Globe size={12} /> Fait à Abidjan, pour l'Afrique de l'Ouest
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              À propos de{' '}
              <span className="text-primary">Webisafe</span>
            </h1>
            <p className="text-white/60 text-lg max-w-xl leading-relaxed">
              Un outil d'audit web pensé par un développeur africain, pour les entrepreneurs africains
              qui veulent un site qui travaille vraiment pour eux.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Pourquoi Webisafe ─────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div {...animationProps} className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">Pourquoi Webisafe ?</h2>
            <p className="text-white/50 text-sm max-w-xl leading-relaxed">
              Les outils d'audit existants sont calibrés pour le marché européen ou américain.
              Webisafe est la première réponse conçue spécifiquement pour les PME d'Afrique de l'Ouest.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {WHY_PILLARS.map((pillar, i) => {
              const PillarIcon = pillar.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 1.1, ease: 'easeOut' }}
                  className="bg-card-bg border border-border-color rounded-2xl p-6 card-hover"
                >
                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${pillar.bg} mb-4`}>
                    <PillarIcon size={20} className={pillar.color} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{pillar.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{pillar.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Fondateur ─────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-card-bg/30">
        <div className="max-w-4xl mx-auto">
          <motion.div {...animationProps} className="mb-10">
            <h2 className="text-2xl font-bold text-white">Le fondateur</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="bg-card-bg border border-border-color rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row gap-8 items-start"
          >
            {/* Photo */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-[0_0_32px_rgba(21,102,240,0.15)] bg-primary/10 flex items-center justify-center">
                <img
                  src="/moi.jpg"
                  alt="Anael FAMENI — Fondateur de Webisafe"
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <User size={40} className="text-primary/40 hidden" />
              </div>
            </div>

            {/* Bio */}
            <div className="flex-1 min-w-0">
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-white">Anael FAMENI</h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  <Globe size={10} /> Abidjan, Côte d'Ivoire
                </span>
              </div>
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-4">
                Développeur fullstack · Fondateur de Webisafe
              </p>

              <div className="space-y-3 text-sm text-white/65 leading-relaxed">
                <p>
                  J'ai passé des années à constater le même écart : d'un côté, des PME africaines
                  ambitieuses avec des sites web qui les freinent — lents, peu sécurisés, ignorés
                  par Google. De l'autre, des outils d'audit pensés pour les marchés occidentaux,
                  en anglais, avec des prix inaccessibles.
                </p>
                <p>
                  Webisafe est né de cette frustration. Donner à un gérant de restaurant à Abidjan,
                  à un cabinet médical à Dakar ou à une boutique e-commerce à Lomé les mêmes
                  informations qu'une grande entreprise — en {SCAN_DURATION_AVG_LABEL}, en français,
                  à un prix adapté au marché local.
                </p>
                <blockquote className="border-l-2 border-primary/30 pl-3 text-white/40 italic text-xs">
                  "Un site web mal configuré, c'est de l'argent perdu en silence.
                  Webisafe rend ça visible."
                </blockquote>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div {...animationProps} className="mb-8">
            <h2 className="text-2xl font-bold text-white">Contact</h2>
            <p className="text-white/40 text-sm mt-1">Une question ? On répond sous 24h.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-3 rounded-2xl border border-border-color bg-card-bg hover:border-primary/40 transition-all p-5 flex-1 group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-xs mb-0.5">Email</p>
                <p className="text-white text-sm font-medium group-hover:text-primary transition-colors truncate">
                  {SUPPORT_EMAIL}
                </p>
              </div>
            </a>

            <a
              href={`https://wa.me/${REPORT_FIX_PHONE_RAW}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-border-color bg-card-bg hover:border-emerald-400/40 transition-all p-5 flex-1 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={18} className="text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-xs mb-0.5">WhatsApp</p>
                <p className="text-white text-sm font-medium group-hover:text-emerald-400 transition-colors">
                  {REPORT_FIX_PHONE}
                </p>
              </div>
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center bg-gradient-to-b from-primary/10 to-transparent border border-primary/20 rounded-2xl p-8 lg:p-12"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            Voyez ce que Webisafe trouve sur votre site
          </h2>
          <p className="text-white/60 mb-8 text-sm leading-relaxed max-w-md mx-auto">
            Premier audit gratuit. Aucune inscription. Résultats en {SCAN_DURATION_AVG_LABEL}.
          </p>
          <Link
            to="/"
            className="relative overflow-hidden inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition-all btn-glow"
          >
            <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
            <span className="relative z-10 inline-flex items-center gap-2">
              Testez votre site gratuitement
              <ArrowRight size={18} />
            </span>
          </Link>
        </motion.div>
      </section>

    </div>
  );
}
