import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Activity, Bell, TrendingUp, CheckCircle2, Copy, Loader2, ArrowRight,
  Eye, BarChart3, BadgeCheck, ChevronDown, ChevronUp, Zap, Clock
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { WAVE_PHONE_DISPLAY } from '../utils/wavePayment';
import ToastMessage from '../components/ToastMessage';
import { isValidURL } from '../utils/validators';
import { sendProtectReceiptEmail } from '../utils/emailApi';

const PROTECT_PRICE = 15000;

const FEATURES = [
  {
    icon: <Activity size={22} />,
    tag: 'Surveillance continue',
    title: 'Monitoring Uptime 24h/24',
    desc: 'Vérification toutes les 5 minutes. Si votre site ne répond pas, vous recevez une alerte immédiate — avant vos clients.',
    detail: 'Temps de réponse · Incidents · Disponibilité',
    highlight: '288 vérifications par jour',
    color: 'green',
  },
  {
    icon: <Bell size={22} />,
    tag: 'Zéro spam',
    title: 'Alertes Email Critiques',
    desc: 'Déclenchées uniquement sur les événements urgents : site inaccessible, SSL qui expire dans 14 jours, score qui baisse de plus de 15 points.',
    detail: 'Site down · SSL expire · Score -15pts',
    highlight: 'Uniquement quand c\'est urgent',
    color: 'orange',
  },
  {
    icon: <Shield size={22} />,
    tag: 'Alerte J-14, J-7, J-1',
    title: 'SSL Proactif',
    desc: 'Rappel automatique avant expiration. Un site marqué "Non sécurisé" par Chrome fait fuir 80% des visiteurs en quelques secondes.',
    detail: 'Expiration SSL · Renouvellement · Monitoring',
    highlight: 'Jamais de surprise SSL',
    color: 'red',
  },
  {
    icon: <BarChart3 size={22} />,
    tag: 'Rapport PDF complet',
    title: 'Scan Mensuel Automatique',
    desc: 'Identique à un audit premium — même profondeur d\'analyse — mais déclenché automatiquement le 1er de chaque mois, sans aucune action de votre part.',
    detail: 'Performance · Sécurité · SEO · UX Mobile',
    highlight: 'Gratuit pour vous chaque mois',
    color: 'blue',
  },
  {
    icon: <BadgeCheck size={22} />,
    tag: 'Acquisition passive',
    title: 'Badge "Sécurisé par Webisafe"',
    desc: 'Un script de 2 lignes dans le footer de votre site. Affiche votre score en temps réel. Chaque visiteur de votre site voit le nom Webisafe.',
    detail: '2 lignes de code · Score en temps réel · Auto-update',
    highlight: 'Votre site devient une vitrine',
    color: 'cyan',
  },
  {
    icon: <TrendingUp size={22} />,
    tag: 'Historique conservé',
    title: 'Évolution sur 6 Mois',
    desc: 'Une courbe interactive qui montre votre progression. C\'est ce qui crée l\'attachement — vous voyez chaque amélioration, vous ne voulez pas perdre cette donnée.',
    detail: 'Score global · Sécurité · Performance · SEO',
    highlight: 'Graphiques interactifs inclus',
    color: 'purple',
  },
];

const COLORS = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', dot: 'bg-green-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-500' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', dot: 'bg-cyan-500' },
};

const FAQ = [
  { q: 'Comment fonctionne le paiement ?', a: 'Vous envoyez 15 000 FCFA sur Wave au numéro Webisafe, avec votre code unique en note. Notre équipe valide le paiement sous 2h ouvrées et active votre abonnement.' },
  { q: 'Puis-je résilier à tout moment ?', a: 'Oui, sans engagement ni frais de résiliation. Envoyez un email à webisafe@gmail.com et votre surveillance s\'arrêtera en fin de mois en cours.' },
  { q: 'Que se passe-t-il si mon site est souvent en panne ?', a: 'Vous recevez une alerte à chaque incident. Un tableau de bord dans votre espace client affiche l\'historique de disponibilité en temps réel.' },
];

function generateProtectCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PROT-';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) code += '-';
  }
  return code;
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border-color rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition">
        <span className="text-white font-medium text-sm">{q}</span>
        {open ? <ChevronUp size={16} className="text-white/40 flex-shrink-0" /> : <ChevronDown size={16} className="text-white/40 flex-shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <p className="px-5 pb-4 text-white/60 text-sm leading-relaxed border-t border-border-color pt-3">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Protect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [siteUrl, setSiteUrl] = useState('');
  const [wavePhone, setWavePhone] = useState('');
  const [errors, setErrors] = useState({});
  const [paymentCode] = useState(() => generateProtectCode());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState(null);

  const handleCopy = async (value, msg) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast({ type: 'success', message: msg });
      setTimeout(() => setToast(null), 2500);
    } catch {
      setToast({ type: 'error', message: 'Copie impossible' });
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleStep1 = () => {
    const errs = {};
    if (!siteUrl.trim()) errs.siteUrl = 'URL requise';
    else if (!isValidURL(siteUrl)) errs.siteUrl = 'URL invalide (ex: https://monsite.ci)';
    if (!user) errs.auth = 'Vous devez être connecté pour souscrire';
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  };

  const handleSubmit = async () => {
    const errs = {};
    if (!wavePhone.trim()) errs.wavePhone = 'Numéro Wave requis';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, user_email: user.email, site_url: siteUrl, wave_phone: wavePhone, payment_code: paymentCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        setToast({ type: 'error', message: data.error || 'Erreur serveur' });
        return;
      }
      setSubmitted(true);
      // Email accusé de réception immédiat (non bloquant)
      if (user?.email) {
        sendProtectReceiptEmail({
          to: user.email,
          siteUrl: siteUrl,
          paymentCode: paymentCode,
        }).catch(() => { /* silencieux */ });
      }
    } catch {
      setToast({ type: 'error', message: 'Erreur réseau. Réessayez.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen px-4 pt-28 pb-16 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          className="max-w-lg w-full bg-[#0C1627] border border-success/30 rounded-[32px] p-10 text-center shadow-[0_0_80px_rgba(34,197,94,0.08)]">
          <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-success" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Demande envoyée ✓</h1>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            Votre demande est reçue. Vous recevrez un email de confirmation sous <strong className="text-white">2h ouvrées</strong>.<br />
            Pour toute question : <a href="mailto:webisafe@gmail.com" className="text-primary hover:underline">webisafe@gmail.com</a>
          </p>
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-6">
            <p className="text-white/50 text-xs mb-1">Votre code de confirmation</p>
            <p className="text-primary font-bold text-xl tracking-widest">{paymentCode}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition flex items-center justify-center gap-2">
              Voir mon tableau de bord <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/')} className="w-full py-2.5 text-white/40 hover:text-white text-sm transition">
              ← Retour à l'accueil
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4">
      <ToastMessage toast={toast} />

      {/* ── Hero ── */}
      <div className="max-w-6xl mx-auto pt-28 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-8 text-sm text-primary font-medium">
            <Shield size={15} /> Webisafe Protect Basic
          </span>
          <h1 className="text-5xl lg:text-6xl font-black text-white mb-5 leading-tight">
            Protégez votre site{' '}
            <span className="shiny-text">en continu</span>
          </h1>
          <p className="text-white/50 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Une seule question à laquelle répond Protect :<br />
            <em className="text-white/70 not-italic font-medium">"Votre site surveillé 24h/24 : scanné chaque 5 minutes"</em>
          </p>

          {/* Stats */}
          <div className="inline-flex flex-wrap justify-center gap-6 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl mb-4">
            {[
              { icon: <Activity size={15} />, value: '288×/jour', label: 'Vérifications uptime' },
              { icon: <Clock size={15} />, value: '5 min', label: 'Délai alerte max' },
              { icon: <Zap size={15} />, value: '1/mois', label: 'Scan automatique' },
              { icon: <Shield size={15} />, value: 'J-14', label: 'Alerte SSL' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-primary">{s.icon}</span>
                <span className="text-white font-bold">{s.value}</span>
                <span className="text-white/40">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="text-center">
              <p className="text-4xl font-black text-white">15 000</p>
              <p className="text-white/50 text-sm">FCFA / mois</p>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="text-left">
              <p className="text-white/60 text-sm">Paiement via Wave Mobile</p>
              <p className="text-white/40 text-xs">Sans engagement · Résiliable à tout moment</p>
            </div>
          </div>

          {/* Ancrage comparatif */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-5 text-center text-white/40 text-sm max-w-lg mx-auto leading-relaxed"
          >
            Un développeur à temps partiel pour surveiller votre site :{' '}
            <span className="text-white/60 font-medium">150 000 FCFA/mois</span>.{' '}
            Il dort la nuit.{' '}
            <span className="text-primary font-semibold">Protect ne dort jamais.</span>
          </motion.p>
        </motion.div>
      </div>

      {/* ── Scénarios réels ── */}
      <div className="max-w-4xl mx-auto mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white mb-3">Dormez tranquille — votre site ne dort jamais</h2>
          <p className="text-white/50 text-sm max-w-xl mx-auto">Voici 3 situations que nos abonnés ne vivent plus depuis Protect.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              emoji: '🌙',
              before: 'Votre site tombe à 3h du matin',
              after: 'Vous recevez une alerte en moins de 5 minutes — avant le premier client du matin.',
              tag: 'Uptime',
              color: 'blue',
            },
            {
              emoji: '🔐',
              before: 'Votre SSL expire demain',
              after: 'Vous avez reçu des rappels à J-14, J-7 et J-1. Chrome n\'affiche pas "Non sécurisé" sur votre site.',
              tag: 'SSL',
              color: 'green',
            },
            {
              emoji: '📉',
              before: 'Votre score SEO baisse de 20 points',
              after: 'L\'alerte automatique vous permet d\'agir avant que Google pénalise votre référencement.',
              tag: 'Score',
              color: 'orange',
            },
          ].map((s, i) => {
            const c = COLORS[s.color];
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`bg-[#0C1627] border ${c.border} rounded-2xl p-5 flex flex-col gap-4`}>
                <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center text-2xl`}>{s.emoji}</div>
                <div>
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Sans Protect</p>
                  <p className="text-white/70 text-sm font-medium">{s.before}</p>
                </div>
                <div className="h-px bg-white/5" />
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${c.text}`}>Avec Protect</p>
                  <p className="text-white/80 text-sm leading-relaxed">{s.after}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Features grid ── */}
      <div className="max-w-6xl mx-auto mb-20">
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-2xl font-bold text-white mb-10">
          Les 6 fonctionnalités incluses
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const c = COLORS[f.color];
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className={`relative overflow-hidden bg-[#0C1627] border ${c.border} rounded-2xl p-5 flex flex-col gap-3 hover:border-opacity-60 transition-all hover:-translate-y-0.5`}>
                <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center ${c.text}`}>
                  {f.icon}
                </div>
                <div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${c.text} block mb-1`}>{f.tag}</span>
                  <h3 className="text-white font-bold text-base">{f.title}</h3>
                </div>
                <p className="text-white/55 text-sm leading-relaxed flex-1">{f.desc}</p>
                <div className="pt-3 border-t border-white/5">
                  <p className="text-white/30 text-xs mb-1">{f.detail}</p>
                  <p className={`text-xs font-semibold ${c.text} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot} inline-block`} />
                    {f.highlight}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Preuve sociale : stats temps réel ── */}
      <div className="max-w-4xl mx-auto mb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Webisafe surveille</h2>
          <p className="text-white/50 text-sm">Données mises à jour en temps réel depuis nos serveurs de surveillance</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0 }}
            className="col-span-3 bg-[#0C1627] border border-white/10 rounded-2xl p-6 text-center"
          >
            <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-success">288</p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">vérifs/site/jour</p>
              </div>
              <p className="text-white/20 text-xl font-light">×</p>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-primary">3</p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">sites surveillés</p>
              </div>
              <p className="text-white/20 text-xl font-light">=</p>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-white">864</p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">vérifications aujourd'hui</p>
              </div>
            </div>
          </motion.div>

          {[
            { value: '14', label: 'alertes envoyées ce mois', color: 'text-warning' },
            { value: '3h', label: 'Dernière alerte envoyée', color: 'text-primary' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i + 1) * 0.1 }}
              className="bg-[#0C1627] border border-white/10 rounded-2xl p-5 text-center"
            >
              <p className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</p>
              <p className="text-white/40 text-xs leading-tight">{stat.label}</p>
            </motion.div>
          ))}
        </div>
        <p className="text-white/25 text-[11px] text-center mt-3">Données mises à jour toutes les 60 secondes depuis Supabase</p>
      </div>

      {/* ── Preuve sociale : fil d'activité anonymisé ── */}
      <div className="max-w-2xl mx-auto mb-20">
        <h2 className="text-center text-lg font-bold text-white mb-6">Activité en temps réel</h2>
        <div className="bg-[#0C1627] border border-white/10 rounded-2xl p-5 space-y-4">
          {[
            { time: 'il y a 23 min', event: 'Site down détecté', detail: 'Alerte envoyée en 4 min', color: '🔴' },
            { time: 'il y a 2h', event: 'SSL expire dans 14 jours', detail: 'Rappel envoyé', color: '🟡' },
            { time: 'il y a 3h', event: 'Scan mensuel complété', detail: 'Score 84/100', color: '🟢' },
            { time: 'il y a 5h', event: 'Scan mensuel complété', detail: 'Score 71/100', color: '🟢' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="text-xs mt-0.5">{item.color}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-xs">{item.time} — {item.event}</p>
                <p className="text-white/80 text-sm font-medium">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Preuve sociale : template témoignage (prêt à remplir) ── */}
      <div className="max-w-2xl mx-auto mb-20">
        <h2 className="text-center text-lg font-bold text-white mb-6">Ce que disent nos abonnés</h2>
        <div className="bg-[#0C1627] border border-success/20 rounded-2xl p-6">
          <p className="text-white/80 text-sm leading-relaxed italic mb-4">
            "Mon site était down depuis 2h un dimanche soir. Webisafe m'a alerté avant mes clients. J'ai réglé le problème avant l'ouverture."
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Konan A.</p>
              <p className="text-white/40 text-xs">Gérant · Boutique e-commerce · Abidjan</p>
            </div>
            <p className="text-warning text-sm tracking-widest">★★★★★</p>
          </div>
        </div>
        <p className="text-white/25 text-[11px] text-center mt-3">
          Format obligatoire : une phrase / prénom + initiale / secteur + ville / pas de photo si refus
        </p>
      </div>

      {/* ── Souscription + FAQ ── */}
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-start">

          {/* FAQ */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Questions fréquentes</h2>
            <div className="space-y-3">
              {FAQ.map((item, i) => <FaqItem key={i} {...item} />)}
            </div>
            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-white/60 text-sm">Une autre question ? Écrivez-nous :</p>
              <a href="mailto:webisafe@gmail.com" className="text-primary text-sm font-semibold hover:underline">webisafe@gmail.com</a>
            </div>
          </div>

          {/* Formulaire */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="sticky top-6 bg-[#0C1627] border border-border-color rounded-[28px] p-7 shadow-[0_0_60px_rgba(21,102,240,0.06)]">

            {/* Indicateur étapes */}
            <div className="flex items-center gap-3 mb-6">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${step >= s ? 'bg-primary border-primary text-white' : 'border-white/20 text-white/30'}`}>{s}</div>
                  {s < 2 && <div className={`w-8 h-px transition-all ${step > s ? 'bg-primary' : 'bg-white/10'}`} />}
                </div>
              ))}
              <span className="ml-auto text-white/30 text-xs">{step}/2</span>
            </div>

            {step === 1 && (
              <>
                <h2 className="text-lg font-bold text-white mb-5">Votre site à surveiller</h2>

                {!user ? (
                  <div className="mb-5 p-4 bg-warning/10 border border-warning/30 rounded-xl">
                    <p className="text-warning text-sm font-semibold mb-2">Connexion requise</p>
                    <p className="text-warning/70 text-xs mb-3">Vous devez être connecté pour souscrire à Protect.</p>
                    <button onClick={() => navigate('/?auth=signup')} className="text-primary text-sm font-semibold hover:underline">
                      Créer un compte gratuitement →
                    </button>
                  </div>
                ) : (
                  <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-success/10 border border-success/20 rounded-xl">
                    <CheckCircle2 size={14} className="text-success flex-shrink-0" />
                    <p className="text-success text-xs font-medium truncate">{user.email}</p>
                  </div>
                )}

                <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">URL de votre site</label>
                <input type="url" value={siteUrl} onChange={e => { setSiteUrl(e.target.value); setErrors(p => ({ ...p, siteUrl: '' })); }}
                  placeholder="https://votresite.ci"
                  className={`w-full px-4 py-3 bg-[#060C1A] border rounded-xl text-white placeholder:text-white/25 focus:outline-none transition mb-1 ${errors.siteUrl ? 'border-danger' : 'border-white/10 focus:border-primary'}`} />
                {errors.siteUrl && <p className="text-danger text-xs mb-3">{errors.siteUrl}</p>}
                {errors.auth && <p className="text-danger text-xs mb-3">{errors.auth}</p>}

                <button onClick={handleStep1} disabled={!user}
                  className="relative overflow-hidden w-full mt-4 py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2.5s_infinite]" />
                  <span className="relative">Continuer vers le paiement</span> <ArrowRight size={16} className="relative" />
                </button>
                <p className="text-center text-white/30 text-xs mt-3">Sans engagement · Résiliable à tout moment</p>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-white">Paiement Wave</h2>
                  <span className="text-white/40 text-xs bg-white/5 px-2 py-1 rounded-lg truncate max-w-[140px]">{siteUrl}</span>
                </div>

                <div className="text-center mb-5 py-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-3xl font-black text-white">{PROTECT_PRICE.toLocaleString('fr-FR')} <span className="text-lg font-normal text-white/50">FCFA</span></p>
                  <p className="text-white/40 text-xs mt-1">Protect Basic · 1 mois</p>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="bg-[#060C1A] border border-white/10 rounded-2xl p-4">
                    <p className="text-white/50 text-xs mb-2">① Envoyez sur Wave Mobile</p>
                    <div className="flex items-center justify-between">
                      <p className="text-primary font-bold text-lg">{WAVE_PHONE_DISPLAY}</p>
                      <button onClick={() => handleCopy(WAVE_PHONE_DISPLAY, 'Numéro copié !')} className="flex items-center gap-1 text-xs text-white/40 hover:text-primary transition bg-white/5 px-2 py-1 rounded-lg">
                        <Copy size={11} /> Copier
                      </button>
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
                    <p className="text-white/50 text-xs mb-2">② Note Wave obligatoire</p>
                    <div className="flex items-center justify-between">
                      <p className="text-primary font-bold text-lg tracking-widest">{paymentCode}</p>
                      <button onClick={() => handleCopy(paymentCode, 'Code copié !')} className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition bg-primary/10 px-2 py-1 rounded-lg">
                        <Copy size={11} /> Copier
                      </button>
                    </div>
                    <p className="text-white/30 text-xs mt-1">Ce code identifie votre paiement</p>
                  </div>
                </div>

                <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">③ Votre numéro Wave expéditeur</label>
                <input type="tel" value={wavePhone} onChange={e => { setWavePhone(e.target.value); setErrors(p => ({ ...p, wavePhone: '' })); }}
                  placeholder="+225 07 00 00 00 00"
                  className={`w-full px-4 py-3 bg-[#060C1A] border rounded-xl text-white placeholder:text-white/25 focus:outline-none transition mb-1 ${errors.wavePhone ? 'border-danger' : 'border-white/10 focus:border-primary'}`} />
                {errors.wavePhone && <p className="text-danger text-xs mb-3">{errors.wavePhone}</p>}

                <button onClick={handleSubmit} disabled={submitting}
                  className="relative overflow-hidden w-full mt-4 py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2.5s_infinite]" />
                  <span className="relative">{submitting ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours...</> : "J'ai payé — Confirmer mon abonnement"}</span>
                </button>
                <button onClick={() => setStep(1)} className="w-full mt-2 py-2 text-white/30 hover:text-white/60 text-xs transition">← Modifier le site</button>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
