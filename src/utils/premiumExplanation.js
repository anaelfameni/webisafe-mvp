const DETAIL_BY_PRIORITY = {
  CRITIQUE: 'critical',
  IMPORTANT: 'important',
  AMELIORATION: 'improvement',
};

const CATEGORY_LABELS = {
  security: 'la sécurité',
  performance: 'la performance',
  seo: 'la visibilité SEO',
  ux: "l'expérience mobile",
};

function normalizePriority(priority) {
  return DETAIL_BY_PRIORITY[priority] || 'important';
}

function normalizeCategory(category) {
  return CATEGORY_LABELS[category] || 'le site';
}

function lowerFirst(text = '') {
  if (!text) return '';
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function ensureSentence(text = '') {
  const clean = String(text).trim();
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function ensureActionSentence(text = '') {
  const sentence = ensureSentence(text);
  if (!sentence) return '';
  return sentence.charAt(0).toLowerCase() + sentence.slice(1);
}

function buildIntroduction(recommendations) {
  const criticalCount = recommendations.filter((item) => item.priority === 'CRITIQUE').length;
  const importantCount = recommendations.filter((item) => item.priority === 'IMPORTANT').length;

  return `Votre audit premium met en évidence une vue complète des freins techniques, business et de confiance qui affectent actuellement votre site. Les anomalies détectées ne se limitent pas à quelques réglages isolés : elles peuvent ralentir votre acquisition, dégrader votre crédibilité et fragiliser vos conversions si elles ne sont pas traitées dans le bon ordre. Avec ${criticalCount} point(s) critique(s) et ${importantCount} point(s) important(s), la priorité est de corriger les risques les plus sensibles avant d'optimiser le reste de manière structurée.`;
}

function buildCriticalParagraph(index, recommendation) {
  return `${index}. ${recommendation.title} est un point critique sur ${normalizeCategory(
    recommendation.category
  )}. ${ensureSentence(recommendation.description)} La conséquence la plus directe est la suivante : ${ensureSentence(
    recommendation.impact
  )} Tant que cette faille reste ouverte, elle peut provoquer une perte immédiate de confiance, exposer votre activité à un incident visible pour vos visiteurs et créer un impact négatif sur vos demandes, vos ventes ou votre image. La correction recommandée consiste à ${lowerFirst(
    ensureActionSentence(recommendation.action)
  )} Ce correctif doit être traité en priorité, car il réduit rapidement le risque et protège directement vos revenus, votre crédibilité et votre marque.`;
}

function buildImportantParagraph(index, recommendation) {
  return `${index}. ${recommendation.title} constitue un problème important sur ${normalizeCategory(
    recommendation.category
  )}. ${ensureSentence(recommendation.description)} La conséquence concrète est la suivante : ${ensureSentence(
    recommendation.impact
  )} Même si ce point n'est pas au niveau d'une urgence critique, il peut ralentir le parcours utilisateur, affaiblir votre visibilité commerciale ou réduire la confiance accordée à votre site. La bonne approche est la suivante : ${ensureSentence(
    recommendation.action
  )} Cette correction permet de traiter ce frein avant qu'il ne se transforme en manque à gagner plus coûteux.`;
}

function buildImprovementParagraph(index, recommendation) {
  return `${index}. ${recommendation.title} correspond à une amélioration utile pour renforcer ${normalizeCategory(
    recommendation.category
  )}. ${ensureSentence(recommendation.description)} Ce point n'est pas le plus urgent, mais il limite malgré tout votre potentiel, car ${ensureSentence(
    recommendation.impact
  )} Une mise à niveau cohérente peut être menée ainsi : ${ensureSentence(
    recommendation.action
  )} Cette amélioration aidera votre site à gagner en clarté, en efficacité et en performance globale.`;
}

function buildActionPlan(recommendations) {
  const categories = [...new Set(recommendations.map((item) => normalizeCategory(item.category)))];
  const categoryText = categories.length > 0 ? categories.join(', ') : 'les points techniques identifiés';

  return `Plan d'action global : commencez par sécuriser les failles critiques, puis corrigez les problèmes importants qui pénalisent la performance, la visibilité et l'expérience utilisateur, avant de finaliser les améliorations de fond sur ${categoryText}. Cette logique permet d'éviter de corriger un détail pendant qu'un risque plus grave continue de nuire à votre site. Faire ces corrections vous-même sans méthodologie claire peut créer des erreurs de configuration, casser certaines pages, dégrader le référencement ou rouvrir une faille sans le vouloir. Webisafe peut prendre en charge l'ensemble de la correction, prioriser les interventions, sécuriser chaque mise à jour et vous livrer un résultat fiable sans exposition inutile pour votre activité.`;
}

export function buildPremiumExplanationParagraphs(recommendations = []) {
  const normalizedRecommendations = recommendations.filter(Boolean);
  const paragraphs = [buildIntroduction(normalizedRecommendations)];

  normalizedRecommendations.forEach((recommendation, index) => {
    const normalized = normalizePriority(recommendation.priority);
    const number = index + 1;

    if (normalized === 'critical') {
      paragraphs.push(buildCriticalParagraph(number, recommendation));
      return;
    }

    if (normalized === 'improvement') {
      paragraphs.push(buildImprovementParagraph(number, recommendation));
      return;
    }

    paragraphs.push(buildImportantParagraph(number, recommendation));
  });

  paragraphs.push(buildActionPlan(normalizedRecommendations));

  return paragraphs;
}
