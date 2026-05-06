export const DEFAULT_PACK_IMPROVEMENTS = {
  rapide: [
    'Meta tags et Open Graph essentiels',
    'Compression images basique',
    'Sitemap XML et signaux SEO simples',
  ],
  standard: [
    'Corrections de sécurité prioritaires',
    'Optimisation performance : cache, compression et poids de page',
    'SEO technique : indexation, canonical et balisage structuré',
    'Améliorations UX mobile détectées',
  ],
  complet: [
    'Optimisation complète des points détectés par le scan',
    'Refonte ciblée mobile et responsive si nécessaire',
    'Durcissement sécurité avancé et monitoring Webisafe Protect',
    'Audit post-correction avec rapport PDF et rescan',
  ],
};

function getRecommendationText(recommendation) {
  if (!recommendation || typeof recommendation !== 'object') return null;
  const text = recommendation.action || recommendation.title || recommendation.titre || recommendation.description || recommendation.resume;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}

function getPriorityScore(recommendation) {
  const priority = String(recommendation?.priority || recommendation?.priorite || recommendation?.severity || '').toLowerCase();
  if (priority.includes('crit') || priority.includes('urgent')) return 0;
  if (priority.includes('haut') || priority.includes('high')) return 1;
  if (priority.includes('moy') || priority.includes('medium')) return 2;
  if (priority.includes('bas') || priority.includes('low')) return 3;
  return 2;
}

function normalizeRecommendations(recommendations) {
  const seen = new Set();
  return (Array.isArray(recommendations) ? recommendations : [])
    .map((recommendation, index) => ({
      text: getRecommendationText(recommendation),
      priorityScore: getPriorityScore(recommendation),
      index,
    }))
    .filter((item) => {
      if (!item.text) return false;
      const key = item.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.priorityScore - b.priorityScore || a.index - b.index)
    .map((item) => item.text);
}

export function buildPackImprovements(recommendations) {
  const detected = normalizeRecommendations(recommendations);

  if (detected.length === 0) {
    return DEFAULT_PACK_IMPROVEMENTS;
  }

  return {
    rapide: detected.slice(0, 3),
    standard: detected.slice(0, 6),
    complet: detected,
  };
}
