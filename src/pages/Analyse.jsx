import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import ScanProgress from '../components/ScanProgress';
import PremiumScoreCard from '../components/PremiumScoreCard';
import ScoreCard from '../components/ScoreCard';
import RecommendationCard from '../components/RecommendationCard';
import FreemiumGate from '../components/FreemiumGate';
import HighlightedTechText from '../components/HighlightedTechText';
import { runFullAnalysis } from '../utils/api';
import { useScans } from '../hooks/useScans';
import { normalizeURL, extractDomain } from '../utils/validators';

// ── Composant d'affichage d'erreur contextuel ────────────────────────────────
const ErrorState = ({ error, url }) => {
  const navigate = useNavigate();

  const ERROR_CONFIG = {
    INVALID_URL: {
      title: 'URL invalide',
      icon: '🔗',
      action: "Corriger l'URL",
    },
    SITE_UNREACHABLE: {
      title: 'Site inaccessible',
      icon: '🔌',
      action: 'Réessayer',
    },
    SCAN_ERROR: {
      title: "Erreur d'analyse",
      icon: '⚠️',
      action: 'Réessayer',
    },
  };

  const config = ERROR_CONFIG[error?.type] ?? ERROR_CONFIG.SCAN_ERROR;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">{config.icon}</div>
        <h2 className="text-2xl font-bold text-white mb-3">{config.title}</h2>
        <p className="text-white/60 mb-2">{error?.error ?? "Une erreur inattendue s'est produite."}</p>
        {error?.suggestion && (
          <p className="text-white/40 text-sm mb-8">{error.suggestion}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            ← Retour
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
          >
            {config.action}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Page principale ──────────────────────────────────────────────────────────
export default function Analyse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { saveScan, isPaid } = useScans();

  const url = searchParams.get('url') || '';
  const email = searchParams.get('email') || '';

  const [scanState, setScanState] = useState('scanning');
  const [currentStep, setCurrentStep] = useState(0);
  const [scanData, setScanData] = useState(null);
  const [scanId, setScanId] = useState(null);
  const [scanError, setScanError] = useState(null);

  // --- Logique Freemium ---
  const [showFreemiumGate, setShowFreemiumGate] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [userEmail, setUserEmail] = useState(email || '');
  const [hasPaid, setHasPaid] = useState(false);

  // Afficher la modale automatiquement après 3 secondes de résultats
  useEffect(() => {
    if (scanState === 'results' && scanData && !isUnlocked && !hasPaid) {
      const timer = setTimeout(() => setShowFreemiumGate(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanState, scanData, isUnlocked, hasPaid]);

  const handleUnlock = useCallback((unlockedEmail) => {
    setUserEmail(unlockedEmail || userEmail);
    setIsUnlocked(true);
    setShowFreemiumGate(false);
  }, [userEmail]);

  const performScan = useCallback(async () => {
    if (!url) {
      setScanError({ type: 'INVALID_URL', error: 'Aucune URL spécifiée.' });
      setScanState('error');
      return;
    }

    try {
      const data = await runFullAnalysis(url, ({ step }) => {
        setCurrentStep(step);
      });

      // L'API peut retourner success: false avec un type d'erreur structuré
      if (!data.success) {
        setScanError(data);
        setScanState('error');
        return;
      }

      const scanPayload = { ...data, email, paid: false };
      const id = saveScan(scanPayload);
      const storedScan = { ...scanPayload, id };

      setScanId(id);
      setScanData(storedScan);
      setHasPaid(isPaid(id));
      setScanState('results');
    } catch (error) {
      console.error('Erreur scan:', error);
      setScanError({
        type: 'SCAN_ERROR',
        error: "Erreur lors de l'analyse",
        suggestion: 'Réessayez dans quelques instants. Si le problème persiste, contactez le support.',
      });
      setScanState('error');
    }
  }, [email, isPaid, saveScan, url]);

  useEffect(() => {
    performScan();
  }, [performScan]);

  const handleUpgrade = useCallback(() => {
    if (!scanId) return;

    const params = new URLSearchParams({
      scan_id: scanId,
      url: normalizeURL(url),
    });

    const resolvedEmail = userEmail || email;
    if (resolvedEmail) params.set('email', resolvedEmail);

    navigate(`/payment?${params.toString()}`);
  }, [email, navigate, scanId, url, userEmail]);

  const handleViewDetails = () => {
    if (hasPaid && scanId) {
      navigate(`/rapport/${scanId}`);
      return;
    }
    setShowFreemiumGate(true);
  };

  const isContentVisible = hasPaid || isUnlocked;

  const getPerformanceMetrics = (data) => [
    { label: 'LCP', value: `${data.performance.core_web_vitals.lcp.value}ms`, status: data.performance.core_web_vitals.lcp.rating === 'good' ? 'pass' : 'fail' },
    { label: 'CLS', value: data.performance.core_web_vitals.cls.value, status: data.performance.core_web_vitals.cls.rating === 'good' ? 'pass' : 'fail' },
    { label: 'FCP', value: `${data.performance.core_web_vitals.fcp.value}ms`, status: data.performance.core_web_vitals.fcp.rating === 'good' ? 'pass' : 'fail' },
    { label: 'Taille Page', value: `${data.performance.poids_page_mb}MB` },
    { label: 'Requêtes', value: data.performance.nb_requetes },
  ];

  const getSecurityMetrics = (data) => [
    { label: 'HTTPS', value: data.summary.https_enabled ? 'Active' : 'Non active', status: data.summary.https_enabled ? 'pass' : 'fail' },
    { label: 'SSL Grade', value: data.security.ssl_grade, status: ['A+', 'A'].includes(data.security.ssl_grade) ? 'pass' : 'fail' },
    { label: 'Headers Manquants', value: data.security.headers_manquants.length > 0 ? data.security.headers_manquants.join(', ') : 'Aucun', status: data.security.headers_manquants.length === 0 ? 'pass' : 'warn' },
    { label: 'Malware', value: data.security.malware ? 'Détecté !' : 'Aucun', status: data.security.malware ? 'fail' : 'pass' },
    { label: 'Failles OWASP', value: data.security.failles_owasp_count, status: data.security.failles_owasp_count === 0 ? 'pass' : 'fail' },
  ];

  const getSeoMetrics = (data) => [
    { label: 'Indexation Google', value: data.seo.indexed ? 'Oui' : 'Non', status: data.seo.indexed ? 'pass' : 'fail' },
    { label: 'Sitemap', value: data.seo.sitemap_present ? 'Trouvée' : 'Absente', status: data.seo.sitemap_present ? 'pass' : 'fail' },
    { label: 'Meta Tags', value: data.seo.meta_tags_ok ? 'OK' : 'Incomplets', status: data.seo.meta_tags_ok ? 'pass' : 'fail' },
    { label: 'Open Graph', value: data.seo.open_graph ? 'Présent' : 'Absent', status: data.seo.open_graph ? 'pass' : 'fail' },
  ];

  const getUxMetrics = (data) => [
    { label: 'Responsive', value: data.ux.responsive ? 'Oui' : 'Non', status: data.ux.responsive ? 'pass' : 'fail' },
    { label: 'Taille Texte', value: `${data.ux.taille_texte_px}px`, status: data.ux.taille_texte_px >= 12 ? 'pass' : 'fail' },
    { label: 'Éléments Tactiles', value: data.ux.elements_tactiles_ok ? 'Optimisés' : 'Trop proches', status: data.ux.elements_tactiles_ok ? 'pass' : 'fail' },
    { label: 'Score Vitesse Mobile', value: `${data.ux.vitesse_mobile}/100`, status: data.ux.vitesse_mobile >= 70 ? 'pass' : 'warn' },
  ];

  const conclusionText = scanData?.summary?.resume_executif || '';

  // ── Garde : pas d'URL ────────────────────────────────────────────────────
  if (!url) {
    return (
      <ErrorState
        error={{ type: 'INVALID_URL', error: 'Aucune URL spécifiée.', suggestion: "Retournez à l'accueil et entrez une URL à analyser." }}
      />
    );
  }

  // ── États de chargement / erreur ─────────────────────────────────────────
  if (scanState === 'scanning') {
    return <ScanProgress currentStep={currentStep} url={url} />;
  }

  if (scanState === 'error' || !scanData) {
    return <ErrorState error={scanError} url={url} />;
  }

  // ── Résultats ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-24 pb-32 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">Résultats de l'audit</h1>
          <p className="text-lg text-white">{extractDomain(url)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <PremiumScoreCard
            score={scanData.scores.global}
            domain={extractDomain(url)}
            badgeLiftMobile={true}
            ctaButton={
              !isContentVisible && (
                <button
                  onClick={() => setShowFreemiumGate(true)}
                  className="w-full sm:w-auto px-10 py-5 text-lg bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all btn-glow relative overflow-hidden flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(21,102,240,0.5)] mx-auto"
                >
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2.5s_infinite]" />
                  Débloquer mon rapport
                  <ArrowRight size={20} />
                </button>
              )
            }
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <ScoreCard title="Performance" icon="⚡" score={scanData.scores.performance} metrics={getPerformanceMetrics(scanData)} isPaid={isContentVisible} onViewDetails={handleViewDetails} />
          <ScoreCard title="Sécurité" icon="🔒" score={scanData.scores.security} metrics={getSecurityMetrics(scanData)} isPaid={isContentVisible} onViewDetails={handleViewDetails} />
          <ScoreCard title="SEO" icon="🔍" score={scanData.scores.seo} metrics={getSeoMetrics(scanData)} isPaid={isContentVisible} onViewDetails={handleViewDetails} />
          <ScoreCard title="UX Mobile" icon="📱" score={scanData.scores.ux_mobile} metrics={getUxMetrics(scanData)} isPaid={isContentVisible} onViewDetails={handleViewDetails} />
        </div>

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
                    Synthèse stratégique
                  </span>
                  <h2 className="mt-3 text-xl md:text-2xl font-bold text-white">
                    Ce que ce scan révèle vraiment pour votre site
                  </h2>
                </div>
                <div className="scan-conclusion-pulse self-start rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary shadow-[0_0_25px_rgba(21,102,240,0.18)]">
                  Lecture business prioritaire
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-primary/40 via-white/10 to-transparent" />

              <div className="space-y-4">
                {conclusionText.split('\n\n').map((paragraph, index) => (
                  <p key={index} className={`max-w-4xl text-sm md:text-[15px] leading-7 ${index === 0 ? 'text-white/92' : 'text-white'}`}>
                    <HighlightedTechText text={paragraph} />
                  </p>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- Section Recommandations avec logique freemium --- */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h2 className="text-xl font-bold text-white mb-2">Problèmes identifiés</h2>
          <p className="text-white text-sm mb-6">
            {scanData.recommendations.length} corrections recommandées pour votre site
          </p>

          <div className="space-y-4">
            {isContentVisible ? (
              <>
                {scanData.ai_analysis.recommandations_prioritaires.map((rec, index) => (
                  <RecommendationCard key={`unlocked_${index}`} recommendation={rec} index={index} isLocked={false} />
                ))}
              </>
            ) : (
              <>
                {scanData.recommendations_preview.map((rec, index) => (
                  <RecommendationCard key={`preview_${index}`} recommendation={rec} index={index} isLocked={false} />
                ))}

                {/* Recommandations floutées */}
                <div className="relative">
                  <div className="filter blur-sm pointer-events-none select-none space-y-4">
                    {[1, 2, 3].map((_, index) => (
                      <RecommendationCard
                        key={`blurred_${index}`}
                        recommendation={{ action: 'Optimisation critique cachée', impact: 'Significatif', difficulte: 'Moyenne', temps: '2h' }}
                        index={index + scanData.recommendations_preview.length}
                        isLocked={true}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setShowFreemiumGate(true)}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label="Débloquer les recommandations"
                  >
                    <span className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-[0_0_24px_rgba(21,102,240,0.5)] transition-all">
                      🔒 Débloquer gratuitement
                      <ArrowRight size={16} />
                    </span>
                  </button>
                </div>

                <div className="text-center py-4">
                  <p className="text-white text-sm mb-4">
                    <Lock size={14} className="inline mr-1" />
                    {scanData.recommendations.length - scanData.recommendations_preview.length} corrections critiques supplémentaires disponibles
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* --- Barre sticky en bas --- */}
      {!isContentVisible && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-navy/95 backdrop-blur-xl border-t border-border-color p-4 z-40">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-white font-semibold text-sm">Débloquer le rapport complet — 35 000 FCFA</p>
              <p className="text-white text-xs">PDF 6 pages · Plan d'action · 1 rescan offert dans 30 jours</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleUpgrade}
                className="flex-1 sm:flex-none px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition-all btn-glow text-sm flex items-center justify-center gap-2"
              >
                Obtenir Mon Rapport PDF
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 text-text-secondary/50 text-xs">
            <span>Paiement par Wave</span>
            <span>·</span>
            <span>+225 01 70 90 77 80</span>
          </div>
        </div>
      )}

      {/* --- Modale FreemiumGate --- */}
      <FreemiumGate
        isOpen={showFreemiumGate}
        onClose={() => setShowFreemiumGate(false)}
        onUnlock={handleUnlock}
        onUpgrade={() => {
          setShowFreemiumGate(false);
          handleUpgrade();
        }}
        scanData={scanData}
      />
    </div>
  );
}