import { motion } from 'framer-motion';
import { isKnownLargeSite, getLargeSiteDisclaimer } from '../utils/knownSites';

export default function LargeSiteDisclaimer({ url, score }) {
  const disclaimer = isKnownLargeSite(url) ? getLargeSiteDisclaimer(score) : null;
  if (!disclaimer) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300"
    >
      <span className="font-semibold"><span aria-hidden="true">ℹ️</span> {disclaimer.title} : </span>
      {disclaimer.message}
    </motion.div>
  );
}
