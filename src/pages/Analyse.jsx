import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lock, MapPin, X } from 'lucide-react';

import ScanProgress from '../components/ScanProgress';
import PremiumScoreCard from '../components/PremiumScoreCard';
import ScoreCard from '../components/ScoreCard';
import RecommendationCard from '../components/RecommendationCard';
import FreemiumGate from '../components/FreemiumGate';
import HighlightedTechText from '../components/HighlightedTechText';
import WaveCheckoutModal from '../components/WaveCheckoutModal';
import AuthModal from '../components/AuthModal';

import { runFullAnalysis } from '../utils/api';
import { useScans } from '../hooks/useScans';
import { useAuth } from '../hooks/useAuth';
import { normalizeURL, extractDomain } from '../utils/validators';

// ── Bandeau Alertes ───────────────────────────────────────────────────────────
const CriticalAlertsBanner = ({ alerts }) => {
  const [dismissed, setDismissed] = useState([]);

  if (!Array.isArray(alerts) || alerts.length === 0) return null;

  const visible = alerts.filter((_, i) => !dismissed.includes(i));
  if (visible.length === 0) return null;

  const SEVERITY_STYLE = {
    critical: 'bg-red-500/15 border-red-500/40 text-red-300',
    high: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
    warning: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200',
  };

  const SEVERITY_ICON = {
    critical: '🚨',
    high: '⚠️',
    warning: '🌍',
  };

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
                {alert.message && (
                  <p className="text-white/70 text-xs mt-0.5">{alert.message}</p>
                )}
                {alert.impact && (
                  <p className="text-white/50 text-xs mt-0.5">Impact : {alert.impact}</p>
                )}
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
};

// ── Badge serveur ─────────────────────────────────────────────────────────────
const ServerLocationBadge = ({ serverLocation }) => {
  if (!serverLocation) return null;

  const { country, city, isp, latency_warning } = serverLocation;
  const isWarning = latency_warning?.warning;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${isWarning
        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'
        : 'bg-green-500/10 border-green-500/30 text-green-200'
        }`}
    >
      <MapPin size={12} className="flex-shrink-0" />
      <span>
        Serveur : <strong>{city}, {country}</strong>
        {isp && <span className="text-white/50 ml-1">({isp})</span>}
        {isWarning && latency_warning?.message && (
          <span className="ml-2 text-yellow-200/70">{latency_warning.message}</span>
        )}
      </span>
    </div>
  );
};

// ── Composant erreur ──────────────────────────────────────────────────────────
const ErrorState = ({ error }) => {
  const navigate = useNavigate();

  const ERROR_CONFIG = {
    INVALID_URL: { title: 'URL invalide', icon: '🔗', action: "Corriger l'URL" },
    SITE_UNREACHABLE: { title: 'Site inaccessible', icon: '🔌', action: 'Réessayer' },
    SCAN_ERROR: { title: "Erreur d'analyse", icon: '⚠️', action: 'Réessayer' },
  };

  const config = ERROR_CONFIG[error?.type] ?? ERROR_CONFIG.SCAN_ERROR;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">{config.icon}</div>
        <h2 className="text-2xl font-bold text-white mb-3">{config.title}</h2>
        <p className="text-white/60 mb-2">
          {error?.error ?? "Une erreur inattendue s'est produite."}
        </p>
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

// ── Metrics ───────────────────────────────────────────────────────────────────
function getPerformanceMetrics(scanData) {
  const vitals = scanData?.performance?.core_web_vitals;
  const perf = scanData?.performance;

  if (!vitals) return [];

  return [
    {
      label: 'LCP',
      value: `${vitals.lcp.value ?? 'N/A'}ms`,
      status: vitals.lcp.rating === 'good' ? 'pass' : vitals.lcp.rating === 'needs_improvement' ? 'warn' : 'fail',
    },
    {
      label: 'CLS',
      value: vitals.cls.value ?? 'N/A',
      status: vitals.cls.rating === 'good' ? 'pass' : vitals.cls.rating === 'needs_improvement' ? 'warn' : 'fail',
    },
    {
      label: 'FCP',
      value: `${vitals.fcp.value ?? 'N/A'}ms`,
      status: vitals.fcp.rating === 'good' ? 'pass' : vitals.fcp.rating === 'needs_improvement' ? 'warn' : 'fail',
    },
    {
      label: 'Taille Page',
      value: perf?.poids_page_mb != null ? `${perf.poids_page_mb}MB` : 'N/A',
    },
    {
      label: 'Requêtes',
      value: perf?.nb_requetes != null ? String(perf.nb_requetes) : 'N/A',
    },
  ];
}

function getSecurityMetrics(scanData) {
  const sec = scanData?.security ?? {};
  const summary = scanData?.summary ?? {};

  return [
    {
      label: 'HTTPS',
      value: summary.https_enabled ? 'Activé' : 'Non activé',
      status: summary.https_enabled ? 'pass' : 'fail',
    },
    {
      label: 'Headers sécurité',
      value: (sec.headers_manquants?.length ?? 0) === 0
        ? 'Tous présents'
        : `${sec.headers_manquants.length} manquant(s)`,
      status: (sec.headers_manquants?.length ?? 0) === 0 ? 'pass' : 'warn',
    },
    {
      label: 'Malware',
      value: sec.malware ? 'Détecté !' : 'Aucun',
      status: sec.malware ? 'fail' : 'pass',
    },
    {
      label: 'Failles OWASP',
      value: (sec.failles_owasp_count ?? 0) === 0
        ? 'Aucune'
        : `${sec.failles_owasp_count} détectée(s)`,
      status: (sec.failles_owasp_count ?? 0) === 0 ? 'pass' : 'fail',
    },
  ];
}

function getSeoMetrics(scanData) {
  const seo = scanData?.seo ?? {};
  return [
    {
      label: 'Indexation Google',
      value: seo.indexed ? 'Oui' : 'Non',
      status: seo.indexed ? 'pass' : 'fail',
    },
    {
      label: 'Sitemap',
      value: seo.sitemap_present ? 'Trouvée' : 'Absente',
      status: seo.sitemap_present ? 'pass' : 'fail',
    },
    {
      label: 'Meta Tags',
      value: seo.meta_tags_ok ? 'OK' : 'Incomplets',
      status: seo.meta_tags_ok ? 'pass' : 'fail',
    },
    {
      label: 'Open Graph',
      value: seo.open_graph ? 'Présent' : 'Absent',
      status: seo.open_graph ? 'pass' : 'fail',
    },
  ];
}

function getUxMetrics(scanData) {
  const ux = scanData?.ux ?? {};
  return [
    {
      label: 'Responsive',
      value: ux.responsive ? 'Oui' : 'Non',
      status: ux.responsive ? 'pass' : 'fail',
    },
    {
      label: 'Taille Texte',
      value: ux.taille_texte_px != null ? `${ux.taille_texte_px}px` : 'N/A',
      status: ux.taille_texte_px >= 12 ? 'pass' : 'fail',
    },
    {
      label: 'Éléments Tactiles',
      value: ux.elements_tactiles_ok ? 'Optimisés' : 'À améliorer',
      status: ux.elements_tactiles_ok ? 'pass' : 'warn',
    },
    {
      label: 'Score Vitesse Mobile',
      value: ux.vitesse_mobile != null ? `${ux.vitesse_mobile}/100` : 'N/A',
      status: ux.vitesse_mobile >= 70 ? 'pass' : 'warn',
    },
  ];
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Analyse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { saveScan, isPaid } = useScans();

  const { isAuthenticated, user, signup, login } = useAuth();

  const url = searchParams.get('url') || '';
  const email = searchParams.get('email') || '';

  const [scanState, setScanState] = useState('scanning');
  const [currentStep, setCurrentStep] = useState(0);
  const [scanData, setScanData] = useState(null);
  const [scanId, setScanId] = useState(null);
  const [scanError, setScanError] = useState(null);

  // Modals
  const [showFreemiumGate, setShowFreemiumGate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showWaveModal, setShowWaveModal] = useState(false);

  // État utilisateur
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [userEmail, setUserEmail] = useState(email || '');
  const [hasPaid, setHasPaid] = useState(false);

  // Affiche FreemiumGate automatiquement après 3s si pas encore payé
  useEffect(() => {
    if (scanState === 'results' && scanData && !isUnlocked && !hasPaid) {
      const timer = setTimeout(() => setShowFreemiumGate(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanState, scanData, isUnlocked, hasPaid]);

  // Pré-remplit l'email avec celui du compte connecté si disponible
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setUserEmail(user.email);
    }
  }, [isAuthenticated, user]);

  const performScan = useCallback(async () => {
    if (!url) {
      setScanError({ type: 'INVALID_URL', error: 'Aucune URL spécifiée.' });
      setScanState('error');
      return;
    }

    // Email requis pour les scans gratuits
    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      setScanError({ type: 'INVALID_EMAIL', error: "Email requis pour recevoir les résultats." });
      setScanState('error');
      return;
    }

    try {
      const data = await runFullAnalysis(url, ({ step }) => setCurrentStep(step), email);

      if (!data?.success) {
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
      const message = error?.message || "Erreur lors de l'analyse";
      setScanError({
        type: 'SCAN_ERROR',
        error: message,
        suggestion: 'Réessayez dans quelques instants.',
      });
      setScanState('error');
    }
  }, [email, isPaid, saveScan, url]);

  useEffect(() => { performScan(); }, [performScan]);

  // ── Handlers flux de paiement ─────────────────────────────────────────────

  /**
   * Étape 1 : clic "Obtenir le rapport" dans FreemiumGate
   * → Si connecté   : ouvre directement WaveCheckoutModal
   * → Si non connecté : ouvre AuthModal en mode signup
   */
  const handleOpenAuth = useCallback(() => {
    setShowFreemiumGate(false);

    if (isAuthenticated) {
      setTimeout(() => setShowWaveModal(true), 150);
    } else {
      setTimeout(() => setShowAuthModal(true), 150);
    }
  }, [isAuthenticated]);

  /**
   * Étape 2 : AuthModal soumis avec succès
   * → Crée ou connecte le compte via useAuth (synchrone, localStorage)
   * → Ferme AuthModal
   * → Ouvre WaveCheckoutModal après un court délai
   *
   * IMPORTANT : on ne retourne PAS de redirectTo ici,
   * ce qui empêche AuthModal de faire navigate() et de quitter la page.
   */
  const handleAuthSuccess = useCallback((mode, formData) => {
    let result;

    if (mode === 'signup') {
      result = signup(
        formData.name,
        formData.email,
        formData.phone,
        formData.password,
        formData.phoneCountry,
      );
    } else {
      result = login(formData.email, formData.password);
    }

    // Échec : on renvoie l'erreur à AuthModal qui l'affiche
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Succès : on enregistre l'email pour pré-remplir WaveCheckoutModal
    if (formData?.email) {
      setUserEmail(formData.email);
    }

    // On ferme AuthModal depuis ici (le parent contrôle)
    setShowAuthModal(false);

    // Petit délai pour que l'animation de fermeture soit fluide
    // avant d'ouvrir WaveCheckoutModal
    setTimeout(() => setShowWaveModal(true), 200);

    // PAS de redirectTo → AuthModal ne navigue nulle part
    return { success: true };
  }, [signup, login]);

  /**
   * Étape 3 : WaveCheckoutModal → redirige vers /payment
   */
  const handleWavePay = useCallback(async (payEmail) => {
    setUserEmail(payEmail);
    setShowWaveModal(false);
    if (!scanId) return;

    const params = new URLSearchParams({
      scan_id: scanId,
      url: normalizeURL(url),
    });
    if (payEmail) params.set('email', payEmail);

    navigate(`/payment?${params.toString()}`);
  }, [navigate, scanId, url]);

  // Unlock gratuit (bouton secondaire)
  const handleUnlock = useCallback((unlockedEmail) => {
    setUserEmail(unlockedEmail || userEmail);
    setIsUnlocked(true);
    setShowFreemiumGate(false);
  }, [userEmail]);

  const handleViewDetails = () => {
    if (hasPaid && scanId) {
      navigate(`/rapport/${scanId}`);
      return;
    }
    setShowFreemiumGate(true);
  };

  if (!url) {
    return (
      <ErrorState
        error={{
          type: 'INVALID_URL',
          error: 'Aucune URL spécifiée.',
          suggestion: "Retournez à l'accueil et entrez une URL à analyser.",
        }}
      />
    );
  }

  if (scanState === 'scanning') return <ScanProgress currentStep={currentStep} url={url} />;
  if (scanState === 'error' || !scanData) return <ErrorState error={scanError} />;

  // ── Valeurs sûres ─────────────────────────────────────────────────────────
  const globalScore = Number.isFinite(Number(scanData.global_score))
    ? Number(scanData.global_score)
    : Number.isFinite(Number(scanData?.scores?.global))
      ? Number(scanData.scores.global)
      : 0;

  const performanceScore = scanData?.scores?.performance ?? null;
  const securityScore = scanData?.scores?.security ?? null;
  const seoScore = scanData?.scores?.seo ?? null;
  const uxScore = scanData?.scores?.ux_mobile ?? scanData?.scores?.ux ?? null;

  const criticalAlerts = scanData.critical_alerts ?? [];
  const serverLocation =
    scanData.metrics?.performance?.server_location ??
    scanData.performance?.server_location ??
    null;
  const conclusionText = scanData?.summary?.resume_executif || '';

  return (
    <div className="min-h-screen pt-24 pb-32 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">
            Résultats de l'audit
          </h1>
          <p className="text-lg text-white">{extractDomain(url)}</p>
        </motion.div>

        {serverLocation && (
          <div className="flex justify-center mb-6">
            <ServerLocationBadge serverLocation={serverLocation} />
          </div>
        )}

        <CriticalAlertsBanner alerts={criticalAlerts} />

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <PremiumScoreCard
            score={globalScore}
            domain={extractDomain(url)}
            badgeLiftMobile={true}
            ctaButton={
              !hasPaid && (
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
          <ScoreCard
            title="Performance"
            icon="⚡"
            score={performanceScore}
            metrics={getPerformanceMetrics(scanData)}
            isPaid={hasPaid}
            onViewDetails={handleViewDetails}
          />
          <ScoreCard
            title="Sécurité"
            icon="🔒"
            score={securityScore}
            metrics={getSecurityMetrics(scanData)}
            isPaid={hasPaid}
            onViewDetails={handleViewDetails}
          />
          <ScoreCard
            title="SEO"
            icon="🔍"
            score={seoScore}
            metrics={getSeoMetrics(scanData)}
            isPaid={hasPaid}
            onViewDetails={handleViewDetails}
          />
          <ScoreCard
            title="UX Mobile"
            icon="📱"
            score={uxScore}
            metrics={getUxMetrics(scanData)}
            isPaid={hasPaid}
            onViewDetails={handleViewDetails}
          />
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
                  <p
                    key={index}
                    className={`max-w-4xl text-sm md:text-[15px] leading-7 ${index === 0 ? 'text-white/92' : 'text-white'
                      }`}
                  >
                    <HighlightedTechText text={paragraph} />
                  </p>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold text-white mb-2">Problèmes identifiés</h2>
          <p className="text-white text-sm mb-6">
            {(scanData.recommendations?.length ?? 0)} corrections recommandées pour votre site
          </p>

          <div className="space-y-4">
            {hasPaid ? (
              <>
                {(scanData.ai_analysis?.recommandations_prioritaires ?? []).map((rec, index) => (
                  <RecommendationCard
                    key={`unlocked_${index}`}
                    recommendation={rec}
                    index={index}
                    isLocked={false}
                  />
                ))}
              </>
            ) : (
              <>
                {(scanData.recommendations_preview ?? []).map((rec, index) => (
                  <RecommendationCard
                    key={`preview_${index}`}
                    recommendation={rec}
                    index={index}
                    isLocked={false}
                  />
                ))}

                <div className="relative">
                  <div className="filter blur-sm pointer-events-none select-none space-y-4">
                    {[1, 2, 3].map((_, index) => (
                      <RecommendationCard
                        key={`blurred_${index}`}
                        recommendation={{
                          action: 'Optimisation critique cachée',
                          impact: 'Significatif',
                          difficulte: 'Moyenne',
                          temps: '2h',
                        }}
                        index={index + (scanData.recommendations_preview?.length ?? 0)}
                        isLocked={true}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setShowFreemiumGate(true)}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label="Obtenir le rapport complet"
                  >
                    <span className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-[0_0_24px_rgba(21,102,240,0.5)] transition-all">
                      🔒 Obtenir le rapport complet
                      <ArrowRight size={16} />
                    </span>
                  </button>
                </div>

                <div className="text-center py-4">
                  <p className="text-white text-sm mb-4">
                    <Lock size={14} className="inline mr-1" />
                    {(scanData.recommendations?.length ?? 0) -
                      (scanData.recommendations_preview?.length ?? 0)}{' '}
                    corrections critiques supplémentaires disponibles
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bandeau bas fixe */}
      {!hasPaid && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-navy/95 backdrop-blur-xl border-t border-border-color p-4 z-40">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-white font-semibold text-sm">
                Débloquer le rapport complet — 35 000 FCFA
              </p>
              <p className="text-white text-xs">
                PDF · Plan d'action · 1 rescan offert dans 30 jours
              </p>
            </div>
            <button
              onClick={() => setShowFreemiumGate(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors w-full sm:w-auto justify-center"
            >
              Obtenir Mon Rapport PDF <ArrowRight size={16} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 text-text-secondary/50 text-xs">
            <span>Paiement par Wave</span>
            <span>·</span>
            <span>+225 01 70 90 77 80</span>
          </div>
        </div>
      )}

      {/* ── Modals ── */}

      {/* 1. FreemiumGate */}
      <FreemiumGate
        isOpen={showFreemiumGate}
        onClose={() => setShowFreemiumGate(false)}
        onUnlock={handleUnlock}
        onUpgrade={handleOpenAuth}
        scanData={scanData}
      />

      {/* 2. AuthModal — affiché uniquement si non connecté */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuth={handleAuthSuccess}
        initialMode="signup"
      />

      {/* 3. WaveCheckoutModal */}
      <WaveCheckoutModal
        isOpen={showWaveModal}
        onClose={() => setShowWaveModal(false)}
        onPay={handleWavePay}
        scanUrl={normalizeURL(url)}
        globalScore={globalScore}
        initialEmail={userEmail}
        amount={35000}
      />
    </div>
  );
}