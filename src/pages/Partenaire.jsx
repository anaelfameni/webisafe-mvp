import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Award, CheckCircle, Gem, Star, Target } from 'lucide-react';

export default function Partenaire({ user }) {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 max-w-4xl mx-auto"
      >
        <div className="inline-flex items-center justify-center p-3 bg-success/10 rounded-2xl mb-6">
          <Target size={32} className="text-success" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
          Programme <span className="text-success">Affiliate</span> Webisafe
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          Accessible à tous : agences, indépendants, freelances et consultants. Obtenez un lien
          personnalisé et gagnez jusqu'à 50% de commission pour chaque audit premium généré.
        </p>
      </motion.div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Tiers & Progression</h2>

            <div className="space-y-6">
              <div className="bg-card-bg border border-border-color rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Star size={64} className="text-[#CD7F32]" />
                </div>
                <h3 className="text-xl font-bold text-[#CD7F32] mb-4 flex items-center gap-2">
                  🥉 BRONZE
                  <span className="text-sm font-normal text-text-secondary ml-2">
                    (0-10 clients référés)
                  </span>
                </h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-[#CD7F32]" />
                    Commission : <strong className="text-white ml-1">30%</strong>
                  </li>
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-[#CD7F32]" />
                    Support : Email uniquement
                  </li>
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-[#CD7F32]" />
                    Condition : inscription gratuite
                  </li>
                </ul>
              </div>

              <div className="bg-card-bg border border-border-color rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Star size={64} className="text-[#C0C0C0]" />
                </div>
                <h3 className="text-xl font-bold text-[#C0C0C0] mb-4 flex items-center gap-2">
                  🥈 SILVER
                  <span className="text-sm font-normal text-text-secondary ml-2">(11-50 clients)</span>
                </h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-[#C0C0C0]" />
                    Commission : <strong className="text-white ml-1">35%</strong>
                  </li>
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-[#C0C0C0]" />
                    Support : WhatsApp prioritaire
                  </li>
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-[#C0C0C0]" />
                    Badge : Partenaire Certifié Webisafe
                  </li>
                </ul>
              </div>

              <div className="bg-card-bg border border-warning/30 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Award size={64} className="text-warning" />
                </div>
                <h3 className="text-xl font-bold text-warning mb-4 flex items-center gap-2">
                  🥇 GOLD
                  <span className="text-sm font-normal text-text-secondary ml-2">(51-200 clients)</span>
                </h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-warning" />
                    Commission : <strong className="text-white ml-1">40%</strong>
                  </li>
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-warning" />
                    Badge : Partenaire Or Webisafe
                  </li>
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-warning" />
                    Mise en avant sur webisafe.ci/partners
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-card-bg to-primary/10 border border-primary/50 shadow-[0_0_15px_rgba(21,102,240,0.3)] rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Gem size={64} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  💎 PLATINUM
                  <span className="text-sm font-normal text-primary ml-2">(201+ clients)</span>
                </h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-primary" />
                    Commission : <strong className="text-white ml-1">50%</strong>
                  </li>
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-primary" />
                    Account manager dédié
                  </li>
                  <li className="flex gap-2 items-center">
                    <CheckCircle size={16} className="text-primary" />
                    Accompagnement stratégique avancé
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-card-bg border border-border-color rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Conditions d'accès</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle size={20} className="text-success flex-shrink-0 mt-0.5" />
                <span className="text-text-secondary text-sm">Création de compte Webisafe gratuite.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={20} className="text-success flex-shrink-0 mt-0.5" />
                <span className="text-text-secondary text-sm">
                  Remplissage rapide d'un profil partenaire pour qualifier votre activité.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={20} className="text-success flex-shrink-0 mt-0.5" />
                <span className="text-text-secondary text-sm">
                  Lien personnalisé d'affilié fourni immédiatement après activation.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-danger mb-2">Important</h2>
            <p className="text-text-secondary text-sm mb-4">
              Le programme partenaire ne débloque pas de scans premium gratuits.
            </p>
            <ul className="space-y-2 text-sm text-danger/80">
              <li>• 1 scan basique gratuit / jour maximum</li>
              <li>• Pas de scans premium gratuits</li>
              <li className="font-semibold text-danger">• Avantage principal : vos commissions sur les parrainages</li>
            </ul>
          </div>

          <div className="bg-card-bg border border-border-color rounded-2xl p-6 overflow-hidden">
            <p className="text-text-secondary mb-5 text-sm">Aperçu du dashboard partenaire :</p>
            <div className="rounded-2xl border border-white/10 bg-[#0b1120] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Dashboard AgenceXYZ</p>
                  <h3 className="text-white font-bold text-lg mt-1">Vue partenaire</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#CD7F32]/10 text-[#CD7F32] text-xs font-semibold">
                  Bronze • 30%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Clients référés', value: '3' },
                  { label: 'CA généré', value: '105k' },
                  { label: 'Commission', value: '31.5k' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-white/5 border border-white/5 p-3">
                    <p className="text-[11px] text-text-secondary">{item.label}</p>
                    <p className="text-white font-bold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-primary/8 border border-primary/15 p-4 mb-4">
                <p className="text-xs text-text-secondary mb-1">Lien de parrainage</p>
                <p className="text-primary font-medium text-sm break-all">webisafe.ci/scan?ref=xyz123</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Prochain paiement</span>
                <span className="text-white font-semibold">5 mars</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => navigate(user ? '/partenaire/confirmation' : '/?auth=signup')}
              className="relative overflow-hidden inline-flex items-center justify-center gap-2 px-8 py-4 bg-success hover:bg-success/90 text-white font-bold rounded-full transition-all btn-glow"
            >
              <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
              <span className="relative z-10 inline-flex items-center gap-2">
                Créer mon compte partenaire
                <ArrowRight size={20} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
