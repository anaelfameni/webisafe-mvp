const LABELS = {
  performance: 'performance',
  security: 'sécurité',
  seo: 'visibilité SEO',
  ux: 'expérience mobile',
};

function toNumber(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function getWeakAreas(scores = {}) {
  return Object.entries(LABELS)
    .map(([key, label]) => ({ key, label, score: toNumber(scores[key]) ?? 0 }))
    .sort((a, b) => a.score - b.score);
}

function joinLabels(labels) {
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} et ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} et ${labels.at(-1)}`;
}

export function buildScanConclusion(scanData = {}) {
  const weakAreas = getWeakAreas(scanData.scores);
  const mainAreas = weakAreas.slice(0, 2).map((item) => item.label);
  const weakAverage = weakAreas.slice(0, 2).reduce((sum, item) => sum + item.score, 0) / 2;
  const criticalCount = (scanData.recommendations ?? []).filter(
    (item) => item.priority === 'CRITIQUE'
  ).length;
  const loadTime = toNumber(scanData.performance?.loadTime);

  const hasSecurityRisk =
    scanData.security?.https === false ||
    scanData.security?.sslValid === false ||
    scanData.security?.hsts === false ||
    scanData.security?.csp === false;
  const hasSeoRisk =
    (scanData.seo?.altMissing ?? 0) > 0 ||
    scanData.seo?.sitemapOk === false ||
    scanData.seo?.robotsTxtOk === false;
  const hasUxRisk =
    scanData.ux?.responsive === false ||
    scanData.ux?.tapTargets === false ||
    scanData.ux?.textReadable === false;

  const paragraphOne =
    weakAverage < 55
      ? `Ce premier scan met en évidence des fragilités claires sur la ${joinLabels(mainAreas)}, ce qui montre que le site perd déjà en efficacité là où il devrait rassurer, convaincre et convertir.`
      : `Ce premier scan révèle plusieurs axes de progression, surtout sur la ${joinLabels(mainAreas)}, qui limitent encore le plein potentiel commercial du site malgré une base exploitable.`;

  const impacts = [];
  if (loadTime !== null && loadTime >= 3) impacts.push(`ralentir l'acquisition et faire chuter les conversions`);
  if (hasSeoRisk) impacts.push(`réduire la visibilité organique et le trafic qualifié`);
  if (hasSecurityRisk) impacts.push(`affaiblir la confiance et exposer la crédibilité du site`);
  if (hasUxRisk) impacts.push(`faire perdre des prospects sur mobile`);

  const paragraphTwo =
    impacts.length > 0
      ? `À ce niveau, ces signaux peuvent déjà ${joinLabels(impacts.slice(0, 3))}. Leur impact ne se limite donc pas à la technique : il touche aussi la crédibilité, les revenus potentiels et la capacité du site à transformer chaque visite en opportunité réelle.`
      : `Même sans alerte critique apparente, ces écarts peuvent déjà freiner la croissance, la conversion et la perception de fiabilité. Leur impact ne se limite donc pas à la technique : il touche aussi la crédibilité, les revenus potentiels et la capacité du site à transformer chaque visite en opportunité réelle.`;

  const limitationLead =
    criticalCount > 0
      ? `Le scan gratuit confirme déjà ${criticalCount} point${criticalCount > 1 ? 's' : ''} critique${criticalCount > 1 ? 's' : ''}, mais il ne montre qu'une partie des causes réelles derrière ces résultats.`
      : `Le scan gratuit donne une première lecture utile, mais il ne montre qu'une partie des causes réelles derrière ces résultats.`;

  const paragraphThree =
    `${limitationLead} Les problèmes les plus coûteux sont souvent plus profonds que les symptômes visibles ici et peuvent continuer à peser sur vos revenus, votre image et la sécurité de vos visiteurs. Le rapport complet permet d'identifier précisément ces blocages prioritaires avant qu'ils ne se transforment en pertes de trafic, d'opportunités ou de chiffre d'affaires.`;

  return [paragraphOne, paragraphTwo, paragraphThree].join('\n\n');
}
