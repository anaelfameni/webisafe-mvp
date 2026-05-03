import { motion } from 'framer-motion';
import { Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PartnerCTA() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-card-bg border border-border-color rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
        >
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-success/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 bg-success/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Users size={32} className="text-success" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Devenez partenaire Webisafe</h3>
              <p className="text-text-secondary text-sm">
                Rejoignez le programme Affiliate. Recommandez Webisafe et gagnez{' '}
                <strong className="text-success">jusqu'à 50% de commission</strong> sur chaque Audit
                Premium.
              </p>
            </div>
          </div>

          <Link
            to="/partenaire"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="whitespace-nowrap px-6 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-full transition-all flex items-center justify-center gap-2 relative z-10"
          >
            Découvrir le programme
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
