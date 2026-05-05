import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Lock, MapPin, Wrench, X } from 'lucide-react';
import LargeSiteDisclaimer from '../components/LargeSiteDisclaimer';

import CriticalAlertsBanner from '../components/CriticalAlertsBanner';
import ScanProgress from '../components/ScanProgress';
import PremiumScoreCard from '../components/PremiumScoreCard';
import ScoreCard from '../components/ScoreCard';
import RecommendationCard from '../components/RecommendationCard';
import FreemiumGate from '../components/FreemiumGate';
import HighlightedTechText from '../components/HighlightedTechText';
import WaveCheckoutModal from '../components/WaveCheckoutModal';
import AuthModal from '../components/AuthModal';

import { runFullAnalysis, filterWebisafeOnlyChecks } from '../utils/api';
import { useScans } from '../hooks/useScans';
import { useAuth } from '../hooks/useAuth';
import { normalizeURL, extractDomain } from '../utils/validators';
import { sendNurtureEmail } from '../utils/emailApi';
import { SUPPORT_PHONE } from '../config/brand';
import { trackClarityEvent } from '../lib/clarity';
import { supabase } from '../lib/supabaseClient';

// ── Badge latence / CDN ───────────────────────────────────────────────────────
const LatencyWarningBadge = ({ serverLocation }) => {
  if (!serverLocation?.latency_warning?.warning) return null;

  const { city, country, latency_warning } = serverLocation;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-2xl border bg-yellow-500/10 border-yellow-500/30 mb-6"
    >
      <MapPin size={16} className="flex-shrink-0 mt-0.5 text-yellow-300" />
      <div className="flex-1 min-w-0">
        <p className="text-yellow-200 font-semibold text-sm">
          Serveur éloigné de vos visiteurs
        </p>
        {latency_warning.message && (
          <p className="text-yellow-200/80 text-xs mt-1">{latency_warning.message}</p>
        )}
        {latency_warning.recommendation && (
          <p className="text-white/50 text-xs mt-1"> {latency_warning.recommendation}</p>
        )}
      </div>
    </motion.div>
  );
};

// ── Composant erreur ──────────────────────────────────────────────────────────
const ErrorState = ({ error }) => {
  const navigate = useNavigate();

  const ERROR_CONFIG = {
    INVALID_URL: { title: 'URL invalide', icon: '', iconLabel: 'Lien', action: "Corriger l'URL" },
    SITE_UNREACHABLE: { title: 'Site inaccessible', icon: '', iconLabel: 'Déconnecté', action: 'Réessayer' },
    SCAN_ERROR: { title: "Erreur d'analyse", icon: '', iconLabel: 'Avertissement', action: 'Réessayer' },
  };

  const config = ERROR_CONFIG[error?.type] ?? ERROR_CONFIG.SCAN_ERROR;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6" aria-hidden="true" title={config.iconLabel}>{config.icon}</div>
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

  const getVitalStatus = (rating) => {
    if (rating === 'good') return 'pass';
    if (rating === 'needs_improvement') return 'warn';
    if (rating === 'poor') return 'fail';
    return 'unknown';
  };

  return [
    {
      label: 'LCP',
      value: vitals.lcp.value != null ? `${vitals.lcp.value}ms` : 'Non mesure',
      status: getVitalStatus(vitals.lcp.rating),
    },
    {
      label: 'CLS',
      value: vitals.cls.value ?? 'Non mesure',
      status: getVitalStatus(vitals.cls.rating),
    },
    {
      label: 'FCP',
      value: vitals.fcp.value != null ? `${vitals.fcp.value}ms` : 'Non mesure',
      status: getVitalStatus(vitals.fcp.rating),
    },
    {
      label: 'Taille Page',
      value: perf?.poids_page_mb != null ? `${perf.poids_page_mb}MB` : 'Non mesure',
      status: perf?.poids_page_mb == null ? 'unknown' : perf.poids_page_mb > 3 ? 'fail' : perf.poids_page_mb > 2 ? 'warn' : 'pass',
    },
    {
      label: 'Requetes',
      value: perf?.nb_requetes != null ? String(perf.nb_requetes) : 'Non mesure',
      status: perf?.nb_requetes == null ? 'unknown' : perf.nb_requetes > 100 ? 'fail' : perf.nb_requetes > 60 ? 'warn' : 'pass',
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
  const h1Count = Number.isFinite(Number(seo.h1_count)) ? Number(seo.h1_count) : null;
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
      label: 'H1',
      value: h1Count != null ? String(h1Count) : 'Non mesuré',
      status: h1Count == null ? 'unknown' : h1Count === 1 ? 'pass' : h1Count > 1 ? 'warn' : 'fail',
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
      status: ux.vitesse_mobile >= 80 ? 'pass' : 'warn', 
    },
  ];
}

function buildImprovementSentence(recommendations) {
  const improvements = (recommendations ?? [])
    .map((rec) => rec?.action || rec?.title || rec?.titre)
    .filter(Boolean)
    .slice(0, 4);

  if (improvements.length === 0) return null;

  return `Améliorations à faire détectées : ${improvements.join(' ; ')} ; une fois appliquées, elles peuvent renforcer la confiance des visiteurs, améliorer la visibilité Google et augmenter les conversions.`;
}

function buildFreeScanNarrative(globalScore, perfScore, secScore, seoScore, uxScore, criticalAlerts, recommendations) {
  const g = globalScore ?? 0;
  const perf = perfScore ?? 0;
  const sec = secScore ?? 0;
  const seo = seoScore ?? 0;
  const ux = uxScore ?? 0;
  const criticals = (criticalAlerts ?? []).filter(
    (a) => a.severity === 'critical' || a.severity === 'high'
  );
  const totalRecs = recommendations?.length ?? 0;
  const lines = [];

  if (g >= 80) {
    lines.push(
      `Avec un score global de ${g}/100, votre site présente une excellente base technique. Quelques optimisations ciblées permettraient d'atteindre l'excellence.`
    );
  } else if (g >= 60) {
    lines.push(
      `Avec un score global de ${g}/100, votre site fonctionne — mais des problèmes techniques freinent sa croissance et limitent sa visibilité sur Google.`
    );
  } else if (g >= 40) {
    lines.push(
      `Avec un score global de ${g}/100, votre site est en dessous de la moyenne. Ces lacunes ont un impact direct sur votre trafic, votre crédibilité et vos ventes en ligne.`
    );
  } else {
    lines.push(
      `Avec un score global de ${g}/100, votre site présente des problèmes critiques. Sans corrections, vous perdez des visiteurs et exposez vos données à des risques sérieux.`
    );
  }

  const weakAreas = [];
  if (perf > 0 && perf < 60) weakAreas.push(`performance ${perf}/100`);
  if (sec > 0 && sec < 60) weakAreas.push(`sécurité ${sec}/100`);
  if (seo > 0 && seo < 60) weakAreas.push(`SEO ${seo}/100`);
  if (ux > 0 && ux < 60) weakAreas.push(`expérience mobile ${ux}/100`);

  if (weakAreas.length > 0) {
    const suffix =
      totalRecs > 0
        ? ` ${totalRecs} correction${totalRecs > 1 ? 's' : ''} prioritaire${totalRecs > 1 ? 's' : ''} ont été identifiées.`
        : '';
    lines.push(`Points faibles détectés : ${weakAreas.join(', ')}.${suffix}`);
  } else if (g < 80) {
    lines.push(
      `Les scores sont corrects dans l'ensemble, mais quelques optimisations permettraient d'améliorer votre classement Google et votre taux de conversion.`
    );
  }

  if (criticals.length > 0) {
    lines.push(
      `${criticals.length} alerte${criticals.length > 1 ? 's' : ''} critique${criticals.length > 1 ? 's' : ''} ${
        criticals.length > 1 ? 'nécessitent' : 'nécessite'
      } une correction urgente pour protéger vos visiteurs et votre réputation.`
    );
  } else if (g >= 60) {
    lines.push(
      `Aucune alerte critique détectée — votre site ne présente pas de danger immédiat pour vos visiteurs.`
    );
  }

  const improvementSentence = buildImprovementSentence(recommendations);
  if (improvementSentence) lines.push(improvementSentence);

  return lines.join('\n\n');
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Analyse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { saveScan } = useScans();

  const { isAuthenticated, user, signup, login } = useAuth();
  const isAdmin = user?.role === 'admin';

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

  const displayData = useMemo(() => filterWebisafeOnlyChecks(scanData, isAdmin), [scanData, isAdmin]);

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
    trackClarityEvent('scan_initiated', url);
    if (!url) {
      setScanError({ type: 'INVALID_URL', error: 'Aucune URL spécifiée.' });
      setScanState('error');
      return;
    }

    // Email requis uniquement si l'utilisateur n'est pas connecté
    const effectiveScanEmail = (isAuthenticated && user?.email) ? user.email : email;
    if (!effectiveScanEmail || typeof effectiveScanEmail !== 'string' || !effectiveScanEmail.includes('@') || !effectiveScanEmail.includes('.')) {
      setScanError({ type: 'INVALID_EMAIL', error: "Email requis pour recevoir les résultats." });
      setScanState('error');
      return;
    }

    try {
      const data = await runFullAnalysis(url, ({ step }) => setCurrentStep(step), effectiveScanEmail);

      if (!data?.success) {
        setScanError(data);
        setScanState('error');
        return;
      }

      const scanPayload = { ...data, email: effectiveScanEmail, paid: false };
      const id = saveScan(scanPayload);
      const storedScan = { ...scanPayload, id };

      try {
        await supabase.from('scan_events').insert({
          domain: extractDomain(url),
          score: storedScan.scores?.global ?? storedScan.global_score ?? null,
          country: storedScan.metrics?.performance?.server_location?.country ?? 'CI',
          created_at: new Date().toISOString(),
        });
      } catch (_) {
      }

      setScanId(id);
      setScanData(storedScan);
      setHasPaid(false);
      setScanState('results');
      trackClarityEvent('scan_completed', url);

      // Email nurturing post-scan gratuit
      try {
        const firstRec = storedScan.recommendations?.[0] || storedScan.recommandations?.[0] || null;
        await sendNurtureEmail({
          to: effectiveScanEmail,
          url,
          scanId: id,
          firstRecommendation: firstRec
            ? { title: firstRec.title || firstRec.titre || 'Recommandation prioritaire', description: firstRec.description || firstRec.resume || '' }
            : null,
        });
      } catch (e) {
        // Silencieux — ne pas bloquer l'expérience utilisateur
      }
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
  }, [email, isAuthenticated, user, saveScan, url]);

  useEffect(() => { performScan(); }, [performScan]);

  // ── Handlers flux de paiement ─────────────────────────────────────────────

  /**
   * Étape 1 : clic "Obtenir le rapport" dans FreemiumGate
   * → Si connecté   : ouvre directement WaveCheckoutModal
   * → Si non connecté : ouvre AuthModal en mode signup
   */
  const handleOpenAuth = useCallback(() => {
    trackClarityEvent('freemium_gate_opened');
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
    trackClarityEvent('payment_redirected', scanId);
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
  const globalScore = Number.isFinite(Number(displayData.global_score))
    ? Number(displayData.global_score)
    : Number.isFinite(Number(displayData?.scores?.global))
      ? Number(displayData.scores.global)
      : 0;

  const performanceScore = displayData?.scores?.performance ?? null;
  const securityScore = displayData?.scores?.security ?? null;
  const seoScore = displayData?.scores?.seo ?? null;
  const uxScore = displayData?.scores?.ux_mobile ?? displayData?.scores?.ux ?? null;

  const criticalAlerts = displayData.critical_alerts ?? [];
  const serverLocation =
    displayData.metrics?.performance?.server_location ??
    displayData.performance?.server_location ??
    null;
  const conclusionText = buildFreeScanNarrative(
    globalScore,
    performanceScore,
    securityScore,
    seoScore,
    uxScore,
    criticalAlerts,
    displayData?.recommendations ?? []
  );

  return (
    <div className="min-h-screen pt-24 pb-32 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-white hover:text-primary text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Retour à l'accueil
        </button>

        <div className="mb-8">
          <p className="text-primary text-sm font-semibold uppercase tracking-[0.24em] mb-2">
            Rapport d'audit gratuit
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Analyse de {extractDomain(url)}
          </h1>
        </div>
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

        <LargeSiteDisclaimer url={normalizeURL(url)} score={globalScore} />

        <CriticalAlertsBanner alerts={criticalAlerts} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <ScoreCard
            title="Performance"
            icon="⚡"
            iconLabel="Performance"
            score={performanceScore}
            metrics={getPerformanceMetrics(displayData)}
            isPaid={hasPaid}
            onViewDetails={handleViewDetails}
          />
          <ScoreCard
            title="Sécurité"
            icon="🔒"
            iconLabel="Sécurité"
            score={securityScore}
            metrics={getSecurityMetrics(displayData)}
            isPaid={hasPaid}
            onViewDetails={handleViewDetails}
          />
          <ScoreCard
            title="SEO"
            icon="🔍"
            iconLabel="SEO"
            score={seoScore}
            metrics={getSeoMetrics(displayData)}
            isPaid={hasPaid}
            onViewDetails={handleViewDetails}
          />
          <ScoreCard
            title="UX Mobile"
            icon="📱"
            iconLabel="Mobile"
            score={uxScore}
            metrics={getUxMetrics(displayData)}
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
          className="mb-12"
        >
          <div className="space-y-4">
            {hasPaid ? (
              <>
                {(
                  displayData.ai_analysis?.recommandations_prioritaires?.length >
                  0
                    ? displayData.ai_analysis.recommandations_prioritaires
                    : displayData.recommendations ?? []
                ).map((rec, index) => (
                  <RecommendationCard
                    key={`unlocked_${index}`}
                    recommendation={rec}
                    index={index}
                    isLocked={false}
                  />
                ))}

                {/* CTA Corrections clé-en-main — ferme la boucle pour Aïcha */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                    <div className="flex-shrink-0 rounded-xl bg-primary/10 p-3">
                      <Wrench size={28} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">
                        Trop technique ? On s'en occupe.
                      </h3>
                      <p className="text-sm text-white/70 max-w-xl">
                        Ne cherchez pas un développeur. Notre équipe corrige vos problèmes de sécurité, performance et SEO — en 48h, en français, via Wave.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        navigate(`/corrections?url=${encodeURIComponent(normalizeURL(url))}`)
                      }
                      className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors shadow-[0_0_20px_rgba(21,102,240,0.4)]"
                    >
                      Faites corriger par WebiSafe <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>
              </>
            ) : (() => {
              const totalRecs = displayData.recommendations?.length ?? 0;
              const allRecs = displayData.recommendations ?? [];
              const isExactly3 = totalRecs === 3;

              if (isExactly3) {
                return (
                  <>
                    {allRecs.slice(1).map((rec, index) => (
                      <RecommendationCard
                        key={`preview_${index}`}
                        recommendation={rec}
                        index={index}
                        isLocked={false}
                      />
                    ))}

                    <div className="relative rounded-2xl overflow-hidden">
                      <div className="filter blur-[3px] pointer-events-none select-none opacity-70">
                        <RecommendationCard
                          recommendation={allRecs[0]}
                          index={0}
                          isLocked={true}
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-navy/80 via-dark-navy/40 to-transparent flex flex-col items-center justify-center gap-3">
                        <p className="text-white font-bold text-sm"><span aria-hidden="true">🔒</span> Recommandation la plus critique</p>
                        <button
                          onClick={() => setShowFreemiumGate(true)}
                          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-[0_0_24px_rgba(21,102,240,0.5)] transition-all text-sm"
                        >
                          Voir la correction complète <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                );
              }

              return (
                <>
                  {(displayData.recommendations_preview ?? []).map((rec, index) => (
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
                          index={index + (displayData.recommendations_preview?.length ?? 0)}
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
                        <span aria-hidden="true">🔒</span> Obtenir le rapport complet
                        <ArrowRight size={16} />
                      </span>
                    </button>
                  </div>

                  <div className="text-center py-4">
                    <p className="text-white text-sm mb-4">
                      <Lock size={14} className="inline mr-1" />
                      {totalRecs - (displayData.recommendations_preview?.length ?? 0)}{' '}
                      corrections critiques supplémentaires disponibles
                    </p>
                  </div>
                </>
              );
            })()}
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
        scanData={displayData}
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