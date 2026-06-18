import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wrench,
  Zap,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Clock,
  Smartphone,
  Globe,
  Mail,
  User,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { submitCorrectionRequest } from '../utils/correctionApi';
import { buildPackImprovements } from '../utils/correctionPacks';
import { useScans } from '../hooks/useScans';
import { extractDomain, normalizeURL, isValidURL } from '../utils/validators';

const PACK_ALIAS = { combo: 'standard' };

const PACKS = [
  {
    id: 'rapide',
    name: 'Rapide',
    price: '50 000',
    priceRaw: 50000,
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
    features: [
      'Jusqu’à 3 améliorations rapides du scan',
      'SEO de base : meta tags, Open Graph, sitemap',
      'Optimisation légère des images et contenus',
      'Validation post-correction',
      'Délai : 24–48h',
    ],
    bestFor: 'Sites avec peu d’améliorations ou besoin rapide',
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '85 000',
    priceRaw: 85000,
    icon: Wrench,
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
    popular: true,
    features: [
      'Améliorations prioritaires détectées',
      'Sécurité : headers, HTTPS, mixed-content',
      'Performance : cache, compression, poids de page',
      'SEO : indexation, canonical, schema.org',
      'Délai : 3–5 jours',
    ],
    bestFor: 'La majorité des sites audités — le choix recommandé',
  },
  {
    id: 'complet',
    name: 'Complet',
    price: '150 000+',
    priceRaw: 150000,
    icon: Shield,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    features: [
      'Toutes les améliorations détectées par le scan',
      'Refonte ciblée mobile & responsive si nécessaire',
      'Monitoring WebiSafe Protect',
      'Audit post-correction + rapport PDF',
      'Délai : 1–2 semaines',
    ],
    bestFor: 'Sites critiques, e-commerce, institutions ou refonte complète',
  },
];

function PackCard({ pack, selected, onSelect, hasScanRecommendations }) {
  const Icon = pack.icon;
  const visibleImprovements = pack.scanImprovements?.slice(0, pack.id === 'complet' ? 6 : 4) ?? [];
  const hiddenImprovements = (pack.scanImprovements?.length ?? 0) - visibleImprovements.length;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(pack.id)}
      className={`relative w-full text-left rounded-2xl border p-6 transition-all ${
        selected
          ? `${pack.bg} ring-1 ring-inset ring-current`
          : 'bg-[#0F172A]/60 border-white/10 hover:border-white/20'
      }`}
    >
      {pack.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
          <Zap size={10} /> Recommandé
        </span>
      )}

      <div className={`mb-4 inline-flex rounded-xl p-3 ${pack.bg}`}>
        <Icon size={24} className={pack.color} />
      </div>

      <h3 className="text-xl font-bold text-white mb-1">{pack.name}</h3>
      <p className={`text-2xl font-bold ${pack.color} mb-4`}>
        {pack.price} <span className="text-sm font-medium text-white/60">FCFA</span>
      </p>

      <ul className="space-y-2 mb-4">
        {pack.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-white/80">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-emerald-400" />
            {f}
          </li>
        ))}
      </ul>

      {visibleImprovements.length > 0 && (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
            {hasScanRecommendations ? 'Améliorations du scan incluses' : 'Améliorations possibles incluses'}
          </p>
          <ul className="space-y-1.5">
            {visibleImprovements.map((improvement, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0 text-primary" />
                {improvement}
              </li>
            ))}
          </ul>
          {hiddenImprovements > 0 && (
            <p className="mt-2 text-xs font-medium text-primary">
              + {hiddenImprovements} autre{hiddenImprovements > 1 ? 's' : ''} amélioration{hiddenImprovements > 1 ? 's' : ''} incluse{hiddenImprovements > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-white/40 italic">{pack.bestFor}</p>

      {selected && (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
          <CheckCircle2 size={16} /> Pack sélectionné
        </div>
      )}
    </motion.button>
  );
}

export default function Corrections() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { scans } = useScans();
  const prefilledUrl = searchParams.get('url') || '';
  const prefilledPackParam = searchParams.get('pack') || '';
  const initialPack = PACK_ALIAS[prefilledPackParam]
    ?? (PACKS.some((p) => p.id === prefilledPackParam) ? prefilledPackParam : 'standard');

  const [selectedPack, setSelectedPack] = useState(initialPack);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    url: prefilledUrl,
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const activeUrl = form.url || prefilledUrl;
  const relatedScan = useMemo(() => {
    if (!activeUrl) return null;

    const normalizedActiveUrl = normalizeURL(activeUrl);
    const activeDomain = extractDomain(activeUrl);

    return [...scans]
      .filter((scan) => {
        const scanUrl = scan?.url || scan?.requested_url || scan?.final_url || '';
        if (!scanUrl) return false;
        return normalizeURL(scanUrl) === normalizedActiveUrl || extractDomain(scanUrl) === activeDomain;
      })
      .sort((a, b) => new Date(b.scanned_at || b.savedAt || 0) - new Date(a.scanned_at || a.savedAt || 0))[0] || null;
  }, [activeUrl, scans]);
  const scanRecommendations = relatedScan?.recommendations || relatedScan?.recommandations || [];
  const packImprovements = useMemo(() => buildPackImprovements(scanRecommendations), [scanRecommendations]);
  const hasScanRecommendations = scanRecommendations.length > 0;
  const packs = useMemo(
    () => PACKS.map((pack) => ({ ...pack, scanImprovements: packImprovements[pack.id] ?? [] })),
    [packImprovements]
  );

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Votre nom est requis';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Email valide requis';
    if (!form.url.trim()) {
      e.url = "L'URL du site est requise";
    } else if (!isValidURL(form.url)) {
      e.url = "Veuillez entrer une URL ou un nom de domaine valide (ex: monsite.ci)";
    }
    if (!selectedPack) e.pack = 'Veuillez choisir un pack';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const selectedImprovements = packImprovements[selectedPack] ?? [];
      const correctionContext = selectedImprovements.length > 0
        ? `Améliorations prises en charge par le pack ${PACKS.find((p) => p.id === selectedPack)?.name || selectedPack} :\n- ${selectedImprovements.join('\n- ')}`
        : '';
      const fullMessage = [form.message.trim(), correctionContext].filter(Boolean).join('\n\n');

      await submitCorrectionRequest({
        name: form.name,
        email: form.email,
        phone: form.phone,
        url: normalizeURL(form.url),
        pack: selectedPack,
        message: fullMessage,
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors({ global: err.message || 'Erreur réseau. Réessayez.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen pt-24 pb-20 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center"
        >
          <div className="inline-flex rounded-full bg-emerald-400/10 p-4 mb-6">
            <CheckCircle2 size={48} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Demande envoyée !</h1>
          <p className="text-white/70 mb-2">
            Notre équipe vous recontacte sous <strong>24 heures</strong> avec un devis détaillé.
          </p>
          <p className="text-white/50 text-sm mb-8">
            Vérifiez votre boîte email (et vos spams) pour la confirmation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-colors"
            >
              Retour à l'accueil
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({ name: '', email: '', phone: '', url: '', message: '' });
              }}
              className="px-6 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              Nouvelle demande
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Bouton retour */}
        <div className="mb-4">
          <button
            onClick={() => {
              if (relatedScan?.id) {
                navigate(`/rapport/${relatedScan.id}`);
              } else if (prefilledUrl) {
                navigate(`/analyse?url=${encodeURIComponent(prefilledUrl)}`);
              } else {
                navigate('/');
              }
            }}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            {relatedScan?.id ? "Retour au rapport d'audit" : prefilledUrl ? "Retour à l'analyse" : "Retour à l'accueil"}
          </button>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            <Wrench size={14} /> Service clé-en-main
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Votre site est diagnostiqué.<br />
            <span className="text-primary">Faites-le soigner.</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Vous avez reçu votre audit. Vous savez ce qui ne va pas.{' '}
            <strong className="text-white">Ne cherchez pas un développeur.</strong>{' '}
            Notre équipe corrige tout pour vous.
          </p>
        </motion.div>

        {/* Alert si URL pré-remplie */}
        {prefilledUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3"
          >
            <Globe size={18} className="mt-0.5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">Site concerné : {prefilledUrl}</p>
              <p className="text-xs text-white/50">
                Les packs ci-dessous sont proposés pour ce site. Vous pouvez modifier l'URL dans le formulaire.
              </p>
            </div>
          </motion.div>
        )}

        {/* Packs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Choisissez votre pack</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packs.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                selected={selectedPack === pack.id}
                onSelect={setSelectedPack}
                hasScanRecommendations={hasScanRecommendations}
              />
            ))}
          </div>
        </motion.div>

        {/* Formulaire */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <div className="rounded-2xl border border-white/10 bg-[#0F172A]/60 p-6 md:p-8">
            <h3 className="text-xl font-bold text-white mb-1">Demander un devis</h3>
            <p className="text-sm text-white/50 mb-6">
              Remplissez ce formulaire. Nous vous recontactons sous 24h avec un devis précis et un planning.
            </p>

            {errors.global && (
              <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 flex items-start gap-2 text-sm text-red-300">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                {errors.global}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    <User size={14} className="inline mr-1" /> Nom complet
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Aïcha Koné"
                    className="w-full rounded-xl border border-white/10 bg-dark-navy px-4 py-3 text-white placeholder-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    <Mail size={14} className="inline mr-1" /> Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="aicha@monentreprise.ci"
                    className="w-full rounded-xl border border-white/10 bg-dark-navy px-4 py-3 text-white placeholder-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    <Smartphone size={14} className="inline mr-1" /> Téléphone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="01 02 03 04 05"
                    className="w-full rounded-xl border border-white/10 bg-dark-navy px-4 py-3 text-white placeholder-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    <Globe size={14} className="inline mr-1" /> URL du site à corriger
                  </label>
                  <input
                    type="text"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val && isValidURL(val)) {
                        setForm((f) => ({ ...f, url: normalizeURL(val) }));
                      }
                    }}
                    placeholder="monsite.ci ou https://monsite.ci"
                    className="w-full rounded-xl border border-white/10 bg-dark-navy px-4 py-3 text-white placeholder-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                  {errors.url && <p className="text-xs text-red-400 mt-1">{errors.url}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  <FileText size={14} className="inline mr-1" /> Décrivez vos priorités (optionnel)
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Ex: Mon site est très lent sur mobile, et je ne reçois aucun formulaire de contact..."
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-dark-navy px-4 py-3 text-white placeholder-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all resize-none"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/70">Pack sélectionné</span>
                  <span className="text-sm font-bold text-primary">
                    {packs.find((p) => p.id === selectedPack)?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Prix estimé</span>
                  <span className="text-lg font-bold text-white">
                    {packs.find((p) => p.id === selectedPack)?.price}{' '}
                    <span className="text-sm font-normal text-white/60">FCFA</span>
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Le prix final sera confirmé après audit technique rapide (gratuit) sous 24h.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-[0_0_24px_rgba(21,102,240,0.4)]"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Envoi en cours...
                  </>
                ) : (
                  <>
                    <Wrench size={18} /> Envoyer ma demande de correction
                  </>
                )}
              </button>

              <p className="text-center text-xs text-white/40">
                Paiement par Wave après validation du devis. Aucun prélèvement automatique.
              </p>
            </form>
          </div>
        </motion.div>

        {/* FAQ mini */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center"
        >
          <div className="rounded-xl border border-white/10 bg-[#0F172A]/40 p-4">
            <Clock size={20} className="mx-auto mb-2 text-primary" />
            <p className="text-sm font-semibold text-white">Réponse sous 24h</p>
            <p className="text-xs text-white/50">Devis précis + planning</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0F172A]/40 p-4">
            <Smartphone size={20} className="mx-auto mb-2 text-primary" />
            <p className="text-sm font-semibold text-white">Paiement Wave</p>
            <p className="text-xs text-white/50">Après validation du devis</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0F172A]/40 p-4">
            <Shield size={20} className="mx-auto mb-2 text-primary" />
            <p className="text-sm font-semibold text-white">Garantie 30 jours</p>
            <p className="text-xs text-white/50">Rescan offert post-correction</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
