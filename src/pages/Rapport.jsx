import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Share2,
  ArrowLeft,
  CheckCircle,
  MessageCircle,
  Clock,
  BarChart3,
  Shield,
  Search,
  Smartphone,
  Zap,
  MapPin,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';

import PremiumScoreCard from '../components/PremiumScoreCard';
import RecommendationCard from '../components/RecommendationCard';
import HighlightedTechText from '../components/HighlightedTechText';

import { useScans } from '../hooks/useScans';
import { generatePDF } from '../utils/generatePDF';
import { getScoreBadge } from '../utils/calculateScore';
import { formatDate, extractDomain } from '../utils/validators';
import { buildPremiumExplanationParagraphs } from '../utils/premiumExplanation';
import { fetchLatestPaymentRequest, fetchRemoteScan } from '../utils/paymentApi';
import { REPORT_FIX_WHATSAPP, WAVE_SUPPORT_WHATSAPP } from '../utils/wavePayment';
import { isKnownLargeSite, getLargeSiteDisclaimer } from '../utils/knownSites';
import { runFullAnalysis } from '../utils/api';

// ── Helpers UI ────────────────────────────────────────────────────────────────
function MetricRow({ label, value, status }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-color last:border-0">
      <span className="text-text-secondary text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-text-primary text-sm font-medium">{value ?? 'N/A'}</span>
        {status && (
          <span>
            {status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌'}
          </span>
        )}
      </div>
    </div>
  );
}

function SeverityPill({ severity }) {
  const s = String(severity || '').toLowerCase();
  const cls =
    s === 'high'
      ? 'bg-red-500/15 border-red-500/30 text-red-300'
      : s === 'medium'
        ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
        : 'bg-white/5 border-white/10 text-white/60';
  const label = s === 'high' ? 'Critique' : s === 'medium' ? 'Avertissement' : 'Info';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function CriticalAlertsBanner({ alerts }) {
  const [dismissed, setDismissed] = useState([]);
  if (!Array.isArray(alerts) || alerts.length === 0) return null;
  const visible = alerts.filter((_, i) => !dismissed.includes(i));
  if (visible.length === 0) return null;

  const SEVERITY_STYLE = {
    critical: 'bg-red-500/15 border-red-500/40 text-red-300',
    high: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
    warning: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200',
  };
  const SEVERITY_ICON = { critical: '🚨', high: '⚠️', warning: '🌍' };

  return (
    <div className="space-y-3 mb-8">
      <AnimatePresence>
        {alerts.map((alert, i) => {
          if (dismissed.includes(i)) return null;
          const style = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.warning;
          const icon = SEVERITY_ICON[alert.severity] ?? '⚠️';
          return (
            <motion.div
              key={`${alert.title}-${i}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex items-start gap-3 p-4 rounded-xl border ${style}`}
            >
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{alert.title}</p>
                {alert.message && <p className="text-white/70 text-xs mt-0.5">{alert.message}</p>}
                {alert.impact && <p className="text-white/50 text-xs mt-0.5">Impact : {alert.impact}</p>}
                {alert.recommendation && (
                  <p className="text-white/50 text-xs mt-0.5">Conseil : {alert.recommendation}</p>
                )}
              </div>
              <button
                onClick={() => setDismissed((d) => [...d, i])}
                className="flex-shrink-0 text-white/30 hover:text-white/70 transition-colors"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function ServerLocationBox({ serverLocation }) {
  if (!serverLocation) return null;
  const isWarning = serverLocation?.latency_warning?.warning;
  return (
    <div className={`rounded-2xl border p-4 ${isWarning ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
      <div className="flex items-start gap-3">
        <MapPin size={16} className={`mt-0.5 ${isWarning ? 'text-yellow-200' : 'text-green-200'}`} />
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">
            Serveur : {serverLocation.city}, {serverLocation.country}
          </p>
          {serverLocation.isp && (
            <p className="text-white/60 text-xs mt-0.5">ISP : {serverLocation.isp}</p>
          )}
          {serverLocation.latency_warning?.message && (
            <p className={`text-xs mt-2 ${isWarning ? 'text-yellow-200/90' : 'text-green-200/90'}`}>
              {serverLocation.latency_warning.message}
            </p>
          )}
          {serverLocation.latency_warning?.impact && (
            <p className="text-white/50 text-xs mt-1">Impact : {serverLocation.latency_warning.impact}</p>
          )}
          {serverLocation.latency_warning?.recommendation && (
            <p className="text-white/50 text-xs mt-1">Conseil : {serverLocation.latency_warning.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Disclaimer grands sites ───────────────────────────────────────────────────
function LargeSiteDisclaimer({ url, score }) {
  const disclaimer = isKnownLargeSite(url) ? getLargeSiteDisclaimer(score) : null;
  if (!disclaimer) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300"
    >
      <span className="font-semibold">ℹ️ {disclaimer.title} : </span>
      {disclaimer.message}
    </motion.div>
  );
}

// ── Formatage date du scan ────────────────────────────────────────────────────
function formatScanDate(isoString) {
  if (!isoString) return null;
  try {
    return new Date(isoString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

// ── Normalisation scan ────────────────────────────────────────────────────────
function normalizeScan(scan) {
  if (!scan || typeof scan !== 'object') return null;

  const scores = scan.scores ?? {};
  const metrics = scan.metrics ?? {};

  const perfM = metrics.performance ?? null;
  const secM = metrics.security ?? null;
  const seoM = metrics.seo ?? null;
  const uxM = metrics.ux ?? null;

  const globalScore =
    Number.isFinite(Number(scan.global_score)) ? Number(scan.global_score)
      : Number.isFinite(Number(scores.global)) ? Number(scores.global)
        : null;

  const uxScore =
    Number.isFinite(Number(scores.ux)) ? Number(scores.ux)
      : Number.isFinite(Number(scores.ux_mobile)) ? Number(scores.ux_mobile)
        : Number.isFinite(Number(uxM?.accessibility_score)) ? Number(uxM.accessibility_score)
          : null;

  const serverLocation =
    perfM?.server_location ?? scan.performance?.server_location ?? null;

  const opportunities =
    perfM?.opportunities ?? scan.performance?.opportunities ?? [];

  const uxIssues = uxM?.issues ?? scan.ux?.issues ?? [];
  const missingHeaders = secM?.headers_manquants ?? scan.security?.headers_manquants ?? [];
  const cookieIssues = secM?.cookie_issues ?? scan.security?.cookie_issues ?? [];
  const sensitiveFiles = secM?.sensitive_files ?? scan.security?.sensitive_files ?? null;
  const criticalAlerts = Array.isArray(scan.critical_alerts) ? scan.critical_alerts : [];

  // Date du scan : priorité au champ backend scanned_at
  const scannedAt =
    scan.scanned_at ??
    scan.scanDate ??
    scan.created_at ??
    null;

  return {
    raw: scan,
    globalScore,
    grade: scan.grade ?? null,
    scannedAt,
    scores: {
      global: globalScore,
      performance: scores.performance ?? null,
      security: scores.security ?? null,
      seo: scores.seo ?? null,
      ux: uxScore,
      ux_mobile: uxScore,
    },
    metrics: { performance: perfM, security: secM, seo: seoM, ux: uxM },
    criticalAlerts,
    serverLocation,
    opportunities,
    uxIssues,
    missingHeaders,
    cookieIssues,
    sensitiveFiles,
  };
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Rapport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getScan, isPaid, markAsPaid, saveScan } = useScans();

  const [scan, setScan] = useState(null);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRescanning, setIsRescanning] = useState(false);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoading(true);
      const localScan = getScan(id);
      const locallyPaid = isPaid(id);

      if (localScan && active) {
        setScan({ ...localScan, paid: Boolean(localScan.paid || locallyPaid) });
      }

      try {
        const [remoteScan, latestPayment] = await Promise.all([
          fetchRemoteScan(id).catch(() => null),
          fetchLatestPaymentRequest(id).catch(() => null),
        ]);

        if (!active) return;
        if (latestPayment) setPaymentRequest(latestPayment);

        const resolvedScan = remoteScan || localScan;
        if (!resolvedScan) { navigate('/'); return; }

        const unlocked =
          Boolean(resolvedScan.paid || locallyPaid) ||
          latestPayment?.status === 'validated';

        if (unlocked) markAsPaid(id);

        const hydratedScan = { ...resolvedScan, id, paid: unlocked };
        setScan(hydratedScan);
        saveScan(hydratedScan);
      } catch {
        if (!localScan) navigate('/');
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    return () => { active = false; };
  }, [getScan, id, isPaid, markAsPaid, navigate, saveScan]);

  // Polling paiement
  useEffect(() => {
    if (!scan || scan.paid) return undefined;
    const interval = window.setInterval(async () => {
      try {
        const [remoteScan, latestPayment] = await Promise.all([
          fetchRemoteScan(id).catch(() => null),
          fetchLatestPaymentRequest(id).catch(() => null),
        ]);
        if (latestPayment) setPaymentRequest(latestPayment);
        const unlocked =
          Boolean(remoteScan?.paid || isPaid(id)) ||
          latestPayment?.status === 'validated';
        if (unlocked && (remoteScan || scan)) {
          markAsPaid(id);
          const hydratedScan = { ...(remoteScan || scan), id, paid: true };
          setScan(hydratedScan);
          saveScan(hydratedScan);
        }
      } catch { /* silencieux */ }
    }, 30000);
    return () => window.clearInterval(interval);
  }, [id, isPaid, markAsPaid, saveScan, scan]);

  // ── Rescan ────────────────────────────────────────────────────────────────
  const handleRescan = useCallback(async () => {
    if (!scan?.url || isRescanning) return;
    setIsRescanning(true);
    try {
      const freshData = await runFullAnalysis(scan.url, () => { }, scan?.email || scan?.user_email || '');
      if (freshData?.success) {
        const freshScan = {
          ...freshData,
          id,
          paid: scan.paid,
          scanned_at: new Date().toISOString(),
        };
        setScan(freshScan);
        saveScan(freshScan);
      }
    } catch (e) {
      console.error('Rescan error:', e);
    } finally {
      setIsRescanning(false);
    }
  }, [scan, isRescanning, id, saveScan]);

  const norm = useMemo(() => normalizeScan(scan), [scan]);

  if (loading && !scan) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Chargement du rapport...</h2>
          <p className="text-white/70 text-sm">Préparation de votre audit premium.</p>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Rapport introuvable</h2>
          <button onClick={() => navigate('/')} className="text-primary hover:underline">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Non payé → écran d'attente
  if (!scan.paid) {
    return (
      <div className="min-h-screen px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto rounded-[28px] border border-primary/20 bg-card-bg p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock size={38} />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-white">Rapport en cours de validation</h1>
          <p className="mt-4 text-sm leading-7 text-white/70">
            Votre paiement est en cours de vérification. Vous recevrez un email dès que votre rapport premium sera prêt.
          </p>
          {paymentRequest?.payment_code && (
            <div className="mt-6 rounded-2xl border border-primary/20 bg-[#0F172A] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">Code de paiement</p>
              <p className="mt-2 text-2xl font-bold tracking-[0.2em] text-primary">
                {paymentRequest.payment_code}
              </p>
            </div>
          )}
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0F172A]/70 p-5 text-left">
            <p className="text-sm font-semibold text-white">Vérification automatique active</p>
            <p className="mt-2 text-sm text-white/65">
              Cette page se rechargera silencieusement toutes les 30 secondes jusqu'à validation.
            </p>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/${WAVE_SUPPORT_WHATSAPP}?text=${encodeURIComponent(
                `Bonjour, je souhaite vérifier mon paiement Webisafe pour ${scan.url}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-success px-6 py-3 text-sm font-semibold text-white transition hover:bg-success/90"
            >
              <MessageCircle size={16} />
              Contacter le support
            </a>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full border border-border-color px-6 py-3 text-sm font-semibold text-white transition hover:border-primary/50"
            >
              Recharger maintenant
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = () => {
    try { generatePDF(scan); }
    catch (error) { console.error('Erreur PDF:', error); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sections = [
    { id: 'overview', label: "Vue d'ensemble", icon: <BarChart3 size={16} /> },
    { id: 'performance', label: 'Performance', icon: <Zap size={16} /> },
    { id: 'security', label: 'Sécurité', icon: <Shield size={16} /> },
    { id: 'seo', label: 'SEO', icon: <Search size={16} /> },
    { id: 'ux', label: 'UX Mobile', icon: <Smartphone size={16} /> },
    { id: 'recommendations', label: "Plan d'action", icon: <CheckCircle size={16} /> },
  ];

  const premiumNarrative = buildPremiumExplanationParagraphs(scan.recommendations || []);

  const scanDateText = (() => {
    const d = norm?.scannedAt || scan.scanDate || scan.created_at || null;
    return formatScanDate(d) || formatDate(new Date().toISOString());
  })();

  const perfM = norm?.metrics?.performance ?? {};
  const secM = norm?.metrics?.security ?? {};
  const seoM = norm?.metrics?.seo ?? {};
  const uxM = norm?.metrics?.ux ?? {};

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-white hover:text-primary text-sm mb-2 transition-colors"
            >
              <ArrowLeft size={16} /> Retour
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-white">
                W
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  RAPPORT D'AUDIT PREMIUM — {extractDomain(scan.url)}
                </h1>
                {/* Date + durée du scan */}
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-white/50 text-xs">🕐 Analysé le {scanDateText}</p>
                  {scan.scan_duration_ms && (
                    <p className="text-white/30 text-xs">
                      · en {(scan.scan_duration_ms / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end ml-auto">
            <span className="rounded-full border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold text-success">
              Rapport Premium Activé
            </span>

            {/* Bouton Relancer le scan */}
            <button
              onClick={handleRescan}
              disabled={isRescanning}
              title="Relancer l'analyse pour obtenir des données fraîches"
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-color hover:border-primary/50 text-text-secondary hover:text-white text-sm transition-all disabled:opacity-50"
            >
              {isRescanning
                ? <Loader2 size={14} className="animate-spin" />
                : <RefreshCw size={14} />
              }
              <span className="hidden sm:inline">
                {isRescanning ? 'Analyse...' : 'Relancer'}
              </span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium text-sm transition-all btn-glow"
            >
              <Download size={16} />
              Télécharger PDF
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-card-bg border border-border-color hover:border-primary/50 text-text-primary rounded-xl text-sm transition-all"
            >
              <Share2 size={16} />
              {copied ? 'Copié !' : 'Partager'}
            </button>
          </div>
        </motion.div>

        {/* ── Disclaimer grands sites ─────────────────────────────────────── */}
        <LargeSiteDisclaimer url={scan.url} score={norm?.globalScore ?? 0} />

        {/* ── Alertes critiques ───────────────────────────────────────────── */}
        <CriticalAlertsBanner alerts={norm?.criticalAlerts ?? []} />

        {/* ── Navigation sections ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-card-bg rounded-xl border border-border-color">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeSection === section.id
                  ? 'bg-primary text-white'
                  : 'text-white hover:text-white hover:bg-dark-navy'
                }`}
            >
              {section.icon}
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
        <section id="overview" className="mb-12">
          <PremiumScoreCard
            score={norm?.scores?.global ?? scan?.scores?.global ?? scan?.global_score ?? 0}
            domain={extractDomain(scan.url)}
            badgeLiftMobile={true}
          />

          {norm?.serverLocation && (
            <div className="mt-4">
              <ServerLocationBox serverLocation={norm.serverLocation} />
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { name: 'Performance', score: norm?.scores?.performance, icon: '⚡' },
              { name: 'Sécurité', score: norm?.scores?.security, icon: '🔒' },
              { name: 'SEO', score: norm?.scores?.seo, icon: '🔍' },
              { name: 'UX Mobile', score: norm?.scores?.ux, icon: '📱' },
            ].map((cat) => {
              const badge = getScoreBadge(cat.score ?? 0);
              return (
                <div key={cat.name} className="bg-dark-navy rounded-xl p-4 text-center">
                  <span className="text-2xl">{cat.icon}</span>
                  <p className="text-white font-bold text-xl mt-2">
                    {cat.score ?? 'N/A'}
                    {cat.score != null && <span className="text-white text-sm">/100</span>}
                  </p>
                  <p className="text-white text-xs mt-1">{cat.name}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 ${badge.color}`}>
                    {badge.text}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── NARRATIVE ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
          className="scan-conclusion-card relative overflow-hidden rounded-[28px] p-[1px] mb-12"
        >
          <div className="scan-conclusion-glow absolute -inset-10 opacity-70" />
          <div className="scan-conclusion-sheen absolute inset-y-0 -left-1/3 w-1/3" />

          <div className="relative bg-[#111b2e]/95 backdrop-blur-xl rounded-[27px] border border-white/8 px-6 py-6 md:px-8 md:py-7">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-warning">
                    Lecture experte
                  </span>
                  <h2 className="mt-3 text-xl md:text-2xl font-bold text-white">
                    Ce que révèle votre audit premium
                  </h2>
                </div>
                <div className="scan-conclusion-pulse self-start rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary shadow-[0_0_25px_rgba(21,102,240,0.18)]">
                  Priorités de correction
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-primary/40 via-white/10 to-transparent" />

              <div className="space-y-4">
                {premiumNarrative.map((paragraph, index) => (
                  <p
                    key={index}
                    className={`max-w-4xl text-sm md:text-[15px] leading-7 ${index === 0 ? 'text-white/92' : 'text-white'}`}
                  >
                    <HighlightedTechText text={paragraph} />
                  </p>
                ))}
              </div>

              <div className="pt-2 flex justify-center">
                <a
                  href={`https://wa.me/${REPORT_FIX_WHATSAPP}?text=${encodeURIComponent(
                    `Bonjour, j'ai reçu mon rapport pour ${scan.url} et je voudrais corriger les failles.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/90 text-white rounded-full font-semibold transition-all"
                >
                  <MessageCircle size={16} />
                  Contacter Webisafe pour corriger
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── PERFORMANCE ────────────────────────────────────────────────── */}
        <section id="performance" className="mb-8">
          <div className="bg-card-bg border border-border-color rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">⚡ Performance</h2>

            {perfM?.partial && (
              <div className="mb-4 rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-yellow-200 text-xs">
                Données partielles — PageSpeed n'a pas pu analyser ce site complètement. Le score est estimé.
              </div>
            )}

            {norm?.serverLocation && (
              <div className="mb-4">
                <ServerLocationBox serverLocation={norm.serverLocation} />
              </div>
            )}

            <MetricRow label="Score Performance" value={`${norm?.scores?.performance ?? 'N/A'}/100`} />
            <MetricRow label="LCP" value={perfM?.lcp != null ? `${Math.round(perfM.lcp)} ms` : 'N/A'} />
            <MetricRow label="FCP" value={perfM?.fcp != null ? `${Math.round(perfM.fcp)} ms` : 'N/A'} />
            <MetricRow label="CLS" value={perfM?.cls != null ? perfM.cls.toFixed(3) : 'N/A'} />
            <MetricRow label="TBT" value={perfM?.tbt != null ? `${Math.round(perfM.tbt)} ms` : 'N/A'} />
            <MetricRow label="TTI" value={perfM?.tti != null ? `${Math.round(perfM.tti)} ms` : 'N/A'} />
            <MetricRow label="Poids page" value={perfM?.page_weight_mb != null ? `${perfM.page_weight_mb} MB` : 'N/A'} />

            {Array.isArray(norm?.opportunities) && norm.opportunities.length > 0 && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0F172A]/60 p-5">
                <p className="text-white font-semibold text-sm mb-3">
                  Top optimisations recommandées (PageSpeed)
                </p>
                <div className="space-y-3">
                  {norm.opportunities.map((op, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-card-bg/30 p-4">
                      <p className="text-white text-sm font-semibold">{op.title}</p>
                      {op.description && (
                        <p className="text-white/60 text-xs mt-1">{op.description}</p>
                      )}
                      {op.savings_ms != null && (
                        <p className="text-primary text-xs mt-2">
                          Gain estimé : ~{Math.round(op.savings_ms)} ms
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── SECURITY ───────────────────────────────────────────────────── */}
        <section id="security" className="mb-8">
          <div className="bg-card-bg border border-border-color rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🔒 Sécurité</h2>

            <MetricRow label="Score Sécurité" value={`${norm?.scores?.security ?? 'N/A'}/100`} />
            <MetricRow
              label="SSL Grade"
              value={secM?.ssl_grade ?? 'N/A'}
              status={
                secM?.ssl_grade === 'A+' || secM?.ssl_grade === 'A' ? 'pass'
                  : secM?.ssl_grade === 'B' ? 'warn'
                    : secM?.ssl_grade ? 'fail' : null
              }
            />
            <MetricRow
              label="Malware (VirusTotal)"
              value={
                secM?.malware_detected === true ? '🚨 Détecté'
                  : secM?.malware_detected === false ? 'Aucun'
                    : 'N/A'
              }
              status={
                secM?.malware_detected === true ? 'fail'
                  : secM?.malware_detected === false ? 'pass'
                    : null
              }
            />
            <MetricRow
              label="HTTPS"
              value={secM?.https ? 'Activé' : 'Non activé'}
              status={secM?.https ? 'pass' : 'fail'}
            />

            {/* Fichiers sensibles */}
            {norm?.sensitiveFiles?.critical && (
              <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-5">
                <p className="text-red-200 font-semibold text-sm">🚨 Fichiers sensibles exposés</p>
                {norm.sensitiveFiles.alert_message && (
                  <p className="text-red-200/80 text-xs mt-1">{norm.sensitiveFiles.alert_message}</p>
                )}
                <ul className="mt-3 text-white/80 text-sm space-y-1">
                  {(norm.sensitiveFiles.exposed_files ?? []).map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Headers manquants */}
            {Array.isArray(norm?.missingHeaders) && norm.missingHeaders.length > 0 && (
              <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
                <p className="text-orange-200 font-semibold text-sm">
                  Headers de sécurité manquants ({norm.missingHeaders.length})
                </p>
                <div className="mt-3 space-y-2">
                  {norm.missingHeaders.map((h, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-card-bg/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-white text-sm font-semibold">
                          {typeof h === 'string' ? h : h.header}
                        </p>
                        <SeverityPill severity="medium" />
                      </div>
                      {typeof h !== 'string' && h.message && (
                        <p className="text-white/65 text-xs mt-1">{h.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cookie issues */}
            {Array.isArray(norm?.cookieIssues) && norm.cookieIssues.length > 0 && (
              <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                <p className="text-yellow-200 font-semibold text-sm">Problèmes cookies</p>
                <ul className="mt-3 text-white/80 text-sm space-y-1">
                  {norm.cookieIssues.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ── SEO ────────────────────────────────────────────────────────── */}
        <section id="seo" className="mb-8">
          <div className="bg-card-bg border border-border-color rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🔍 SEO</h2>

            <MetricRow label="Score SEO" value={`${norm?.scores?.seo ?? 'N/A'}/100`} />
            <MetricRow
              label="Title"
              value={seoM?.has_title ? 'Présent' : 'Absent'}
              status={seoM?.has_title ? 'pass' : 'fail'}
            />
            <MetricRow
              label="Meta Description"
              value={seoM?.has_description ? 'Présente' : 'Absente'}
              status={seoM?.has_description ? 'pass' : 'fail'}
            />
            <MetricRow
              label="H1"
              value={seoM?.h1_count != null ? String(seoM.h1_count) : 'N/A'}
              status={seoM?.h1_count === 1 ? 'pass' : seoM?.h1_count === 0 ? 'fail' : 'warn'}
            />
            <MetricRow
              label="Sitemap"
              value={seoM?.has_sitemap ? 'Présent' : 'Absent'}
              status={seoM?.has_sitemap ? 'pass' : 'fail'}
            />
            <MetricRow
              label="Viewport"
              value={seoM?.has_viewport ? 'OK' : 'Absent'}
              status={seoM?.has_viewport ? 'pass' : 'fail'}
            />
            <MetricRow
              label="Canonical"
              value={seoM?.has_canonical ? 'Présente' : 'Absente'}
              status={seoM?.has_canonical ? 'pass' : 'warn'}
            />
            <MetricRow
              label="Open Graph"
              value={seoM?.has_open_graph ? 'Présent' : 'Absent'}
              status={seoM?.has_open_graph ? 'pass' : 'warn'}
            />
            <MetricRow
              label="Indexable"
              value={seoM?.is_indexable ? 'Oui' : 'Bloqué (noindex)'}
              status={seoM?.is_indexable ? 'pass' : 'fail'}
            />
          </div>
        </section>

        {/* ── UX ─────────────────────────────────────────────────────────── */}
        <section id="ux" className="mb-8">
          <div className="bg-card-bg border border-border-color rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">📱 UX Mobile</h2>

            <MetricRow label="Score UX" value={`${norm?.scores?.ux ?? 'N/A'}/100`} />
            <MetricRow label="Grade UX" value={uxM?.grade ?? 'N/A'} />
            <MetricRow
              label="Responsive (Viewport)"
              value={uxM?.issues?.find(i => i.message?.includes('viewport')) ? 'Absent' : 'OK'}
              status={uxM?.issues?.find(i => i.message?.includes('viewport')) ? 'fail' : 'pass'}
            />
            <MetricRow
              label="Compression (gzip/brotli)"
              value={uxM?.issues?.find(i => i.message?.includes('Compression')) ? 'Désactivée' : 'Active'}
              status={uxM?.issues?.find(i => i.message?.includes('Compression')) ? 'fail' : 'pass'}
            />

            {Array.isArray(norm?.uxIssues) && norm.uxIssues.length > 0 && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0F172A]/60 p-5">
                <p className="text-white font-semibold text-sm mb-3">
                  Problèmes détectés ({norm.uxIssues.length})
                </p>
                <div className="space-y-3">
                  {norm.uxIssues.map((issue, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-card-bg/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-white text-sm font-semibold">{issue.message}</p>
                        <SeverityPill severity={issue.severity} />
                      </div>
                      {issue.impact && (
                        <p className="text-white/65 text-xs mt-1">Impact : {issue.impact}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── RECOMMENDATIONS ────────────────────────────────────────────── */}
        <section id="recommendations" className="mb-12">
          <h2 className="text-xl font-bold text-white mb-2">📋 Plan d'Action Recommandé</h2>
          <p className="text-white/60 text-sm mb-6">
            {scan.recommendations?.length ?? 0} corrections classées par priorité
          </p>
          <div className="space-y-4">
            {(scan.recommendations ?? []).map((recommendation, index) => (
              <RecommendationCard
                key={index}
                recommendation={recommendation}
                index={index}
                isLocked={false}
              />
            ))}
          </div>
        </section>

        {/* ── Rescan info ─────────────────────────────────────────────────── */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center mb-8">
          <RefreshCw size={24} className="text-primary mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Données à jour ?</p>
          <p className="text-white/50 text-sm mb-4">
            Relancez une analyse pour obtenir des métriques fraîches après vos corrections.
          </p>
          <button
            onClick={handleRescan}
            disabled={isRescanning}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50"
          >
            {isRescanning
              ? <Loader2 size={16} className="animate-spin" />
              : <RefreshCw size={16} />
            }
            {isRescanning ? 'Analyse en cours...' : 'Relancer le scan'}
          </button>
        </div>

        {/* ── CTA Contact ─────────────────────────────────────────────────── */}
        <div className="bg-card-bg border border-border-color rounded-2xl p-6 text-center">
          <h3 className="text-lg font-bold text-white mb-2">
            Besoin d'aide pour corriger ces problèmes ?
          </h3>
          <p className="text-white/60 text-sm mb-4">
            Notre équipe peut vous accompagner dans la mise en œuvre des corrections.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/${REPORT_FIX_WHATSAPP}?text=${encodeURIComponent(
                `Bonjour, j'ai reçu mon rapport pour ${scan.url} et je voudrais corriger les failles.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/90 text-white rounded-full font-medium text-sm transition-all"
            >
              <MessageCircle size={16} />
              Contacter Webisafe pour corriger
            </a>
            <Link
              to="/contact"
              className="flex items-center gap-2 px-6 py-3 bg-card-bg border border-border-color hover:border-primary/50 text-text-primary rounded-full text-sm transition-all"
            >
              Envoyer un message
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}