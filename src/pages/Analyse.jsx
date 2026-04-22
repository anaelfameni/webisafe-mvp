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
import { persistScanRecord } from '../utils/paymentApi';
import { normalizeURL, extractDomain } from '../utils/validators';

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
  const [showFreemiumGate, setShowFreemiumGate] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

  const performScan = useCallback(async () => {
    if (!url) {
      setScanState('error');
      return;
    }

    try {
      const data = await runFullAnalysis(url, ({ step }) => {
        setCurrentStep(step);
      });

      const scanPayload = { ...data, email, paid: false };
      const id = saveScan(scanPayload);
      const storedScan = { ...scanPayload, id };

      setScanId(id);
      setScanData(storedScan);
      setHasPaid(isPaid(id));
      persistScanRecord(storedScan).catch(() => null);
      setScanState('results');
    } catch (error) {
      console.error('Erreur scan:', error);
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

    if (email) {
      params.set('email', email);
    }

    navigate(`/payment?${params.toString()}`);
  }, [email, navigate, scanId, url]);

  const handleViewDetails = () => {
    if (hasPaid && scanId) {
      navigate(`/rapport/${scanId}`);
      return;
    }

    setShowFreemiumGate(true);
  };

  const getPerformanceMetrics = (data) => [
    { label: 'LCP', value: `${data.performance.core_web_vitals.lcp.value}ms`, status: data.performance.core_web_vitals.lcp.rating === 'good' ? 'pass' : 'fail' },
    { label: 'CLS', value: data.performance.core_web_vitals.cls.value, status: data.performance.core_web_vitals.cls.rating === 'good' ? 'pass' : 'fail' },
    { label: 'FCP', value: `${data.performance.core_web_vitals.fcp.value}ms`, status: data.performance.core_web_vitals.fcp.rating === 'good' ? 'pass' : 'fail' },
    { label: 'Taille Page', value: `${data.performance.poids_page_mb}MB` },
    { label: 'Requetes', value: data.performance.nb_requetes },
  ];

  const getSecurityMetrics = (data) => [
    { label: 'HTTPS', value: data.summary.https_enabled ? 'Active' : 'Non active', status: data.summary.https_enabled ? 'pass' : 'fail' },
    { label: 'SSL Grade', value: data.security.ssl_grade, status: data.security.ssl_grade === 'A+' || data.security.ssl_grade === 'A' ? 'pass' : 'fail' },
    { label: 'Headers Manquants', value: data.security.headers_manquants.length > 0 ? data.security.headers_manquants.join(', ') : 'Aucun', status: data.security.headers_manquants.length === 0 ? 'pass' : 'warn' },
    { label: 'Malware', value: data.security.malware ? 'Detecte !' : 'Aucun', status: data.security.malware ? 'fail' : 'pass' },
    { label: 'Failles OWASP', value: data.security.failles_owasp_count, status: data.security.failles_owasp_count === 0 ? 'pass' : 'fail' },
  ];

  const getSeoMetrics = (data) => [
    { label: 'Indexation Google', value: data.seo.indexed ? 'Oui' : 'Non', status: data.seo.indexed ? 'pass' : 'fail' },
    { label: 'Sitemap', value: data.seo.sitemap_present ? 'Trouvee' : 'Absente', status: data.seo.sitemap_present ? 'pass' : 'fail' },
    { label: 'Meta Tags', value: data.seo.meta_tags_ok ? 'OK' : 'Incomplets', status: data.seo.meta_tags_ok ? 'pass' : 'fail' },
    { label: 'Open Graph', value: data.seo.open_graph ? 'Present' : 'Absent', status: data.seo.open_graph ? 'pass' : 'fail' },
  ];

  const getUxMetrics = (data) => [
    { label: 'Responsive', value: data.ux.responsive ? 'Oui' : 'Non', status: data.ux.responsive ? 'pass' : 'fail' },
    { label: 'Taille Texte', value: `${data.ux.taille_texte_px}px`, status: data.ux.taille_texte_px >= 12 ? 'pass' : 'fail' },
    { label: 'Elements Tactiles', value: data.ux.elements_tactiles_ok ? 'Optimises' : 'Trop proches', status: data.ux.elements_tactiles_ok ? 'pass' : 'fail' },
    { label: 'Score Vitesse Mobile', value: `${data.ux.vitesse_mobile}/100`, status: data.ux.vitesse_mobile >= 70 ? 'pass' : 'warn' },
  ];

  const conclusionText = scanData?.summary?.resume_executif || '';

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Aucune URL specifiee</h2>
          <p className="text-white mb-6">Veuillez entrer une URL a analyser.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-all"
          >
            Retour a l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (scanState === 'scanning') {
    return <ScanProgress currentStep={currentStep} url={url} />;
  }

  if (scanState === 'error' || !scanData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Erreur d'analyse</h2>
          <p className="text-white mb-2">Ce site est inaccessible ou l'URL est incorrecte.</p>
          <p className="text-white text-sm mb-6">Verifiez que l'URL est correcte (ex: https://votresite.ci)</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-all"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">Resultats de l'audit</h1>
          <p className="text-lg text-white">{extractDomain(url)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <PremiumScoreCard
            score={scanData.scores.global}
            domain={extractDomain(url)}
            badgeLiftMobile={true}
            ctaButton={
              !hasPaid && (
                <button
                  onClick={() => setShowFreemiumGate(true)}
                  className="w-full sm:w-auto px-10 py-5 text-lg bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all btn-glow relative overflow-hidden flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(21,102,240,0.5)] mx-auto"
                >
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2.5s_infinite]" />
                  Debloquer mon rapport
                  <ArrowRight size={20} />
                </button>
              )
            }
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <ScoreCard title="Performance" icon="⚡" score={scanData.scores.performance} metrics={getPerformanceMetrics(scanData)} isPaid={hasPaid} onViewDetails={handleViewDetails} />
          <ScoreCard title="Securite" icon="🔒" score={scanData.scores.security} metrics={getSecurityMetrics(scanData)} isPaid={hasPaid} onViewDetails={handleViewDetails} />
          <ScoreCard title="SEO" icon="🔍" score={scanData.scores.seo} metrics={getSeoMetrics(scanData)} isPaid={hasPaid} onViewDetails={handleViewDetails} />
          <ScoreCard title="UX Mobile" icon="📱" score={scanData.scores.ux_mobile} metrics={getUxMetrics(scanData)} isPaid={hasPaid} onViewDetails={handleViewDetails} />
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
                    Synthese strategique
                  </span>
                  <h2 className="mt-3 text-xl md:text-2xl font-bold text-white">
                    Ce que ce scan revele vraiment pour votre site
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h2 className="text-xl font-bold text-white mb-2">Problemes identifies</h2>
          <p className="text-white text-sm mb-6">
            {scanData.recommendations.length} corrections recommandees pour votre site
          </p>

          <div className="space-y-4">
            {(() => {
              const visibleRecs = hasPaid ? scanData.ai_analysis.recommandations_prioritaires : scanData.recommendations_preview;
              const blurredRecsCount = 6; // Estimation pour le flou

              return (
                <>
                  {visibleRecs.map((rec, index) => (
                    <RecommendationCard key={`visible_${index}`} recommendation={rec} index={index} isLocked={false} />
                  ))}

                  {!hasPaid && (
                    <>
                      {[1, 2, 3].map((_, index) => (
                        <RecommendationCard
                          key={`blurred_${index}`}
                          recommendation={{ action: 'Contenu premium', impact: 'Significatif', difficulte: 'Moyenne', temps: '2h' }}
                          index={index + visibleRecs.length}
                          isLocked={true}
                        />
                      ))}

                      <div className="text-center py-6">
                        <p className="text-white text-sm mb-4">
                          <Lock size={14} className="inline mr-1" />
                          {blurredRecs.length} corrections critiques et supplementaires disponibles
                        </p>
                        <button
                          onClick={() => setShowFreemiumGate(true)}
                          className="relative overflow-hidden inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover text-white text-base font-bold rounded-full transition-all btn-glow shadow-[0_0_24px_rgba(21,102,240,0.42)]"
                        >
                          <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
                          <span className="relative z-10 flex items-center gap-2">
                            Debloquer le rapport complet
                            <ArrowRight size={18} />
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </motion.div>
      </div>

      {!hasPaid && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-navy/95 backdrop-blur-xl border-t border-border-color p-4 z-40">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-white font-semibold text-sm">Debloquer le rapport complet - 35 000 FCFA</p>
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

      <FreemiumGate
        isOpen={showFreemiumGate}
        onClose={() => setShowFreemiumGate(false)}
        onUpgrade={() => {
          setShowFreemiumGate(false);
          handleUpgrade();
        }}
        scanData={scanData}
      />
    </div>
  );
}
