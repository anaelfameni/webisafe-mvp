import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Download, Share2, Lock } from 'lucide-react';
import ScanProgress from '../components/ScanProgress';
import PremiumScoreCard from '../components/PremiumScoreCard';
import ScoreCard from '../components/ScoreCard';
import RecommendationCard from '../components/RecommendationCard';
import FreemiumGate from '../components/FreemiumGate';
import PaymentModal from '../components/PaymentModal';
import HighlightedTechText from '../components/HighlightedTechText';
import { runFullAnalysis } from '../utils/api';
import { useScans } from '../hooks/useScans';
import { normalizeURL, extractDomain } from '../utils/validators';
import { buildScanConclusion } from '../utils/scanConclusion';

export default function Analyse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { saveScan, markAsPaid, isPaid } = useScans();

  const url = searchParams.get('url') || '';
  const email = searchParams.get('email') || '';

  const [scanState, setScanState] = useState('scanning'); // 'scanning' | 'results' | 'error'
  const [currentStep, setCurrentStep] = useState(0);
  const [scanData, setScanData] = useState(null);
  const [scanId, setScanId] = useState(null);
  const [showFreemiumGate, setShowFreemiumGate] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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

      // Sauvegarder le scan
      const id = saveScan({ ...data, email });
      setScanId(id);
      setScanData(data);
      setHasPaid(isPaid(id));
      setScanState('results');
    } catch (error) {
      console.error('Erreur scan:', error);
      setScanState('error');
    }
  }, [url, email, saveScan, isPaid]);

  useEffect(() => {
    performScan();
  }, []);  // Run once on mount

  const handleViewDetails = () => {
    if (hasPaid) {
      navigate(`/rapport/${scanId}`);
    } else {
      setShowFreemiumGate(true);
    }
  };

  const handlePaymentComplete = () => {
    if (scanId) {
      markAsPaid(scanId);
      setHasPaid(true);
      setShowPaymentModal(false);
      navigate(`/rapport/${scanId}`);
    }
  };

  // Build metrics for each category
  const getPerformanceMetrics = (data) => [
    { label: 'Temps de chargement', value: data.performance.loadTime, status: parseFloat(data.performance.loadTime) < 3 ? 'pass' : 'fail' },
    { label: 'Taille de la page', value: data.performance.pageSize },
    { label: 'LCP', value: data.performance.lcp, status: data.performance.status?.lcp },
    { label: 'FID', value: data.performance.fid, status: data.performance.status?.fid },
    { label: 'CLS', value: data.performance.cls, status: data.performance.status?.cls },
  ];

  const getSecurityMetrics = (data) => [
    { label: 'HTTPS', value: data.security.https ? 'Activé' : 'Non activé', status: data.security.https ? 'pass' : 'fail' },
    { label: 'Certificat SSL', value: data.security.sslValid ? `Valide (${data.security.sslDays}j)` : 'Invalide', status: data.security.sslValid ? 'pass' : 'fail' },
    { label: 'HSTS', value: data.security.hsts ? 'Activé' : 'Absent', status: data.security.hsts ? 'pass' : 'fail' },
    { label: 'CSP', value: data.security.csp ? 'Présent' : 'Absent', status: data.security.csp ? 'pass' : 'fail' },
    { label: 'Malware', value: data.security.malware ? 'Détecté !' : 'Aucun', status: data.security.malware ? 'fail' : 'pass' },
  ];

  const getSeoMetrics = (data) => [
    { label: 'Balise Title', value: data.seo.titleOk ? `OK (${data.seo.titleLength} car.)` : 'Absente', status: data.seo.titleOk ? 'pass' : 'fail' },
    { label: 'Meta Description', value: data.seo.descriptionOk ? 'Présente' : 'Absente', status: data.seo.descriptionOk ? 'pass' : 'fail' },
    { label: 'Images sans ALT', value: `${data.seo.altMissing} image(s)`, status: data.seo.altMissing === 0 ? 'pass' : data.seo.altMissing < 5 ? 'warn' : 'fail' },
    { label: 'Sitemap.xml', value: data.seo.sitemapOk ? 'Trouvé' : 'Non trouvé', status: data.seo.sitemapOk ? 'pass' : 'fail' },
    { label: 'Robots.txt', value: data.seo.robotsTxtOk ? 'Trouvé' : 'Non trouvé', status: data.seo.robotsTxtOk ? 'pass' : 'fail' },
  ];

  const getUxMetrics = (data) => [
    { label: 'Responsive', value: data.ux.responsive ? 'Oui' : 'Non', status: data.ux.responsive ? 'pass' : 'fail' },
    { label: 'Texte lisible', value: data.ux.textReadable ? 'Oui' : 'Non', status: data.ux.textReadable ? 'pass' : 'fail' },
    { label: 'Éléments tactiles', value: data.ux.tapTargets ? 'Espacés' : 'Trop proches', status: data.ux.tapTargets ? 'pass' : 'fail' },
    { label: 'Interactivité', value: data.ux.timeToInteractive },
  ];

  const conclusionText = scanData ? buildScanConclusion(scanData) : '';

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Aucune URL spécifiée</h2>
          <p className="text-text-secondary mb-6">Veuillez entrer une URL à analyser.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-all"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (scanState === 'scanning') {
    return <ScanProgress currentStep={currentStep} url={url} />;
  }

  if (scanState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Erreur d'analyse</h2>
          <p className="text-text-secondary mb-2">Ce site est inaccessible ou l'URL est incorrecte.</p>
          <p className="text-text-secondary text-sm mb-6">Vérifiez que l'URL est correcte (ex: https://votresite.ci)</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-all"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">
            Résultats de l'audit
          </h1>
          <p className="text-lg text-text-secondary">
            {extractDomain(url)}
          </p>
          {scanData?.isPartial && (
            <p className="inline-block mt-3 bg-warning/10 border border-warning/20 text-warning text-xs px-3 py-1 rounded-full">
              ⚠️ Résultats fictifs pour la démo
            </p>
          )}
        </motion.div>

        {/* Premium Score Card replacing the old Global Score Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
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
                  {/* Shiny sheen passed across button */}
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2.5s_infinite]" />
                  Obtenir un rapport complet
                  <ArrowRight size={20} />
                </button>
              )
            }
          />
        </motion.div>

        {/* 4 Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <ScoreCard
            title="Performance"
            icon="⚡"
            score={scanData.scores.performance}
            metrics={getPerformanceMetrics(scanData)}
            isPaid={hasPaid}
            onViewDetails={handleViewDetails}
          />
          <ScoreCard
            title="Sécurité"
            icon="🔒"
            score={scanData.scores.security}
            metrics={getSecurityMetrics(scanData)}
            isPaid={hasPaid}
            onViewDetails={handleViewDetails}
          />
          <ScoreCard
            title="SEO"
            icon="🔍"
            score={scanData.scores.seo}
            metrics={getSeoMetrics(scanData)}
            isPaid={hasPaid}
            onViewDetails={handleViewDetails}
          />
          <ScoreCard
            title="UX Mobile"
            icon="📱"
            score={scanData.scores.ux}
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
                    className={`max-w-4xl text-sm md:text-[15px] leading-7 ${
                      index === 0 ? 'text-white/92' : 'text-slate-300'
                    }`}
                  >
                    <HighlightedTechText text={paragraph} />
                  </p>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold text-white mb-2">Problèmes identifiés</h2>
          <p className="text-text-secondary text-sm mb-6">
            {scanData.recommendations.length} corrections recommandées pour votre site
          </p>

          <div className="space-y-4">
            {(() => {
              const critiqueRecs = scanData.recommendations.filter(r => r.priority === 'CRITIQUE');
              const otherRecs = scanData.recommendations.filter(r => r.priority !== 'CRITIQUE');

              const visibleRecs = hasPaid ? scanData.recommendations : otherRecs.slice(0, 3);
              const blurredRecs = hasPaid ? [] : [...critiqueRecs, ...otherRecs.slice(3)];

              return (
                <>
                  {/* Visible recommendations */}
                  {visibleRecs.map((rec, index) => (
                    <RecommendationCard
                      key={`vis_rec_${index}`}
                      recommendation={rec}
                      index={index}
                      isLocked={false}
                    />
                  ))}

                  {/* Locked recommendations */}
                  {!hasPaid && blurredRecs.length > 0 && (
                    <>
                      {blurredRecs.slice(0, 3).map((rec, index) => (
                        <RecommendationCard
                          key={`blur_rec_${index}`}
                          recommendation={rec}
                          index={index + visibleRecs.length}
                          isLocked={true}
                        />
                      ))}

                      <div className="text-center py-6">
                        <p className="text-text-secondary text-sm mb-4">
                          <Lock size={14} className="inline mr-1" />
                          {blurredRecs.length} corrections critiques et supplémentaires disponibles
                        </p>
                        <button
                          onClick={() => setShowFreemiumGate(true)}
                          className="relative overflow-hidden inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover text-white text-base font-bold rounded-full transition-all btn-glow shadow-[0_0_24px_rgba(21,102,240,0.42)]"
                        >
                          <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
                          <span className="relative z-10 flex items-center gap-2">
                            Débloquer le rapport complet
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

      {/* Sticky CTA Bottom Bar */}
      {!hasPaid && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-navy/95 backdrop-blur-xl border-t border-border-color p-4 z-40">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-white font-semibold text-sm">
                Débloquer le rapport complet — 35 000 FCFA
              </p>
              <p className="text-text-secondary text-xs">
                PDF 6 pages · Plan d'action · 1 rescan offert dans 30 jours
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex-1 sm:flex-none px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition-all btn-glow text-sm flex items-center justify-center gap-2"
              >
                Obtenir Mon Rapport PDF
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 text-text-secondary/50 text-xs">
            <span>Wave</span>·<span>Orange Money</span>·<span>MTN MoMo</span>·<span>CinetPay</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <FreemiumGate
        isOpen={showFreemiumGate}
        onClose={() => setShowFreemiumGate(false)}
        onUpgrade={() => { setShowFreemiumGate(false); setShowPaymentModal(true); }}
        scanData={scanData}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        scanData={{ ...scanData, email }}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
}
