import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Circle, ArrowLeft } from 'lucide-react';

const SCAN_STEPS = [
  'Connexion au site...',
  'Analyse des performances (Core Web Vitals)...',
  'Vérification sécurité...',
  'Audit SEO technique...',
  'Test expérience mobile...',
  'Génération des recommandations',
];

const FACTS = [
  '💡 53% des visiteurs quittent un site qui met plus de 3 secondes à charger',
  '🔒 73% des sites web en Afrique ont au moins une faille de sécurité critique',
  '📱 Plus de 80% du trafic web en Afrique vient du mobile',
  '🔍 75% des utilisateurs ne vont jamais au-delà de la première page Google',
  '⚡ Amazon perd 1% de revenus pour chaque 100ms de délai supplémentaire',
  '🌍 Le temps de chargement moyen en Afrique est de 8.7 secondes',
  '💰 Un site rapide peut augmenter vos conversions de 7%',
  '🛡️ 43% des cyberattaques ciblent les petites entreprises',
];

export default function ScanProgress({ currentStep, url }) {
  const navigate = useNavigate();
  const [factIndex, setFactIndex] = useState(0);
  const progress = ((currentStep + 1) / SCAN_STEPS.length) * 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FACTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-1 text-white/60 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft size={16} /> Retour à l'accueil
      </button>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card-bg border border-border-color rounded-2xl p-8 lg:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-400 to-success shimmer" />

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-xl">
            W
          </div>
          <span className="text-2xl font-bold text-white">
            Webi<span className="text-primary">safe</span>
          </span>
        </div>

        {/* URL */}
        <p className="text-text-secondary text-sm mb-8 text-center bg-dark-navy py-2 px-4 rounded-lg inline-block mx-auto w-full">
          Analyse en cours de <span className="text-primary font-medium">{url}</span>
        </p>

        {/* Progress Bar */}
        <div className="w-full mb-8">
          <div className="h-2 bg-dark-navy rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-success rounded-full relative"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="absolute inset-0 shimmer" />
            </motion.div>
          </div>
          <p className="text-right text-text-secondary text-xs mt-2 font-medium">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Steps */}
        <div className="w-full space-y-4 mb-10">
          {SCAN_STEPS.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: index <= currentStep + 1 ? 1 : 0.3,
                x: 0,
              }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              {index < currentStep ? (
                <CheckCircle size={18} className="text-success flex-shrink-0" />
              ) : index === currentStep ? (
                <Loader2 size={18} className="text-primary animate-spin flex-shrink-0" />
              ) : (
                <Circle size={18} className="text-text-secondary/30 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  index < currentStep
                    ? 'text-success'
                    : index === currentStep
                    ? 'text-white font-medium'
                    : 'text-text-secondary/40'
                }`}
              >
                {step}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Educational Facts */}
        <div className="h-16 flex items-center justify-center border-t border-border-color pt-4">
          <motion.div
            key={factIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <p className="text-text-secondary text-sm italic">
              {FACTS[factIndex]}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
