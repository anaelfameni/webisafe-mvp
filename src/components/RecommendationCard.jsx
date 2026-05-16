import { motion } from 'framer-motion';
import { Lock, Clock, Wrench, AlertTriangle, Sparkles } from 'lucide-react';

// Adapté au nouveau format de recommandation :
// { priorite, categorie, action, explication, impact, difficulte, temps }
// ET à l'ancien format :
// { priority, title, description, impactBusiness, action, difficulty, time }

const FAULT_TIME_MAP = {
  ssl_expired: '10 minutes', ssl_misconfigured: '20 minutes', hsts_missing: '15 minutes',
  csp_missing: '30 minutes', xframe_missing: '10 minutes', xcontent_missing: '10 minutes',
  mixed_content: '45 minutes', images_unoptimized: '20 minutes', cache_missing: '15 minutes',
  gzip_disabled: '10 minutes', js_render_blocking: '1 heure', css_render_blocking: '45 minutes',
  meta_title_missing: '5 minutes', meta_description_missing: '5 minutes', h1_missing: '5 minutes',
  alt_missing: '15 minutes', sitemap_missing: '20 minutes', robots_missing: '10 minutes',
  xss_vulnerability: '2 à 4 heures', sql_injection: '3 à 6 heures',
  wordpress_outdated: '15 minutes', plugin_outdated: '10 minutes',
  no_https_redirect: '15 minutes', mobile_not_responsive: '2 à 8 heures', default: '30 minutes',
};

const FAULT_DIFFICULTY_MAP = {
  ssl_expired: 'Facile — Faisable sans développeur',
  ssl_misconfigured: 'Intermédiaire — Accès hébergeur requis',
  hsts_missing: 'Technique — Modification fichier serveur',
  csp_missing: 'Technique — Connaissance HTTP requise',
  xframe_missing: 'Intermédiaire — Accès hébergeur requis',
  xcontent_missing: 'Intermédiaire — Accès hébergeur requis',
  mixed_content: 'Intermédiaire — Inspection du code requise',
  images_unoptimized: 'Facile — Faisable sans développeur',
  cache_missing: 'Intermédiaire — Plugin ou config serveur',
  gzip_disabled: 'Intermédiaire — Accès hébergeur requis',
  js_render_blocking: 'Technique — Connaissance JavaScript',
  css_render_blocking: 'Technique — Connaissance CSS',
  meta_title_missing: 'Facile — Faisable sans développeur',
  meta_description_missing: 'Facile — Faisable sans développeur',
  h1_missing: 'Facile — Faisable sans développeur',
  alt_missing: 'Facile — Faisable sans développeur',
  sitemap_missing: 'Facile — Plugin WordPress ou outil en ligne',
  robots_missing: 'Intermédiaire — Accès FTP requis',
  xss_vulnerability: 'Expert — Développeur senior requis',
  sql_injection: 'Expert — Développeur senior requis',
  wordpress_outdated: 'Facile — Faisable sans développeur',
  plugin_outdated: 'Facile — Faisable sans développeur',
  no_https_redirect: 'Intermédiaire — Accès hébergeur requis',
  mobile_not_responsive: 'Expert — Développeur requis',
  default: 'Intermédiaire',
};

function getTemps(rec) {
  if (rec.temps && String(rec.temps).trim()) return String(rec.temps).trim();
  if (rec.time && String(rec.time).trim()) return String(rec.time).trim();
  return FAULT_TIME_MAP[rec.faultType] || FAULT_TIME_MAP.default;
}

function getDifficulte(rec) {
  const raw = rec.difficulte || rec.difficulty || '';
  if (raw && String(raw).trim()) return String(raw).trim();
  return FAULT_DIFFICULTY_MAP[rec.faultType] || FAULT_DIFFICULTY_MAP.default;
}

function getDifficulteColor(label) {
  const l = String(label || '').toLowerCase();
  if (l.includes('expert')) return 'text-red-400';
  if (l.includes('technique')) return 'text-orange-400';
  if (l.includes('intermédiaire') || l.includes('intermediaire')) return 'text-yellow-400';
  return 'text-green-400';
}

function DifficultyBadge({ label }) {
  const text = String(label || '').split('—')[0].trim() || 'Intermédiaire';
  const color = getDifficulteColor(label);
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wider ${color}`}>
      {text}
    </span>
  );
}

function getCategorieStyle(categorie) {
  const cat = String(categorie || '').toLowerCase();
  if (cat.includes('sécurité') || cat.includes('securite')) {
    return {
      borderColor: 'border-red-500/30',
      badgeBg: 'bg-red-500/10',
      badgeText: 'text-red-400',
      dot: 'bg-red-500',
    };
  }
  if (cat.includes('performance')) {
    return {
      borderColor: 'border-blue-500/30',
      badgeBg: 'bg-blue-500/10',
      badgeText: 'text-blue-400',
      dot: 'bg-blue-500',
    };
  }
  if (cat.includes('seo')) {
    return {
      borderColor: 'border-purple-500/30',
      badgeBg: 'bg-purple-500/10',
      badgeText: 'text-purple-400',
      dot: 'bg-purple-500',
    };
  }
  if (cat.includes('ux') || cat.includes('mobile')) {
    return {
      borderColor: 'border-green-500/30',
      badgeBg: 'bg-green-500/10',
      badgeText: 'text-green-400',
      dot: 'bg-green-500',
    };
  }
  return {
    borderColor: 'border-warning/30',
    badgeBg: 'bg-warning/10',
    badgeText: 'text-warning',
    dot: 'bg-warning',
  };
}

function isSecuriteCategory(categorie) {
  const c = String(categorie || '').toLowerCase();
  return c.includes('sécurité') || c.includes('securite') || c.includes('security');
}

function getPrioriteLabel(priorite, categorie) {
  if (isSecuriteCategory(categorie)) return { text: 'Priorité urgente', tone: 'critical' };
  const p = Number(priorite);
  if (p === 1) return { text: 'Priorité urgente', tone: 'critical' };
  if (p === 2) return { text: 'Priorité haute', tone: 'warning' };
  if (p <= 4) return { text: 'Priorité moyenne', tone: 'medium' };
  return { text: 'Amélioration', tone: 'low' };
}

function priorityToneClasses(tone) {
  if (tone === 'critical') return 'bg-danger/10 text-danger border-danger/20';
  if (tone === 'warning') return 'bg-warning/10 text-warning border-warning/20';
  if (tone === 'medium') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  return 'bg-success/10 text-success border-success/20';
}

function getPriorityConfig(priority, categorie) {
  const isUrgent = isSecuriteCategory(categorie) || priority === 'CRITIQUE';
  const configs = {
    CRITIQUE: { borderColor: 'border-danger/30', badgeBg: 'bg-danger/10', badgeText: 'text-danger', dot: 'bg-danger', label: 'URGENT' },
    IMPORTANT: { borderColor: 'border-warning/30', badgeBg: 'bg-warning/10', badgeText: 'text-warning', dot: 'bg-warning', label: isUrgent ? 'URGENT' : 'IMPORTANT' },
    AMELIORATION: { borderColor: 'border-success/30', badgeBg: 'bg-success/10', badgeText: 'text-success', dot: 'bg-success', label: 'AMÉLIORATION' },
  };
  if (isUrgent && priority !== 'CRITIQUE' && priority !== 'AMELIORATION') {
    return { ...configs.CRITIQUE };
  }
  return configs[priority] ?? configs.IMPORTANT;
}

export default function RecommendationCard({ recommendation, index, isLocked }) {
  if (!recommendation) return null;

  // Détection du format : nouveau (action/explication/priorite) ou ancien (title/description/priority)
  const isNewFormat = recommendation.action !== undefined && recommendation.explication !== undefined;

  if (isNewFormat) {
    // ── Nouveau format ──────────────────────────────────────────────────────
    const style = getCategorieStyle(recommendation.categorie);
    const prioriteLabel = getPrioriteLabel(recommendation.priorite, recommendation.categorie);
    const tempsDisplay = getTemps(recommendation);
    const difficulteDisplay = getDifficulte(recommendation);
    const difficulteColor = getDifficulteColor(difficulteDisplay);

    // Mask sensitive content for critical recommendations (server-side criticals)
    const maskSensitive = isLocked && Boolean(recommendation._mask_sensitive || recommendation.maskSensitive || recommendation.priorite === 1 || recommendation.priority === 'CRITIQUE');

    if (maskSensitive) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.08, 0.5) }}
          className={`bg-card-bg border ${style.borderColor} rounded-2xl p-5 relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${style.badgeBg} ${style.badgeText}`}>
              {recommendation.categorie}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-red-600/10 text-red-300 border border-red-500/20">
              <AlertTriangle size={12} /> Urgent
            </span>
          </div>
          <h4 className="text-white font-semibold text-sm mb-2">Problème critique détecté</h4>
          <p className="text-text-secondary text-sm mb-3 leading-relaxed">
            La nature exacte de cette faille est masquée pour des raisons de sécurité. Elle peut impacter directement la confiance ou les revenus de votre site. Débloquez le rapport complet pour obtenir la liste détaillée et le plan de correction priorisé.
          </p>
          <div className="mt-3">
            <button className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold">Obtenir le rapport complet</button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.08, 0.5) }}
        className={`bg-card-bg border ${style.borderColor} rounded-2xl p-5 relative overflow-hidden`}
      >
        {isLocked && (
          <div className="absolute inset-0 bg-card-bg/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="text-center p-4">
              <Lock size={24} className="text-white mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Audit premium</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${style.badgeBg} ${style.badgeText}`}>
              {recommendation.categorie}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${priorityToneClasses(prioriteLabel.tone)}`}>
              {prioriteLabel.text}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400/80 bg-cyan-400/8 border border-cyan-400/15 px-2 py-1 rounded-lg flex-shrink-0 whitespace-nowrap">
            <Clock size={11} /> {tempsDisplay}
          </span>
        </div>

        {/* Action (titre de la recommandation) */}
        <h4 className="text-white font-semibold text-sm mb-2 leading-snug">
          {recommendation.action}
        </h4>

        {/* Explication (texte simple pour le client) */}
        {recommendation.explication && (
          <p className="text-text-secondary text-sm mb-3 leading-relaxed">
            {recommendation.explication}
          </p>
        )}

        {/* Impact */}
        {recommendation.impact && (
          <div className={`${style.badgeBg} border ${style.borderColor} rounded-lg px-3 py-2 mb-2`}>
            <p className={`${style.badgeText} text-xs font-medium`}>
              Impact : {recommendation.impact}
            </p>
          </div>
        )}

        {/* Difficulté */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <Wrench size={12} className="text-white/30" />
          <DifficultyBadge label={difficulteDisplay} />
          <span className="text-white/40 text-xs ml-1">— {difficulteDisplay.replace(/^[^—]+—\s*/, '')}</span>
        </div>
      </motion.div>
    );
  }

  // ── Ancien format (compat) ────────────────────────────────────────────────
  const config = getPriorityConfig(recommendation.priority, recommendation.categorie);
  const tempsOld = getTemps(recommendation);
  const difficulteOld = getDifficulte(recommendation);
  const difficulteOldColor = getDifficulteColor(difficulteOld);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.08, 0.5) }}
      className={`bg-card-bg border ${config.borderColor} rounded-2xl p-5 relative overflow-hidden`}
    >
      {isLocked && (
        <div className="absolute inset-0 bg-card-bg/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <div className="text-center p-4">
            <Lock size={24} className="text-white mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Audit premium</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${config.badgeBg} ${config.badgeText}`}>
          {config.label}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400/80 bg-cyan-400/8 border border-cyan-400/15 px-2 py-1 rounded-lg whitespace-nowrap">
          <Clock size={11} /> {tempsOld}
        </span>
      </div>

      <h4 className="text-white font-semibold mb-2 text-sm">
        {recommendation.title}
      </h4>

      <p className="text-text-secondary text-sm mb-3 leading-relaxed">
        {recommendation.description || recommendation.impact}
      </p>

      {recommendation.impactBusiness && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
          <p className="inline-flex items-start gap-1.5 text-primary text-sm font-medium">
            <Sparkles size={14} className="mt-0.5 flex-shrink-0" />
            <span>{recommendation.impactBusiness}</span>
          </p>
        </div>
      )}

      {recommendation.action && (
        <div className="flex items-start gap-2 mb-2">
          <span className="text-success mt-0.5 flex-shrink-0">→</span>
          <p className="text-text-secondary text-sm">{recommendation.action}</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <Wrench size={12} className="text-white/30" />
        <DifficultyBadge label={difficulteOld} />
      </div>
    </motion.div>
  );
}