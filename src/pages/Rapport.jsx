import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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

function MetricRow({ label, value, status }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-color last:border-0">
      <span className="text-text-secondary text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-text-primary text-sm font-medium">{value}</span>
        {status && <span>{status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌'}</span>}
      </div>
    </div>
  );
}

export default function Rapport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getScan, isPaid, markAsPaid, saveScan } = useScans();
  const [scan, setScan] = useState(null);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoading(true);
      const localScan = getScan(id);
      const locallyPaid = isPaid(id);

      if (localScan && active) {
        setScan({
          ...localScan,
          paid: Boolean(localScan.paid || locallyPaid),
        });
      }

      try {
        const [remoteScan, latestPayment] = await Promise.all([
          fetchRemoteScan(id).catch(() => null),
          fetchLatestPaymentRequest(id).catch(() => null),
        ]);

        if (!active) return;

        if (latestPayment) {
          setPaymentRequest(latestPayment);
        }

        const resolvedScan = remoteScan || localScan;
        if (!resolvedScan) {
          navigate('/');
          return;
        }

        const unlocked =
          Boolean(resolvedScan.paid || locallyPaid) || latestPayment?.status === 'validated';

        if (unlocked) {
          markAsPaid(id);
        }

        const hydratedScan = {
          ...resolvedScan,
          id,
          paid: unlocked,
        };

        setScan(hydratedScan);
        saveScan(hydratedScan);
      } catch {
        if (!active && !localScan) return;
        if (!localScan) {
          navigate('/');
          return;
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [getScan, id, isPaid, markAsPaid, navigate, saveScan]);

  useEffect(() => {
    if (!scan || scan.paid) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      try {
        const [remoteScan, latestPayment] = await Promise.all([
          fetchRemoteScan(id).catch(() => null),
          fetchLatestPaymentRequest(id).catch(() => null),
        ]);

        if (latestPayment) {
          setPaymentRequest(latestPayment);
        }

        const unlocked =
          Boolean(remoteScan?.paid || isPaid(id)) || latestPayment?.status === 'validated';

        if (unlocked && (remoteScan || scan)) {
          markAsPaid(id);
          const hydratedScan = {
            ...(remoteScan || scan),
            id,
            paid: true,
          };
          setScan(hydratedScan);
          saveScan(hydratedScan);
        }
      } catch {
        return null;
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [id, isPaid, markAsPaid, saveScan, scan]);

  if (loading && !scan) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Chargement du rapport...</h2>
          <p className="text-white/70 text-sm">Preparation de votre audit premium.</p>
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
            Retour a l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!scan.paid) {
    return (
      <div className="min-h-screen px-4 pt-24 pb-20">
        <div className="max-w-2xl mx-auto rounded-[28px] border border-primary/20 bg-card-bg p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock size={38} />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-white">Rapport en cours de validation</h1>
          <p className="mt-4 text-sm leading-7 text-white/70">
            Votre paiement est en cours de verification. Vous recevrez un email des que votre
            rapport premium sera pret.
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
            <p className="text-sm font-semibold text-white">Verification automatique active</p>
            <p className="mt-2 text-sm text-white/65">
              Cette page se rechargera silencieusement toutes les 30 secondes jusqu'a validation.
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/${WAVE_SUPPORT_WHATSAPP}?text=${encodeURIComponent(
                `Bonjour, je souhaite verifier mon paiement Webisafe pour ${scan.url}.`
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
    try {
      generatePDF(scan);
    } catch (error) {
      console.error('Erreur PDF:', error);
      alert(`Erreur lors de la generation du PDF: ${error.message}`);
    }
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
    { id: 'security', label: 'Securite', icon: <Shield size={16} /> },
    { id: 'seo', label: 'SEO', icon: <Search size={16} /> },
    { id: 'ux', label: 'UX Mobile', icon: <Smartphone size={16} /> },
    { id: 'recommendations', label: "Plan d'action", icon: <CheckCircle size={16} /> },
  ];

  const premiumNarrative = buildPremiumExplanationParagraphs(scan.recommendations || []);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
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
              <ArrowLeft size={16} />
              Retour
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-white">
                W
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  RAPPORT D'AUDIT PREMIUM - {extractDomain(scan.url)}
                </h1>
                <p className="text-white text-xs">{formatDate(scan.scanDate)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold text-success">
              Rapport Premium Active
            </span>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium text-sm transition-all btn-glow"
            >
              <Download size={16} />
              Telecharger PDF
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-card-bg border border-border-color hover:border-primary/50 text-text-primary rounded-xl text-sm transition-all"
            >
              <Share2 size={16} />
              {copied ? 'Copie !' : 'Partager'}
            </button>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-card-bg rounded-xl border border-border-color">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSection === section.id ? 'bg-primary text-white' : 'text-white hover:text-white hover:bg-dark-navy'
              }`}
            >
              {section.icon}
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          ))}
        </div>

        <section id="overview" className="mb-12">
          <PremiumScoreCard score={scan.scores.global} domain={extractDomain(scan.url)} badgeLiftMobile={true} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { name: 'Performance', score: scan.scores.performance, icon: '⚡' },
              { name: 'Securite', score: scan.scores.security, icon: '🔒' },
              { name: 'SEO', score: scan.scores.seo, icon: '🔍' },
              { name: 'UX Mobile', score: scan.scores.ux, icon: '📱' },
            ].map((cat) => {
              const badge = getScoreBadge(cat.score);
              return (
                <div key={cat.name} className="bg-dark-navy rounded-xl p-4 text-center">
                  <span className="text-2xl">{cat.icon}</span>
                  <p className="text-white font-bold text-xl mt-2">
                    {cat.score}
                    <span className="text-white text-sm">/100</span>
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
                    Ce que revele votre audit premium
                  </h2>
                </div>

                <div className="scan-conclusion-pulse self-start rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary shadow-[0_0_25px_rgba(21,102,240,0.18)]">
                  Priorites de correction
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-primary/40 via-white/10 to-transparent" />

              <div className="space-y-4">
                {premiumNarrative.map((paragraph, index) => (
                  <p key={index} className={`max-w-4xl text-sm md:text-[15px] leading-7 ${index === 0 ? 'text-white/92' : 'text-white'}`}>
                    <HighlightedTechText text={paragraph} />
                  </p>
                ))}
              </div>

              <div className="pt-2 flex justify-center">
                <a
                  href={`https://wa.me/${REPORT_FIX_WHATSAPP}?text=${encodeURIComponent(
                    `Bonjour, j'ai recu mon rapport pour ${scan.url} et je voudrais corriger les failles.`
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

        <section id="performance" className="mb-8">
          <div className="bg-card-bg border border-border-color rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">⚡ Performance</h2>
            <MetricRow label="Temps de chargement" value={scan.performance.loadTime} status={parseFloat(scan.performance.loadTime) < 3 ? 'pass' : 'fail'} />
            <MetricRow label="Taille de la page" value={scan.performance.pageSize} />
            <MetricRow label="LCP" value={scan.performance.lcp} status={scan.performance.status?.lcp} />
            <MetricRow label="FID" value={scan.performance.fid} status={scan.performance.status?.fid} />
            <MetricRow label="CLS" value={scan.performance.cls} status={scan.performance.status?.cls} />
            <MetricRow label="TTFB" value={scan.performance.ttfb || 'N/A'} />
            <MetricRow label="Requetes HTTP" value={scan.performance.requests || 'N/A'} />
          </div>
        </section>

        <section id="security" className="mb-8">
          <div className="bg-card-bg border border-border-color rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🔒 Securite</h2>
            <MetricRow label="HTTPS" value={scan.security.https ? 'Active' : 'Non active'} status={scan.security.https ? 'pass' : 'fail'} />
            <MetricRow label="Certificat SSL" value={scan.security.sslValid ? `Valide (${scan.security.sslDays} jours)` : 'Invalide'} status={scan.security.sslValid ? 'pass' : 'fail'} />
            <MetricRow label="HSTS" value={scan.security.hsts ? 'Active' : 'Absent'} status={scan.security.hsts ? 'pass' : 'fail'} />
            <MetricRow label="Content-Security-Policy" value={scan.security.csp ? 'Present' : 'Absent'} status={scan.security.csp ? 'pass' : 'fail'} />
            <MetricRow label="X-Frame-Options" value={scan.security.xframe ? 'Present' : 'Absent'} status={scan.security.xframe ? 'pass' : 'fail'} />
            <MetricRow label="Malware" value={scan.security.malware ? 'DETECTE !' : 'Aucun'} status={scan.security.malware ? 'fail' : 'pass'} />
            {scan.security.missingHeaders?.length > 0 && (
              <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                <p className="text-danger text-sm font-medium mb-2">Headers manquants :</p>
                <ul className="text-white text-sm space-y-1.5">
                  {scan.security.missingHeaders.map((header, index) => (
                    <li key={index}>• {header}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section id="seo" className="mb-8">
          <div className="bg-card-bg border border-border-color rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🔍 SEO</h2>
            <MetricRow label="Balise Title" value={scan.seo.titleOk ? `OK (${scan.seo.titleLength} car.)` : 'Absente'} status={scan.seo.titleOk ? 'pass' : 'fail'} />
            <MetricRow label="Meta Description" value={scan.seo.descriptionOk ? 'Presente' : 'Absente'} status={scan.seo.descriptionOk ? 'pass' : 'fail'} />
            <MetricRow label="Images sans ALT" value={`${scan.seo.altMissing} image(s)`} status={scan.seo.altMissing === 0 ? 'pass' : 'fail'} />
            <MetricRow label="Sitemap.xml" value={scan.seo.sitemapOk ? 'Trouve' : 'Non trouve'} status={scan.seo.sitemapOk ? 'pass' : 'fail'} />
            <MetricRow label="Robots.txt" value={scan.seo.robotsTxtOk ? 'Trouve' : 'Non trouve'} status={scan.seo.robotsTxtOk ? 'pass' : 'fail'} />
            <MetricRow label="Balise H1" value={scan.seo.h1Ok ? 'Correcte' : 'Probleme'} status={scan.seo.h1Ok ? 'pass' : 'fail'} />
            <MetricRow label="Canonical" value={scan.seo.canonicalOk ? 'Present' : 'Absent'} status={scan.seo.canonicalOk ? 'pass' : 'warn'} />
            <MetricRow label="Open Graph" value={scan.seo.ogTagsOk ? 'Present' : 'Absent'} status={scan.seo.ogTagsOk ? 'pass' : 'warn'} />
          </div>
        </section>

        <section id="ux" className="mb-8">
          <div className="bg-card-bg border border-border-color rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">📱 Experience Mobile</h2>
            <MetricRow label="Design responsive" value={scan.ux.responsive ? 'Oui' : 'Non'} status={scan.ux.responsive ? 'pass' : 'fail'} />
            <MetricRow label="Texte lisible" value={scan.ux.textReadable ? 'Oui' : 'Non'} status={scan.ux.textReadable ? 'pass' : 'fail'} />
            <MetricRow label="Elements tactiles" value={scan.ux.tapTargets ? 'Bien espaces' : 'Trop proches'} status={scan.ux.tapTargets ? 'pass' : 'fail'} />
            <MetricRow label="Temps d'interactivite" value={scan.ux.timeToInteractive} />
            <MetricRow label="Viewport" value={scan.ux.viewport !== false ? 'Configure' : 'Absent'} status={scan.ux.viewport !== false ? 'pass' : 'fail'} />
          </div>
        </section>

        <section id="recommendations" className="mb-12">
          <h2 className="text-xl font-bold text-white mb-2">📋 Plan d'Action Recommande</h2>
          <p className="text-white text-sm mb-6">
            {scan.recommendations?.length} corrections classees par priorite
          </p>

          <div className="space-y-4">
            {scan.recommendations?.map((recommendation, index) => (
              <RecommendationCard key={index} recommendation={recommendation} index={index} isLocked={false} />
            ))}
          </div>
        </section>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center mb-8">
          <Clock size={24} className="text-primary mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">1 rescan gratuit disponible dans 30 jours</p>
        </div>

        <div className="bg-card-bg border border-border-color rounded-2xl p-6 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Besoin d'aide pour corriger ces problemes ?</h3>
          <p className="text-white text-sm mb-4">
            Notre equipe peut vous accompagner dans la mise en oeuvre des corrections.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/${REPORT_FIX_WHATSAPP}?text=${encodeURIComponent(
                `Bonjour, j'ai recu mon rapport pour ${scan.url} et je voudrais corriger les failles.`
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
