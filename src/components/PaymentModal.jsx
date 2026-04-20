import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, CreditCard, Mail, Loader2, CheckCircle } from 'lucide-react';

export default function PaymentModal({ isOpen, onClose, scanData, onPaymentComplete }) {
  const [email, setEmail] = useState(scanData?.email || '');
  const [emailError, setEmailError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePayment = async () => {
    if (!email) {
      setEmailError(true);
      return;
    }
    
    setEmailError(false);

    setLoading(true);

    // Simuler le processus de paiement CinetPay
    await new Promise(resolve => setTimeout(resolve, 2500));

    setLoading(false);
    setSuccess(true);

    // Appeler le callback après 2 secondes
    setTimeout(() => {
      onPaymentComplete?.();
      setSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card-bg border border-border-color rounded-2xl w-full max-w-md overflow-hidden"
          >
            {success ? (
              /* Success State */
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <CheckCircle size={64} className="text-success mx-auto mb-4" />
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-2">Paiement confirmé !</h3>
                <p className="text-text-secondary text-sm">
                  Votre rapport complet est en cours de génération...
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border-color">
                  <h3 className="text-lg font-bold text-white">Obtenir le rapport complet</h3>
                  <button
                    onClick={onClose}
                    className="p-1 text-text-secondary hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                  {/* Recap */}
                  <div className="bg-dark-navy rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-text-secondary text-sm">Site analysé</span>
                      <span className="text-primary text-sm font-medium truncate max-w-[200px]">
                        {scanData?.url || scanData?.domain}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-text-secondary text-sm">Score global</span>
                      <span className="text-white font-bold">{scanData?.scores?.global}/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary text-sm">Rapport complet</span>
                      <span className="text-white font-bold">35 000 FCFA</span>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-text-secondary text-sm mb-1 block">
                      Email pour recevoir le rapport
                    </label>
                    <div className="relative">
                      <Mail size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${emailError ? 'text-danger' : 'text-text-secondary'}`} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                        placeholder="votre@email.com"
                        className={`w-full pl-10 pr-4 py-3 bg-dark-navy border rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none transition-colors text-sm ${emailError ? 'border-danger focus:border-danger' : 'border-border-color focus:border-primary'}`}
                      />
                    </div>
                    {emailError && <p className="text-danger text-xs mt-1.5">Veuillez entrer une adresse email pour recevoir votre rapport.</p>}
                  </div>

                  {/* Inclusions */}
                  <div className="space-y-2">
                    <p className="text-text-secondary text-xs">Ce rapport comprend :</p>
                    {[
                      'PDF 6 pages professionnel',
                      '25+ métriques détaillées',
                      'Plan d\'action priorisé',
                      '1 rescan gratuit dans 30 jours',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle size={14} className="text-success" />
                        <span className="text-text-primary">{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pay button */}
                  <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed btn-glow"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Traitement en cours...
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        Payer 35 000 FCFA via CinetPay
                      </>
                    )}
                  </button>

                  {/* Payment logos */}
                  <div className="text-center space-y-2">
                    <p className="text-text-secondary/60 text-xs">
                      🔒 Paiement sécurisé via CinetPay
                    </p>
                    <div className="flex items-center justify-center gap-4 text-text-secondary text-xs">
                      <span className="px-2 py-1 bg-dark-navy rounded">Wave</span>
                      <span className="px-2 py-1 bg-dark-navy rounded">Orange Money</span>
                      <span className="px-2 py-1 bg-dark-navy rounded">MTN MoMo</span>
                    </div>
                    <p className="text-text-secondary/40 text-[10px]">
                      Rapport envoyé par email dans les 2 minutes · Aucun remboursement après génération
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
