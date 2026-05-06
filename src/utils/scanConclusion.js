function scoreValue(scores, key) {
  const value = Number(scores?.[key]);
  return Number.isFinite(value) ? Math.round(value) : null;
}

function countPriority(recommendations = [], priority) {
  return recommendations.filter((item) => String(item?.priority || '').toUpperCase() === priority).length;
}

function formatScores(scores = {}) {
  const parts = [
    ['performance', scoreValue(scores, 'performance')],
    ['securite', scoreValue(scores, 'security')],
    ['SEO', scoreValue(scores, 'seo')],
    ['UX', scoreValue(scores, 'ux')],
  ];

  return parts
    .map(([label, value]) => (value === null ? label : `${label} ${value}/100`))
    .join(', ');
}

export function buildScanConclusion(scan = {}) {
  const scoresText = formatScores(scan.scores || {});
  const criticalCount = countPriority(scan.recommendations || [], 'CRITIQUE');
  const highCount = countPriority(scan.recommendations || [], 'HAUTE') + countPriority(scan.recommendations || [], 'IMPORTANT');
  const hasMajorRisk = criticalCount > 0 || Math.min(
    scoreValue(scan.scores, 'performance') ?? 100,
    scoreValue(scan.scores, 'security') ?? 100,
    scoreValue(scan.scores, 'seo') ?? 100,
    scoreValue(scan.scores, 'ux') ?? 100
  ) < 60;

  const opening = hasMajorRisk
    ? `Votre scan gratuit met en evidence des fragilites prioritaires : ${scoresText}; ces signaux peuvent ralentir l'acquisition, reduire la confiance et couter du trafic, des conversions et des revenus.`
    : `Votre scan gratuit montre une base exploitable avec encore des axes de progression : ${scoresText}; ces points de fragilite peuvent limiter la confiance, la visibilite et les conversions si aucune optimisation n'est planifiee.`;

  const diagnosis = hasMajorRisk
    ? `Les performances, la securite et l'experience utilisateur doivent etre traitees dans le bon ordre, surtout avec ${criticalCount} alerte(s) critique(s) et ${highCount} point(s) prioritaire(s) identifies.`
    : `La marge de progression se situe surtout dans la consolidation technique, la lisibilite SEO et la prevention des irritants qui peuvent freiner une partie des visiteurs.`;

  const nextStep = `Cette analyse gratuite permet d'identifier les grandes zones de risque, mais le rapport complet donne la priorisation detaillee, les causes probables et les corrections concretes a appliquer pour proteger votre image et vos resultats.`;

  return [opening, diagnosis, nextStep].join('\n\n');
}
