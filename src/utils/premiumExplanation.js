const DETAIL_BY_PRIORITY = {
  CRITIQUE: 'critical',
  IMPORTANT: 'important',
  AMELIORATION: 'improvement',
};

const CATEGORY_LABELS = {
  security: 'la securite',
  performance: 'la performance',
  seo: 'la visibilite SEO',
  ux: "l'experience mobile",
};

function normalizePriority(priority) {
  return DETAIL_BY_PRIORITY[priority] || 'important';
}

function normalizeCategory(category) {
  return CATEGORY_LABELS[category] || 'le site';
}

function safeTitle(recommendation) {
  if (recommendation.title) return recommendation.title;
  if (recommendation.label) return recommendation.label;
  if (recommendation.name) return recommendation.name;

  if (recommendation.action) {
    const raw = String(recommendation.action).trim();
    const shortened = raw.split(/[:(]/)[0].trim();
    if (shortened.length > 3) {
      return shortened.charAt(0).toUpperCase() + shortened.slice(1);
    }
  }

  const categoryFallbacks = {
    security: 'Securite insuffisante',
    performance: 'Performance degradee',
    seo: 'Referencement a ameliorer',
    ux: 'Experience mobile defaillante',
  };
  return categoryFallbacks[recommendation.category] || 'Point a corriger';
}

function lowerFirst(text = '') {
  if (!text) return '';
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function ensureSentence(text = '') {
  const clean = String(text ?? '').trim();
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

  const base =
    'Votre audit premium met en evidence une vue complete des freins techniques, business et de confiance qui affectent actuellement votre site. Les anomalies detectees ne se limitent pas a quelques reglages isoles : elles peuvent ralentir votre acquisition, degrader votre credibilite et fragiliser vos conversions si elles ne sont pas traitees dans le bon ordre.';

  const suffix = "La priorite est de corriger les risques les plus sensibles avant d'optimiser le reste de maniere structuree.";

  if (criticalCount === 0 && importantCount === 0) {
    return `${base} ${suffix}`;
  }

  return `${base} Avec ${criticalCount} point(s) critique(s) et ${importantCount} point(s) important(s), ${lowerFirst(suffix)}`;
}

function buildCriticalParagraph(index, recommendation) {
  return `${index}. ${safeTitle(recommendation)}\nCe point critique doit etre traite avant les optimisations secondaires. ${ensureSentence(
    recommendation.description
  )} La consequence la plus directe est la suivante : ${ensureSentence(
    recommendation.impact
  )} Tant que cette faille reste ouverte, elle peut provoquer une perte immediate de confiance, exposer votre activite a un incident visible pour vos visiteurs et creer un impact negatif sur vos demandes, vos ventes ou votre image. La correction recommandee consiste a ${lowerFirst(
    ensureActionSentence(recommendation.action)
  )} Ce correctif doit etre traite en priorite, car il reduit rapidement le risque et protege directement vos revenus, votre credibilite et votre marque.`;
}

function buildImportantParagraph(index, recommendation) {
  return `${index}. ${safeTitle(recommendation)}\nCe probleme important merite une correction rapide, meme s'il ne bloque pas tout le site. ${ensureSentence(
    recommendation.description
  )} La consequence concrete est la suivante : ${ensureSentence(
    recommendation.impact
  )} Meme si ce point n'est pas au niveau d'une urgence critique, il peut ralentir le parcours utilisateur, affaiblir votre visibilite commerciale ou reduire la confiance accordee a votre site. La bonne approche est la suivante : ${ensureSentence(
    recommendation.action
  )} Cette correction permet de traiter ce frein avant qu'il ne se transforme en manque a gagner plus couteux.`;
}

function buildImprovementParagraph(index, recommendation) {
  return `${index}. ${safeTitle(recommendation)}\nCette amelioration utile consolide la qualite generale du site. ${ensureSentence(
    recommendation.description
  )} Ce point n'est pas le plus urgent, mais il limite malgre tout votre potentiel, car ${ensureSentence(
    recommendation.impact
  )} Une mise a niveau coherente peut etre menee ainsi : ${ensureSentence(
    recommendation.action
  )} Cette amelioration aidera votre site a gagner en clarte, en efficacite et en performance globale.`;
}

function buildActionPlan(recommendations) {
  const categories = [...new Set(recommendations.map((item) => normalizeCategory(item.category)))];
  const categoryText = categories.length > 0 ? categories.join(', ') : 'les points techniques identifies';

  return `Plan d'action global : respectez cet ordre de correction en commencant par securiser les failles critiques, puis corrigez les problemes importants qui penalisent la performance, la visibilite et l'experience utilisateur, avant de finaliser les ameliorations de fond sur ${categoryText}. Cette logique permet d'eviter de corriger un detail pendant qu'un risque plus grave continue de nuire a votre site. Faire ces corrections vous-meme sans methodologie claire peut creer des erreurs de configuration, casser certaines pages, degrader le referencement ou rouvrir une faille sans le vouloir. Webisafe peut prendre en charge l'ensemble de la correction, prioriser les interventions, securiser chaque mise a jour et vous livrer un resultat fiable sans exposition inutile pour votre activite.`;
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
