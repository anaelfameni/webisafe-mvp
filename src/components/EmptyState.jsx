import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function EmptyState({ icon, title, description, cta }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 bg-white/[0.03] px-6 py-12 text-center"
    >
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/25">
          {icon}
        </div>
      )}
      <p className="text-base font-black text-white">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/50">{description}</p>
      )}
      {cta && (
        cta.to ? (
          <Link
            to={cta.to}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover"
          >
            {cta.label} <ArrowRight size={14} />
          </Link>
        ) : (
          <button
            onClick={cta.onClick}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover"
          >
            {cta.label} <ArrowRight size={14} />
          </button>
        )
      )}
    </motion.div>
  );
}
