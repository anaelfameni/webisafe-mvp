const SCORE_LIMITS = { critical: 40, warning: 65, good: 85 };

const rawText = (value) => (value === null || value === undefined ? '' : String(value));

export function sanitizePdfText(value = '') {
  return rawText(value)
    .normalize('NFC')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\p{L}\p{N}\s.,;:!?'")(\[\]{}%+\-\/@#&$°_=<>|\\]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const pdfText = (value, fallback = '—') => sanitizePdfText(value) || fallback;
export const compact = (values) => values.filter(Boolean);
export const firstDefined = (...values) => values.find((value) => value !== null && value !== undefined && value !== '');
export const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

function asUrl(value) {
  const current = rawText(value).trim();
  if (!current) return '';
  return /^https?:\/\//i.test(current) ? current : `https://${current}`;
}

function extractDomain(value) {
  const current = rawText(value).trim();
  if (!current) return 'site';
  try {
    return new URL(asUrl(current)).hostname.replace(/^www\./i, '') || 'site';
  } catch {
    return current.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0] || 'site';
  }
}

function safeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function formatPdfDate(value) {
  return safeDate(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatPdfTime(value) {
  return safeDate(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatPdfDateTime(value) {
  return `${formatPdfDate(value)} à ${formatPdfTime(value)}`;
}

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = rawText(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function scoreValue(value) {
  const parsed = asNumber(value);
  if (parsed === null) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export function scoreDisplay(value) {
  const score = scoreValue(value);
  return score === null ? 'Non mesuré' : `${score}/100`;
}

export function scoreColor(value) {
  const score = scoreValue(value);
  if (score === null) return '#64748B';
  if (score < SCORE_LIMITS.critical) return '#EF4444';
  if (score < SCORE_LIMITS.warning) return '#F97316';
  if (score < SCORE_LIMITS.good) return '#22C55E';
  return '#1566F0';
}

export function scoreLabel(value) {
  const score = scoreValue(value);
  if (score === null) return 'Non mesuré';
  if (score < SCORE_LIMITS.critical) return 'Critique';
  if (score < SCORE_LIMITS.warning) return 'À corriger';
  if (score < SCORE_LIMITS.good) return 'Bon';
  return 'Excellent';
}

function scoreStatus(value) {
  const score = scoreValue(value);
  if (score === null) return 'Non mesuré';
  if (score < SCORE_LIMITS.critical) return 'Critique';
  if (score < SCORE_LIMITS.warning) return 'Avertissement';
  return 'OK';
}

export function normalizeStatus(value) {
  const current = sanitizePdfText(value).toLowerCase();
  if (!current || current.includes('non mesur') || current.includes('non exécut') || current.includes('indisponible')) return 'Non mesuré';
  if (current.includes('not_run') || current.includes('not run') || current.includes('skipped') || current.includes('bloqu') || current.includes('blocked')) return 'Non mesuré';
  if (current.includes('error') || current.includes('timeout') || current.includes('aborted')) return 'Non mesuré';
  if (['ok', 'pass', 'passed', 'success', 'présent', 'present', 'activé', 'active', 'complet', 'low'].includes(current)) return 'OK';
  if (current.includes('critique') || current.includes('critical') || current.includes('fail') || current.includes('échec') || current.includes('echec')) return 'Critique';
  if (current.includes('warn') || current.includes('avert') || current.includes('medium') || current.includes('moyen') || current.includes('partiel') || current.includes('absent') || current.includes('missing')) return 'À corriger';
  return pdfText(value);
}

function yesNo(value, yes = 'Oui', no = 'Non') {
  if (value === true) return yes;
  if (value === false) return no;
  return 'Non mesuré';
}

function boolStatus(value, falseStatus = 'Critique') {
  if (value === true) return 'OK';
  if (value === false) return falseStatus;
  return 'Non mesuré';
}

function formatMs(value) {
  const parsed = asNumber(value);
  return parsed === null ? 'Non mesuré' : `${Math.round(parsed)} ms`;
}

function formatDecimal(value) {
  const parsed = asNumber(value);
  if (parsed === null) return 'Non mesuré';
  return parsed.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function formatMb(value) {
  const parsed = asNumber(value);
  return parsed === null ? 'Non mesuré' : `${parsed.toFixed(parsed >= 10 ? 0 : 1)} MB`;
}

function timingStatus(name, value) {
  const parsed = asNumber(value);
  if (parsed === null) return 'Non mesuré';
  if (name === 'lcp') return parsed <= 2500 ? 'OK' : parsed <= 4000 ? 'Avertissement' : 'Critique';
  if (name === 'fcp') return parsed <= 1800 ? 'OK' : parsed <= 3000 ? 'Avertissement' : 'Critique';
  if (name === 'cls') return parsed <= 0.1 ? 'OK' : parsed <= 0.25 ? 'Avertissement' : 'Critique';
  if (name === 'tbt') return parsed <= 200 ? 'OK' : parsed <= 600 ? 'Avertissement' : 'Critique';
  if (name === 'tti') return parsed <= 3800 ? 'OK' : parsed <= 7300 ? 'Avertissement' : 'Critique';
  if (name === 'weight') return parsed <= 2 ? 'OK' : parsed <= 4 ? 'Avertissement' : 'Critique';
  return 'Non mesuré';
}

function metric(label, value, status, note = '') {
  return { label: pdfText(label, ''), value: pdfText(value, 'Non mesuré'), status: normalizeStatus(status), note: pdfText(note, '') };
}

function row(label, value, status = '') {
  return [pdfText(label), pdfText(value), status ? normalizeStatus(status) : ''];
}

function normalizeOpportunity(item) {
  if (typeof item === 'string') return { title: pdfText(item), description: '', savings: '' };
  return {
    title: pdfText(firstDefined(item?.title, item?.name, 'Optimisation recommandée')),
    description: pdfText(firstDefined(item?.description, item?.detail, item?.message, ''), ''),
    savings: item?.savings_ms !== undefined ? `${Math.round(Number(item.savings_ms))} ms` : pdfText(firstDefined(item?.savings, item?.impact, ''), ''),
  };
}

function headerSeverity(header, fallback) {
  if (fallback !== null && fallback !== undefined && fallback !== '') return normalizeStatus(fallback);
  const current = rawText(header).toLowerCase();
  if (current.includes('hsts') || current.includes('strict-transport') || current.includes('csp') || current.includes('content-security-policy')) return 'Critique';
  return 'À corriger';
}

function normalizeHeader(item) {
  if (typeof item === 'string') return { header: pdfText(item), message: '', severity: headerSeverity(item) };
  const header = pdfText(firstDefined(item?.header, item?.name, item?.label, 'Header'));
  return {
    header,
    message: pdfText(firstDefined(item?.message, item?.description, item?.recommendation, `${header} manquant`), ''),
    severity: headerSeverity(header, firstDefined(item?.severity, item?.status)),
  };
}

function normalizeIssue(item) {
  if (typeof item === 'string') return { type: 'issue', message: pdfText(item), impact: '', severity: 'À corriger' };
  return {
    type: pdfText(firstDefined(item?.type, item?.check_name, 'issue')),
    message: pdfText(firstDefined(item?.message, item?.title, item?.description, 'Problème détecté')),
    impact: pdfText(firstDefined(item?.impact, item?.impactBusiness, item?.business_impact, ''), ''),
    severity: normalizeStatus(firstDefined(item?.severity, item?.status, 'Avertissement')),
  };
}

function normalizeCheckStatus(key, value) {
  const normalized = normalizeStatus(value);
  const current = rawText(key).toLowerCase();
  if (current.includes('security_txt') && normalized === 'Critique') return 'À corriger';
  if (current.includes('sitemap') && normalized === 'Critique') return 'À corriger';
  return normalized;
}

function frenchJoin(items) {
  const values = asArray(items).map((item) => pdfText(item, '')).filter(Boolean);
  if (values.length <= 1) return values[0] || '';
  return `${values.slice(0, -1).join(', ')} et ${values[values.length - 1]}`;
}

function humanizeCheckDetail(key, detail, data = {}) {
  const current = pdfText(detail, '');
  const normalized = current.toLowerCase();
  if (normalized.includes('operation was aborted') || normalized.includes('aborted due to timeout') || normalized.includes('timeout')) {
    return 'Contrôle indisponible pendant le scan. Relancer un rescan permettra de confirmer ce signal.';
  }
  if (rawText(key).includes('email_advanced') && (normalized.match(/\bspf\s*=\s*0\b/) || normalized.match(/\bdmarc\s*=\s*0\b/) || normalized.match(/\bdkim\s*=\s*0\b/) || asArray(data?.missing).length)) {
    const missing = frenchJoin(asArray(data?.missing).length ? data.missing : ['SPF', 'DMARC', 'DKIM']);
    return `${missing} absents ou non confirmés pendant le scan.`;
  }
  return current;
}

function humanizeCheckName(name, status, detail) {
  const current = pdfText(name, '');
  const normalizedName = current.toLowerCase();
  const normalizedDetail = rawText(detail).toLowerCase();
  if (status === 'Non mesuré' && (normalizedName.includes('indisponible') || normalizedDetail.includes('indisponible') || normalizedDetail.includes('rescan'))) {
    return 'Contrôle indisponible pendant le scan';
  }
  return current;
}

function normalizeCheck(item) {
  const key = pdfText(firstDefined(item?.check_name, item?.key, item?.id, item?.name, 'check')).toLowerCase();
  const status = normalizeCheckStatus(key, firstDefined(item?.status, item?.result, 'Non mesuré'));
  const detail = humanizeCheckDetail(key, firstDefined(item?.description, item?.technical_detail, item?.message, item?.recommendation, ''), item?.data);
  return {
    key,
    name: humanizeCheckName(firstDefined(item?.title, item?.label, item?.name, key), status, detail),
    status,
    detail,
    data: item?.data && typeof item.data === 'object' ? item.data : {},
  };
}

function valueFromCheck(check, fallback = 'Non mesuré') {
  if (!check || typeof check !== 'object') return fallback;
  return pdfText(firstDefined(check.value, check.message, check.label, check.title, fallback));
}

function rowFromCheck(label, check, fallback = 'Non mesuré') {
  return row(label, valueFromCheck(check, fallback), firstDefined(check?.status, 'Non mesuré'));
}

function normalizeAiVisibility(value) {
  const checks = asArray(value?.checks).map((item) => ({
    key: pdfText(firstDefined(item?.key, item?.label, 'signal')),
    label: pdfText(firstDefined(item?.label, item?.key, 'Signal IA')),
    status: normalizeStatus(firstDefined(item?.status, 'Non mesuré')),
    evidence: pdfText(firstDefined(item?.evidence, item?.message, item?.value, 'Signal non documenté')),
    impact: pdfText(firstDefined(item?.business_impact, item?.impact, 'Impact business à confirmer')),
    recommendation: pdfText(firstDefined(item?.recommendation, item?.correction, 'Renforcer ce signal puis relancer un scan.')),
  }));
  return {
    score: scoreValue(value?.score),
    status: checks.some((item) => item.status === 'Critique' || item.status === 'À corriger') ? 'À corriger' : checks.length ? 'OK' : 'Non mesuré',
    checks,
  };
}

function normalizeSeoBusinessRecommendation(item, index) {
  return {
    problem: pdfText(firstDefined(item?.problem, item?.title, item?.action, `Recommandation SEO ${index + 1}`)),
    impact: pdfText(firstDefined(item?.impact_business, item?.impactBusiness, item?.impact, 'Impact business à confirmer')),
    correction: pdfText(firstDefined(item?.correction, item?.recommendation, item?.action, 'Corriger le signal puis relancer un scan.')),
    effort: pdfText(firstDefined(item?.effort, item?.difficulty, item?.difficulty_label, 'Intermédiaire')),
    priority: pdfText(firstDefined(item?.priority, item?.priorite, 'P2')),
  };
}

function normalizeComplianceBadge(item) {
  return {
    key: pdfText(firstDefined(item?.key, item?.label, 'badge')),
    label: pdfText(firstDefined(item?.label, item?.key, 'Préparation conformité')),
    status: normalizeStatus(firstDefined(item?.status, 'Non mesuré')),
    explanation: pdfText(firstDefined(item?.explanation, item?.description, item?.message, ''), ''),
    missingSignals: asArray(firstDefined(item?.missing_signals, item?.missingSignals, [])).map((value) => pdfText(value)),
  };
}

function priorityRank(value) {
  const current = rawText(value).toLowerCase();
  const parsed = asNumber(value);
  if (parsed !== null) return parsed <= 2 ? 1 : parsed === 3 ? 2 : 3;
  if (current.includes('urgent') || current.includes('critique') || current.includes('critical') || current.includes('high')) return 1;
  if (current.includes('important') || current.includes('medium') || current.includes('moyen')) return 2;
  return 3;
}

function priorityLabel(rank) {
  if (rank === 1) return 'Urgente';
  if (rank === 2) return 'Importante';
  return 'Amélioration';
}

function normalizeRecommendation(item, index) {
  const rank = priorityRank(firstDefined(item?.priority, item?.priorite, item?.severity, item?.niveau, 3));
  const title = pdfText(firstDefined(item?.title, item?.action, item?.message, `Action ${index + 1}`));
  return {
    title,
    action: pdfText(firstDefined(item?.action, item?.recommendation, item?.correction, title)),
    description: pdfText(firstDefined(item?.description, item?.message, item?.explication, ''), ''),
    impact: pdfText(firstDefined(item?.impact, item?.impactBusiness, item?.business_impact, ''), ''),
    impactBusiness: pdfText(firstDefined(item?.impactBusiness, item?.business_impact, item?.impact_business, item?.impact, ''), ''),
    category: pdfText(firstDefined(item?.category, item?.categorie, 'Général')),
    difficulty: pdfText(firstDefined(item?.difficulty, item?.difficulte, item?.difficulty_label, ''), ''),
    time: pdfText(firstDefined(item?.time, item?.duration, item?.time_estimate, ''), ''),
    rank,
    priority: priorityLabel(rank),
  };
}

function generateExpertRecommendations(reportData) {
  const extras = [];
  const perf = reportData.metrics?.performance || {};
  const sec = reportData.metrics?.security || {};
  if (!perf || perf.partial === true || (perf.page_weight_mb && perf.page_weight_mb > 2) || (perf.lcp && perf.lcp > 2500)) {
    extras.push({ priorite: 3, categorie: 'Performance', action: 'Valider les Core Web Vitals mobiles', explication: 'Relancer une mesure complète et isoler les pages qui ralentissent le parcours mobile.', impact: 'Mesure plus fiable et priorisation claire des gains de conversion', difficulty: 'Intermédiaire', time: '1-2 jours' });
    extras.push({ priorite: 4, categorie: 'Performance', action: 'Activer le cache navigateur et un CDN proche des visiteurs', explication: 'Configurer Cache-Control et rapprocher les ressources statiques de la zone cible.', impact: 'Navigation plus rapide pour les visiteurs récurrents', difficulty: 'Intermédiaire', time: '1 jour' });
  }
  extras.push({ priorite: 4, categorie: 'Architecture', action: 'Minifier le JavaScript non critique', explication: 'Réduire et charger de façon asynchrone les scripts non essentiels au rendu initial.', impact: 'Meilleure réactivité et baisse des abandons', difficulty: 'Technique', time: '2-4 heures' });
  if (!sec?.https && sec?.https !== undefined) {
    extras.push({ priorite: 1, categorie: 'Sécurité', action: 'Forcer HTTPS et HSTS', explication: 'Mettre en place une redirection HTTPS et activer HSTS pour protéger les visiteurs.', impact: 'Sécurisation des échanges et confiance accrue', difficulty: 'Intermédiaire', time: '1-2 heures' });
  }
  return extras;
}

function uniqueRecommendations(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title}|${item.action}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDetectedImprovements(performance, seo, ux, recommendations) {
  const values = [
    ...recommendations
      .filter((item) => item.rank >= 3)
      .map((item) => ({ title: item.title, detail: item.description || item.action, impact: item.impactBusiness || item.impact || item.category })),
    ...performance.opportunities.map((item) => ({ title: item.title, detail: item.description, impact: item.savings })),
    ...seo.extraRows
      .filter((item) => item[2] && item[2] !== 'OK')
      .map((item) => ({ title: item[0], detail: item[1], impact: item[2] })),
    ...ux.issues.map((item) => ({ title: item.message, detail: item.impact || item.type, impact: item.severity })),
  ].map((item) => ({
    title: pdfText(item.title, ''),
    detail: pdfText(item.detail, ''),
    impact: pdfText(item.impact, ''),
  })).filter((item) => item.title);
  const seen = new Set();
  return values.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildPerformance(reportData, scores) {
  const perf = reportData.metrics?.performance || {};
  const server = perf.server_location || {};
  const latency = server.latency_warning || {};
  const isPartial = perf.partial === true;
  const status = severityFromScore(scores.performance);
  return {
    score: scores.performance,
    status,
    diagnostic: isPartial
      ? 'Le score performance doit être traité avec prudence car les Core Web Vitals n’ont pas tous été mesurés pendant le scan.'
      : 'La performance mesurée indique la vitesse perçue, la stabilité et la capacité du site à convertir sur mobile.',
    metrics: [
      metric('Score performance', scoreDisplay(scores.performance), status, 'Qualité de chargement ressentie par vos visiteurs.'),
      metric('LCP', formatMs(perf.lcp), timingStatus('lcp', perf.lcp), 'Affichage du contenu principal.'),
      metric('FCP', formatMs(perf.fcp), timingStatus('fcp', perf.fcp), 'Première apparition visuelle.'),
      metric('CLS', formatDecimal(perf.cls), timingStatus('cls', perf.cls), 'Stabilité visuelle de la page.'),
      metric('TBT', formatMs(perf.tbt), timingStatus('tbt', perf.tbt), 'Blocage JavaScript avant interaction.'),
      metric('TTI', formatMs(perf.tti), timingStatus('tti', perf.tti), 'Temps avant interaction fiable.'),
      metric('Poids de la page', formatMb(perf.page_weight_mb), timingStatus('weight', perf.page_weight_mb), 'Volume total chargé par le navigateur.'),
      metric('Mode du scan', isPartial ? 'Partiel' : 'Complet', isPartial ? 'Avertissement' : 'OK', isPartial ? pdfText(perf.partial_reason, 'Données partielles.') : 'Scan complet.'),
    ],
    serverLocation: {
      city: pdfText(server.city, ''), country: pdfText(server.country, ''), isp: pdfText(server.isp, ''), ip: pdfText(server.ip, ''),
      message: pdfText(latency.message, ''), impact: pdfText(latency.impact, ''), recommendation: pdfText(latency.recommendation, ''),
    },
    opportunities: asArray(perf.opportunities).map(normalizeOpportunity),
    partial: isPartial,
    partialReason: pdfText(perf.partial_reason, ''),
  };
}

function buildSecurity(reportData, scores) {
  const sec = reportData.metrics?.security || {};
  const https = firstDefined(sec.https_enabled, sec.https);
  const sensitive = sec.sensitive_files || {};
  const missingHeaders = asArray(firstDefined(sec.headers_manquants, sec.missing_headers, sec.headers_missing)).map(normalizeHeader);
  const displayScore = scoreValue(scores.security);
  const criticalHeaders = missingHeaders.filter((item) => item.severity === 'Critique').length;
  const blockerStatuses = [
    ...missingHeaders.map((item) => item.severity),
    sensitive.critical === true ? 'Critique' : null,
  ].filter(Boolean);
  const status = sectionStatus(displayScore, blockerStatuses);
  return {
    score: displayScore,
    status,
    diagnostic: missingHeaders.length
      ? 'La base HTTPS est solide, mais plusieurs headers de durcissement doivent être ajoutés pour réduire les risques d’injection, de downgrade et d’abus navigateur.'
      : 'Les signaux de sécurité web visibles ne révèlent pas de défaut critique dans les données analysées.',
    metrics: [
      metric('Score sécurité', scoreDisplay(displayScore), status, criticalHeaders || sensitive.critical === true ? 'Score premium repris du scan, avec priorités de sécurité détaillées ci-dessous.' : 'Score global de sécurité technique.'),
      metric('Grade SSL', firstDefined(sec.ssl_grade, sec.security_grade, 'Non mesuré'), sec.ssl_grade === 'A' || sec.ssl_grade === 'A+' ? 'OK' : sec.ssl_grade ? 'Avertissement' : 'Non mesuré', 'Qualité TLS/SSL.'),
      metric('HTTPS', yesNo(https, 'Activé', 'Non activé'), boolStatus(https), 'Protection des échanges entre le visiteur et le site.'),
      metric('VirusTotal', sec.malware_detected === true ? 'Menace détectée' : sec.malware_detected === false ? 'Aucun malware détecté' : 'Non vérifié', sec.malware_detected === true ? 'Critique' : sec.malware_detected === false ? 'OK' : 'Non mesuré', 'Réputation malware publique.'),
    ],
    observatoryScore: scoreDisplay(sec.observatory_score),
    missingHeaders,
    cookieIssues: asArray(sec.cookie_issues).map((item) => pdfText(item)),
    sensitiveFiles: { critical: sensitive.critical === true, alert_message: pdfText(sensitive.alert_message, ''), exposed_files: asArray(sensitive.exposed_files).map((item) => pdfText(item)) },
  };
}

function buildAdvancedSecurity(reportData) {
  const sec = reportData.metrics?.security || {};
  const rawChecks = [
    ...asArray(sec.extended_checks),
    ...asArray(sec.advanced_checks),
    ...asArray(reportData.security?.extended_checks),
    ...asArray(reportData.security?.extendedChecks),
    ...asArray(reportData.security?.details),
    ...asArray(reportData.security?.advanced_checks),
    ...asArray(reportData.extended_checks),
    ...asArray(reportData.extendedChecks),
  ];
  const allChecks = rawChecks.map(normalizeCheck);
  const checks = allChecks.filter((item, index, source) => source.findIndex((candidate) => candidate.key === item.key) === index);
  const findCheck = (key) => checks.find((item) => item.key === key);
  const checkData = (key) => findCheck(key)?.data || {};
  const checkRow = (key, label) => {
    const item = findCheck(key);
    return item ? row(label, item.name, item.status) : row(label, 'Contrôle non disponible pendant ce scan', 'Non mesuré');
  };
  const email = findCheck('email_advanced');
  const httpMethods = firstDefined(sec.http_methods, checkData('http_methods'), {});
  const cspQuality = firstDefined(sec.csp_quality, checkData('csp_quality'), {});
  const dnssec = firstDefined(sec.dnssec, checkData('dnssec'), {});
  const cmsDetection = firstDefined(sec.cms_detection, checkData('tech_and_dependencies')?.cms_detection, {});
  const wordpressSecurity = firstDefined(sec.wordpress_security, checkData('wordpress_security'), {});
  const jsLibraries = firstDefined(sec.js_libraries, checkData('js_libraries'), checkData('tech_and_dependencies')?.js_libraries, {});
  const sri = firstDefined(sec.sri, checkData('sri'), checkData('tech_and_dependencies')?.sri, {});
  const complianceBadges = asArray(firstDefined(sec.compliance_badges, checkData('compliance_preparation')?.badges, [])).map(normalizeComplianceBadge);
  const computedScore = rawChecks.length > 0
    ? Math.max(0, 100 - rawChecks.filter((item) => item?.status === 'fail').reduce((sum, item) => sum + (Number(item?.score_impact) || 0), 0))
    : null;
  const baseScore = scoreValue(firstDefined(
    sec.extended_security_score,
    sec.advanced_security_score,
    reportData.security?.extended_security_score,
    reportData.security?.advanced_security_score,
    reportData.scores?.advanced_security,
    reportData.scores?.extended_security,
    computedScore,
    reportData.scores?.security
  ));
  const status = sectionStatus(baseScore, checks.map((item) => item.status));
  return {
    score: baseScore,
    status,
    diagnostic: 'Les contrôles avancés évaluent les risques moins visibles : sécurité email, CORS, WAF, sous-domaines et dépendances exposées.',
    summaryRows: [
      checkRow('waf', 'WAF'), checkRow('subdomains', 'Sous-domaines'), checkRow('security_txt', 'security.txt'),
      checkRow('cors', 'CORS'), checkRow('supply_chain', 'Supply Chain'), checkRow('email_advanced', 'Email SPF/DMARC/DKIM'),
    ],
    checks,
    email: {
      status: email?.status || 'Non mesuré',
      spf: email ? (asArray(email.data?.spf).length ? 'Présent' : 'Absent') : '',
      dmarc: email ? (asArray(email.data?.dmarc).length ? 'Présent' : 'Absent') : '',
      dkim: email ? (asArray(email.data?.dkim).length ? 'Présent' : 'Absent') : '',
      missing: asArray(email?.data?.missing).map((item) => pdfText(item)),
    },
    httpMethods: {
      status: normalizeStatus(firstDefined(httpMethods.status, findCheck('http_methods')?.status, 'Non mesuré')),
      risky: asArray(httpMethods.risky).map((item) => pdfText(firstDefined(item?.method, item))),
    },
    cspQuality: {
      score: scoreValue(cspQuality.score),
      status: normalizeStatus(firstDefined(cspQuality.status, findCheck('csp_quality')?.status, 'Non mesuré')),
      issues: asArray(cspQuality.issues).map((item) => pdfText(item)),
    },
    dnssec: {
      status: normalizeStatus(firstDefined(dnssec.status, findCheck('dnssec')?.status, 'Non mesuré')),
      detail: pdfText(firstDefined(dnssec.message, dnssec.recommendation, dnssec.ds_records_found !== undefined ? `${dnssec.ds_records_found} DS détecté(s).` : '', 'Non mesuré')),
    },
    cmsDetection: {
      primary: pdfText(firstDefined(cmsDetection.primary, cmsDetection.name, 'Non détecté')),
      detected: asArray(cmsDetection.detected).map((item) => pdfText(firstDefined(item?.name, item))),
    },
    wordpressSecurity: {
      status: normalizeStatus(firstDefined(wordpressSecurity.status, findCheck('wordpress_security')?.status, 'Non mesuré')),
      applicable: wordpressSecurity.applicable === true,
      checks: asArray(wordpressSecurity.checks).map((item) => pdfText(firstDefined(item?.label, item?.path, item?.message, item))),
    },
    jsLibraries: {
      status: normalizeStatus(firstDefined(jsLibraries.status, findCheck('js_libraries')?.status, 'Non mesuré')),
      detected: asArray(jsLibraries.detected).map((item) => pdfText(`${firstDefined(item?.name, item)}${item?.version ? ` ${item.version}` : ''}`)),
      risky: asArray(jsLibraries.outdated_or_risky).map((item) => pdfText(`${firstDefined(item?.name, item)}${item?.version ? ` ${item.version}` : ''}`)),
    },
    sri: {
      status: normalizeStatus(firstDefined(sri.status, findCheck('sri')?.status, 'Non mesuré')),
      externalScripts: asNumber(sri.external_scripts_count) ?? 0,
      missingIntegrity: asNumber(sri.missing_integrity_count) ?? 0,
    },
    complianceBadges,
  };
}

function buildSeo(reportData, scores) {
  const seo = reportData.metrics?.seo || {};
  const technical = seo.technical_checks || {};
  const advancedRows = compact([
    technical.title_length ? rowFromCheck('Longueur title', technical.title_length) : null,
    technical.meta_description_length ? rowFromCheck('Meta description', technical.meta_description_length) : null,
    technical.h1_unique ? rowFromCheck('H1 unique', technical.h1_unique) : null,
    technical.headings_structure ? row('Structure H2/H3', `H2 ${technical.headings_structure.h2_count ?? 0} · H3 ${technical.headings_structure.h3_count ?? 0}`, firstDefined(technical.headings_structure.status, 'Non mesuré')) : null,
    technical.images_alt ? row('Images avec alt', `${(technical.images_alt.total ?? 0) - (technical.images_alt.missing_count ?? 0)}/${technical.images_alt.total ?? 0}`, firstDefined(technical.images_alt.status, 'Non mesuré')) : null,
    technical.lang_attribute ? rowFromCheck('Langue HTML', technical.lang_attribute) : null,
    technical.robots_txt ? rowFromCheck('Robots.txt', technical.robots_txt) : null,
    technical.sitemap_xml ? rowFromCheck('Sitemap XML', technical.sitemap_xml) : null,
    technical.structured_data ? row('Données structurées', asArray(technical.structured_data.types).length ? asArray(technical.structured_data.types).join(', ') : valueFromCheck(technical.structured_data), firstDefined(technical.structured_data.status, 'Non mesuré')) : null,
    technical.twitter_cards ? rowFromCheck('Twitter Cards', technical.twitter_cards) : null,
    technical.favicon ? rowFromCheck('Favicon', technical.favicon) : null,
  ]);
  return {
    score: scores.seo,
    diagnostic: 'Le SEO technique évalue la capacité du site à être compris, indexé et partagé correctement par les moteurs et les réseaux sociaux.',
    metrics: [
      metric('Score SEO', scoreDisplay(scores.seo), scoreStatus(scores.seo), 'Qualité des signaux de référencement.'),
      metric('Balise Title', yesNo(seo.has_title, 'Présente', 'Absente'), boolStatus(seo.has_title), 'Titre dans Google.'),
      metric('Méta Description', yesNo(seo.has_description, 'Présente', 'Absente'), boolStatus(seo.has_description, 'Avertissement'), 'Prévisualisation Google.'),
      metric('H1', seo.h1_count !== undefined ? `${seo.h1_count}` : 'Non mesuré', seo.h1_count === 1 ? 'OK' : seo.h1_count === undefined ? 'Non mesuré' : 'Avertissement', 'Structure principale.'),
      metric('Viewport', yesNo(seo.has_viewport, 'Présent', 'Absent'), boolStatus(seo.has_viewport), 'Compatibilité mobile.'),
      metric('Open Graph', yesNo(seo.has_open_graph, 'Présent', 'Absent'), boolStatus(seo.has_open_graph, 'Avertissement'), 'Présentation lors du partage social.'),
    ],
    extraRows: compact([
      seo.has_canonical !== undefined ? row('Canonical', yesNo(seo.has_canonical, 'Présent', 'Absent'), boolStatus(seo.has_canonical, 'Avertissement')) : null,
      seo.is_indexable !== undefined ? row('Indexabilité', yesNo(seo.is_indexable, 'Indexable', 'Bloquée'), boolStatus(seo.is_indexable)) : null,
      seo.has_sitemap !== undefined ? row('Sitemap', yesNo(seo.has_sitemap, 'Présent', 'Absent'), boolStatus(seo.has_sitemap, 'Avertissement')) : null,
    ]),
    advancedRows,
    aiVisibility: normalizeAiVisibility(seo.ai_visibility),
    businessRecommendations: asArray(seo.business_recommendations).map(normalizeSeoBusinessRecommendation),
  };
}

function uxGradeStatus(value) {
  const grade = rawText(value).trim().toUpperCase();
  if (!grade) return 'Non mesuré';
  if (['A+', 'A', 'A-', 'B+', 'B'].includes(grade)) return 'OK';
  if (['B-', 'C+', 'C'].includes(grade)) return 'Avertissement';
  return 'Critique';
}

function buildUx(reportData, scores) {
  const ux = reportData.metrics?.ux || {};
  return {
    score: scores.ux,
    diagnostic: 'L’UX mobile mesure les obstacles qui réduisent la confiance avant le contact : accessibilité, confort tactile, zoom et lisibilité.',
    metrics: [
      metric('Score UX', scoreDisplay(scores.ux), scoreStatus(scores.ux), 'Confort mobile et accessibilité.'),
      metric('Grade UX', firstDefined(ux.grade, 'Non mesuré'), uxGradeStatus(ux.grade), 'Synthèse ergonomique.'),
      metric('Compression', firstDefined(ux.compression, 'Non mesurée'), ux.compression ? 'OK' : 'Non mesuré', 'Compression des ressources.'),
      metric('Images sans alt', ux.images_without_alt !== undefined ? `${ux.images_without_alt}` : 'Non mesuré', ux.images_without_alt > 0 ? 'Avertissement' : ux.images_without_alt === 0 ? 'OK' : 'Non mesuré', 'Accessibilité des images.'),
      metric('Liens sans texte', ux.links_without_text !== undefined ? `${ux.links_without_text}` : 'Non mesuré', ux.links_without_text > 0 ? 'Avertissement' : ux.links_without_text === 0 ? 'OK' : 'Non mesuré', 'Compréhension des liens.'),
      metric('Zoom bloqué', yesNo(ux.user_zoom_blocked, 'Oui', 'Non'), ux.user_zoom_blocked === true ? 'Critique' : ux.user_zoom_blocked === false ? 'OK' : 'Non mesuré', 'Agrandissement mobile.'),
    ],
    tapTargets: metric('Cibles tactiles', yesNo(ux.tap_targets_ok, 'Correctes', 'Trop proches'), boolStatus(ux.tap_targets_ok, 'Avertissement'), 'Facilité de clic au doigt.'),
    issues: asArray(ux.issues).map(normalizeIssue),
  };
}

function reportId(domain, scanDate) {
  const stamp = safeDate(scanDate).toISOString().slice(0, 10).replace(/-/g, '');
  const cleanDomain = pdfText(domain, 'SITE').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  return `WSF-${cleanDomain || 'SITE'}-${stamp}`;
}

function severityRank(value) {
  const current = normalizeStatus(value);
  if (current === 'Critique') return 1;
  if (current === 'À corriger' || current === 'Avertissement') return 2;
  if (current === 'Non mesuré') return 3;
  return 4;
}

function severityFromScore(value) {
  const status = scoreStatus(value);
  return status === 'Avertissement' ? 'À corriger' : status;
}

function sectionStatus(score, blockers = []) {
  if (blockers.some((item) => normalizeStatus(item) === 'Critique')) return 'À corriger';
  return severityFromScore(score);
}

function riskLevel(scores, topRisks) {
  const criticalCount = topRisks.filter((item) => item.severity === 'Critique').length;
  const global = scoreValue(scores.global);
  if (global !== null && global >= 80) {
    return criticalCount >= 2
      ? { label: 'Modéré', tone: 'warning', summary: 'Le score global reste bon, mais certaines corrections doivent être planifiées pour éviter une lecture trop optimiste.' }
      : { label: 'Maîtrisé', tone: 'ok', summary: 'Le site présente une base saine, avec des optimisations ciblées à maintenir.' };
  }
  if (criticalCount >= 3 || (global !== null && global < 55)) return { label: 'Élevé', tone: 'critical', summary: 'Plusieurs priorités peuvent affecter la confiance, la sécurité ou la conversion.' };
  if (criticalCount > 0 || (global !== null && global < 75)) return { label: 'Modéré', tone: 'warning', summary: 'Le site est exploitable, mais plusieurs corrections doivent être planifiées rapidement.' };
  return { label: 'Maîtrisé', tone: 'ok', summary: 'Le site présente une base saine, avec des optimisations ciblées à maintenir.' };
}

function scanConfidence(sections) {
  const allMetrics = [
    ...sections.performance.metrics,
    ...sections.security.metrics,
    ...sections.seo.metrics,
    ...sections.ux.metrics,
    sections.ux.tapTargets,
    ...sections.advancedSecurity.checks,
  ];
  const nonMeasured = allMetrics.filter((item) => item.status === 'Non mesuré').length;
  if (sections.performance.partial || nonMeasured >= 5) return { label: 'Moyenne', tone: 'warning', explanation: 'Certaines mesures sont partielles ou non disponibles. Les priorités restent exploitables, mais un rescan est recommandé après correction.' };
  if (nonMeasured > 0) return { label: 'Bonne', tone: 'ok', explanation: 'La majorité des signaux sont mesurés. Les données non disponibles sont isolées dans la méthodologie.' };
  return { label: 'Élevée', tone: 'ok', explanation: 'Les signaux principaux ont été mesurés et permettent une lecture fiable des priorités.' };
}

function addRisk(risks, risk) {
  const title = pdfText(risk.title, '');
  if (!title) return;
  const key = `${title}|${risk.category || ''}`.toLowerCase();
  if (risks.some((item) => `${item.title}|${item.category || ''}`.toLowerCase() === key)) return;
  risks.push({
    category: pdfText(risk.category, 'Général'),
    title,
    severity: normalizeStatus(risk.severity || 'À corriger'),
    evidence: pdfText(risk.evidence, 'Signal détecté pendant le scan passif.'),
    impact: pdfText(risk.impact, 'Impact potentiel sur la confiance, la sécurité ou la conversion.'),
    recommendation: pdfText(risk.recommendation, 'Corriger le point puis relancer un scan Webisafe.'),
    priority: pdfText(risk.priority, 'P1'),
    effort: pdfText(risk.effort, 'Intermédiaire'),
  });
}

function buildTopRisks(modelParts, recommendations, criticalAlerts) {
  const risks = [];
  const { domain, sections, scores } = modelParts;
  if (scoreValue(scores.performance) !== null && scoreValue(scores.performance) < 65) {
    addRisk(risks, {
      category: 'Performance',
      title: 'Performance mobile à valider en priorité',
      severity: scoreValue(scores.performance) < 55 ? 'Critique' : 'À corriger',
      evidence: `Score performance ${scoreDisplay(scores.performance)}${sections.performance.partial ? ' avec scan partiel' : ''}.`,
      impact: 'Risque d’abandon plus élevé sur mobile et baisse des conversions entrantes.',
      recommendation: 'Relancer une mesure complète, rapprocher les ressources via CDN et prioriser les pages les plus visitées.',
      priority: 'P1',
      effort: 'Intermédiaire',
    });
  }
  sections.security.missingHeaders.forEach((item) => {
    addRisk(risks, {
      category: 'Sécurité',
      title: `${item.header} manquant`,
      severity: item.severity,
      evidence: item.message || `${item.header} absent des réponses analysées.`,
      impact: item.severity === 'Critique' ? 'Durcissement navigateur insuffisant contre certaines attaques ou dégradations HTTPS.' : 'Bonne pratique de sécurité à compléter.',
      recommendation: `Configurer ${item.header} avec une politique adaptée à ${domain}.`,
      priority: item.severity === 'Critique' ? 'P1' : 'P2',
      effort: item.header.toLowerCase().includes('csp') ? 'Technique' : 'Intermédiaire',
    });
  });
  if (sections.security.sensitiveFiles.critical) {
    addRisk(risks, {
      category: 'Sécurité',
      title: 'Fichiers sensibles exposés',
      severity: 'Critique',
      evidence: sections.security.sensitiveFiles.exposed_files.join(', ') || sections.security.sensitiveFiles.alert_message,
      impact: 'Exposition potentielle de secrets, configurations ou informations internes.',
      recommendation: 'Retirer les fichiers exposés, bloquer l’accès public et renouveler les secrets concernés.',
      priority: 'P0',
      effort: 'Urgent',
    });
  }
  sections.advancedSecurity.checks.forEach((item) => {
    if (item.status === 'OK') return;
    const key = item.key.toLowerCase();
    const isEmail = key.includes('email');
    const isCors = key.includes('cors');
    const isSecurityTxt = key.includes('security_txt');
    addRisk(risks, {
      category: 'Sécurité avancée',
      title: isEmail ? 'Sécurité email SPF/DMARC/DKIM incomplète' : item.name,
      severity: isSecurityTxt ? 'À corriger' : item.status,
      evidence: item.detail || item.name,
      impact: isEmail ? 'Risque accru d’usurpation d’identité de domaine et de perte de confiance email.' : isCors ? 'Exposition possible de données si des origines non fiables sont autorisées.' : 'Signal de maturité sécurité à améliorer.',
      recommendation: isEmail ? 'Publier SPF, DMARC et DKIM puis vérifier la délivrabilité.' : isSecurityTxt ? 'Publier un fichier security.txt avec canal de contact sécurité.' : 'Revoir la configuration et vérifier la preuve observée.',
      priority: item.status === 'Critique' ? 'P1' : 'P2',
      effort: isEmail ? 'Intermédiaire' : 'Technique',
    });
  });
  sections.seo.extraRows.forEach((item) => {
    if (!item[2] || item[2] === 'OK') return;
    addRisk(risks, {
      category: 'SEO',
      title: `${item[0]} absent ou incomplet`,
      severity: item[2],
      evidence: `${item[0]}: ${item[1]}.`,
      impact: 'Perte potentielle de visibilité organique ou de qualité de partage.',
      recommendation: `Corriger ${item[0]} puis demander un rescan SEO.`,
      priority: 'P2',
      effort: 'Faible',
    });
  });
  sections.ux.issues.forEach((item) => {
    addRisk(risks, {
      category: 'UX Mobile',
      title: item.message,
      severity: item.severity,
      evidence: item.impact || item.type,
      impact: item.impact || 'Friction de lecture ou d’interaction mobile.',
      recommendation: 'Corriger l’élément UX puis contrôler le parcours mobile principal.',
      priority: item.severity === 'Critique' ? 'P1' : 'P3',
      effort: 'Faible',
    });
  });
  criticalAlerts.forEach((alert) => {
    addRisk(risks, {
      category: 'Alerte',
      title: alert.title,
      severity: alert.severity,
      evidence: alert.message,
      impact: alert.impact || alert.message,
      recommendation: alert.recommendation,
      priority: alert.severity === 'Critique' ? 'P1' : 'P2',
      effort: 'Intermédiaire',
    });
  });
  recommendations.filter((item) => item.rank <= 2).forEach((item) => {
    addRisk(risks, {
      category: item.category,
      title: item.title,
      severity: item.rank === 1 ? 'Critique' : 'À corriger',
      evidence: item.description,
      impact: item.impactBusiness || item.impact,
      recommendation: item.action,
      priority: item.rank === 1 ? 'P1' : 'P2',
      effort: item.difficulty || 'Intermédiaire',
    });
  });
  return risks.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.priority.localeCompare(b.priority)).slice(0, 8);
}

function planItemFromRisk(risk, timeframe) {
  const webisafe = timeframe === '7 jours'
    ? 'Pack correction prioritaire'
    : timeframe === '30 jours'
      ? 'Sprint optimisation Webisafe'
      : 'Webisafe Protect + rescan mensuel';
  return {
    title: risk.title,
    category: risk.category,
    severity: risk.severity,
    action: risk.recommendation,
    impact: risk.impact,
    effort: risk.effort,
    timeframe,
    webisafe,
  };
}

function buildActionPlan(topRisks, recommendations) {
  const now = topRisks.filter((item) => item.severity === 'Critique').slice(0, 4).map((item) => planItemFromRisk(item, '7 jours'));
  const next = topRisks.filter((item) => item.severity !== 'Critique').slice(0, 4).map((item) => planItemFromRisk(item, '30 jours'));
  const later = recommendations
    .filter((item) => item.rank >= 3)
    .slice(0, 4)
    .map((item) => ({
      title: item.title,
      category: item.category,
      severity: 'À corriger',
      action: item.action,
      impact: item.impactBusiness || item.impact,
      effort: item.difficulty || 'Faible',
      timeframe: '90 jours',
      webisafe: 'Webisafe Protect + rescan',
    }));
  if (!now.length && topRisks[0]) now.push(planItemFromRisk(topRisks[0], '7 jours'));
  if (!next.length && topRisks[1]) next.push(planItemFromRisk(topRisks[1], '30 jours'));
  if (!later.length) {
    later.push({
      title: 'Mettre en place un monitoring régulier',
      category: 'Surveillance',
      severity: 'À corriger',
      action: 'Relancer un scan après correction puis suivre les dérives de sécurité, SEO et performance.',
      impact: 'Maintien du niveau de confiance dans le temps.',
      effort: 'Faible',
      timeframe: '90 jours',
      webisafe: 'Webisafe Protect',
    });
  }
  return { now, next, later };
}

function statusCounts(sections) {
  const values = [
    ...sections.performance.metrics,
    ...sections.security.metrics,
    ...sections.security.missingHeaders,
    ...sections.seo.metrics,
    ...sections.ux.metrics,
    sections.ux.tapTargets,
    ...sections.advancedSecurity.checks,
  ].map((item) => item.status || item.severity).map(normalizeStatus);
  return {
    ok: values.filter((item) => item === 'OK').length,
    warning: values.filter((item) => item === 'À corriger' || item === 'Avertissement').length,
    critical: values.filter((item) => item === 'Critique').length,
    unknown: values.filter((item) => item === 'Non mesuré').length,
  };
}

function buildScorecard(modelParts) {
  const { scores, sections } = modelParts;
  return [
    { label: 'Performance', score: scores.performance, status: severityFromScore(scores.performance), insight: sections.performance.partial ? 'Mesure partielle à confirmer avant optimisation lourde.' : sections.performance.diagnostic },
    { label: 'Sécurité', score: scores.security, status: sectionStatus(scores.security, sections.security.missingHeaders.map((item) => item.severity)), insight: sections.security.diagnostic },
    { label: 'Sécurité avancée', score: sections.advancedSecurity.score, status: sectionStatus(sections.advancedSecurity.score, sections.advancedSecurity.checks.map((item) => item.status)), insight: sections.advancedSecurity.diagnostic },
    { label: 'SEO', score: scores.seo, status: severityFromScore(scores.seo), insight: sections.seo.diagnostic },
    { label: 'UX Mobile', score: scores.ux, status: severityFromScore(scores.ux), insight: sections.ux.diagnostic },
  ];
}

function buildMethodology(reportData, sections, scanDateLabel) {
  const blockedChecks = sections.advancedSecurity.checks
    .filter((item) => item.status === 'Non mesuré')
    .slice(0, 4)
    .map((item) => `Contrôle non scanné ou bloqué pendant le scan: ${item.name}${item.detail ? ` - ${item.detail}` : ''}.`);
  const limitations = compact([
    sections.performance.partial ? `Scan performance partiel: ${sections.performance.partialReason || 'certaines données Core Web Vitals sont indisponibles.'}` : null,
    ...sections.performance.metrics.filter((item) => item.status === 'Non mesuré').slice(0, 3).map((item) => `Donnée non disponible pendant le scan: ${item.label}.`),
    ...blockedChecks,
    sections.security.metrics.some((item) => item.status === 'Non mesuré') ? 'Certains signaux externes comme VirusTotal peuvent être indisponibles selon les limites API.' : null,
  ]);
  return {
    scope: [
      'Analyse passive du domaine et des réponses publiques accessibles pendant le scan.',
      'Aucun test intrusif, aucune exploitation et aucune tentative de contournement d’authentification.',
      'Lecture orientée décision: risques, preuves observables, impact business et actions recommandées.',
    ],
    sources: [
      'Headers HTTP, TLS/SSL, signaux de sécurité et métadonnées publiques.',
      'Indicateurs performance, SEO technique, accessibilité mobile et configuration visible.',
      'Contrôles avancés disponibles: WAF, CORS, sécurité email, sous-domaines, supply chain.',
    ],
    limitations: limitations.length ? limitations : ['Aucune limite critique relevée pendant le scan passif.'],
    origin: compact([
      reportData.scan_origin?.label ? `Origine de mesure: ${pdfText(reportData.scan_origin.label)}.` : null,
      reportData.scan_origin?.city || reportData.scan_origin?.country ? `Localisation: ${pdfText([reportData.scan_origin?.city, reportData.scan_origin?.country].filter(Boolean).join(', '))}.` : null,
      `Date du rapport: ${scanDateLabel}.`,
    ]),
  };
}

function buildExecutive(domain, scores, sections, topRisks, scanConfidenceValue) {
  const global = scoreDisplay(scores.global);
  const globalScore = scoreValue(scores.global);
  const criticalCount = topRisks.filter((item) => item.severity === 'Critique').length;
  const performanceWeak = scoreValue(scores.performance) !== null && scoreValue(scores.performance) < 65;
  const advancedWeak = sections.advancedSecurity.checks.some((item) => item.status !== 'OK' && item.status !== 'Non mesuré');
  const weaknessParts = compact([
    performanceWeak ? 'performance mobile' : null,
    sections.security.missingHeaders.length ? 'durcissement des headers de sécurité' : null,
    advancedWeak ? 'sécurité avancée' : null,
    sections.seo.extraRows.some((item) => item[2] && item[2] !== 'OK') ? 'visibilité SEO technique' : null,
  ]);
  return {
    verdict: `${domain} obtient ${global}. Le site présente une base exploitable, mais les priorités détectées doivent être traitées pour renforcer la confiance et réduire les risques visibles.`,
    businessSummary: weaknessParts.length
      ? `Les sujets les plus sensibles concernent ${weaknessParts.join(', ')}. Ces points peuvent affecter la conversion mobile, la confiance technique ou la perception professionnelle du site.`
      : 'Les signaux principaux sont solides. La priorité consiste à maintenir la surveillance et à corriger les optimisations restantes.',
    potentialImpact: criticalCount && globalScore !== null && globalScore >= 80
      ? `${criticalCount} priorité(s) forte(s) sont à traiter pour renforcer le niveau de maîtrise.`
      : criticalCount
      ? `${criticalCount} priorité(s) critique(s) doivent être traitées avant de considérer le site comme pleinement maîtrisé.`
      : 'Aucune priorité critique dominante, mais des améliorations restent utiles pour stabiliser le niveau de confiance.',
    scanConfidence: scanConfidenceValue,
    mainWeaknesses: topRisks.slice(0, 4).map((item) => item.title),
  };
}

export function buildPdfFilename(reportData = {}) {
  const domain = extractDomain(firstDefined(reportData.domain, reportData.url, 'site'));
  const safeDomain = pdfText(domain, 'site').replace(/[^a-zA-Z0-9.-]/g, '-') || 'site';
  const date = safeDate(firstDefined(reportData.scanDate, reportData.scanned_at, reportData.created_at)).toISOString().split('T')[0];
  return `Webisafe_Rapport_${safeDomain}_${date}.pdf`;
}

function buildAgencyBranding(reportData = {}) {
  const branding = reportData.agencyBranding || reportData.agency_branding || {};
  const primaryColor = /^#[0-9a-f]{6}$/i.test(rawText(branding.primary_color)) ? rawText(branding.primary_color) : '#1566F0';
  return {
    enabled: branding.enabled === true,
    agency_name: pdfText(firstDefined(branding.agency_name, branding.name, 'Webisafe')),
    logo_url: pdfText(firstDefined(branding.logo_url, branding.logoUrl, ''), ''),
    primary_color: primaryColor,
    secondary_color: /^#[0-9a-f]{6}$/i.test(rawText(branding.secondary_color)) ? rawText(branding.secondary_color) : '#0F172A',
    contact_email: pdfText(firstDefined(branding.contact_email, branding.email, ''), ''),
    footer_text: pdfText(firstDefined(branding.footer_text, 'Rapport préparé avec Webisafe.'), ''),
  };
}

export function buildPdfAuditModel(reportData = {}) {
  const url = firstDefined(reportData.url, reportData.requested_url, reportData.final_url, reportData.domain, '');
  const domain = extractDomain(url);
  const scanDate = firstDefined(reportData.scanDate, reportData.scanned_at, reportData.created_at, new Date().toISOString());
  const scores = {
    global: scoreValue(firstDefined(reportData.global_score, reportData.score, reportData.scores?.global)),
    performance: scoreValue(firstDefined(reportData.scores?.performance, reportData.metrics?.performance?.score)),
    security: scoreValue(firstDefined(reportData.scores?.security, reportData.metrics?.security?.score)),
    seo: scoreValue(firstDefined(reportData.scores?.seo, reportData.metrics?.seo?.score, reportData.metrics?.seo?.local_score)),
    ux: scoreValue(firstDefined(reportData.scores?.ux, reportData.scores?.ux_mobile, reportData.metrics?.ux?.score, reportData.metrics?.ux?.accessibility_score)),
  };
  const performance = buildPerformance(reportData, scores);
  const security = buildSecurity(reportData, scores);
  const advancedSecurity = buildAdvancedSecurity(reportData);
  const seo = buildSeo(reportData, scores);
  const ux = buildUx(reportData, scores);
  const sections = { performance, security, advancedSecurity, advanced: advancedSecurity, seo, ux };
  const recommendations = uniqueRecommendations([
    ...asArray(reportData.recommendations),
    ...generateExpertRecommendations(reportData),
  ].map(normalizeRecommendation)).sort((a, b) => a.rank - b.rank);
  const detectedImprovements = buildDetectedImprovements(performance, seo, ux, recommendations);
  const criticalAlerts = asArray(reportData.critical_alerts).map((item) => ({
    title: pdfText(firstDefined(item?.title, item?.message, 'Alerte')),
    message: pdfText(firstDefined(item?.message, item?.description, ''), ''),
    impact: pdfText(firstDefined(item?.impact, item?.impactBusiness, item?.business_impact, ''), ''),
    severity: normalizeStatus(firstDefined(item?.severity, 'Avertissement')),
    recommendation: pdfText(firstDefined(item?.recommendation, item?.action, ''), ''),
  }));
  const modelParts = { domain: pdfText(domain, 'site'), scores: { ...scores, security: security.score }, sections };
  const topRisks = buildTopRisks(modelParts, recommendations, criticalAlerts);
  const actionPlan = buildActionPlan(topRisks, recommendations);
  const counts = statusCounts(sections);
  const scorecard = buildScorecard(modelParts);
  const scanConfidenceValue = scanConfidence(sections);
  const risk = riskLevel(scores, topRisks);
  const scanDateLabel = formatPdfDate(scanDate);
  const methodology = buildMethodology(reportData, sections, scanDateLabel);
  const executive = buildExecutive(pdfText(domain, 'site'), scores, sections, topRisks, scanConfidenceValue);
  const brandUrl = pdfText(firstDefined(reportData.brand_url, reportData.public_url, 'webisafe.vercel.app'));
  const agencyBranding = buildAgencyBranding(reportData);
  const reportIdValue = reportId(domain, scanDate);
  const verifyUrl = pdfText(firstDefined(reportData.verify_url, `https://${brandUrl.replace(/^https?:\/\//, '')}/r/${reportIdValue}`));
  const glossary = [
    { term: 'LCP', label: 'Largest Contentful Paint', definition: 'Temps de chargement du plus gros élément visible. Cible Google : moins de 2,5 secondes.' },
    { term: 'CLS', label: 'Cumulative Layout Shift', definition: 'Mesure la stabilité visuelle. Une valeur supérieure à 0,1 indique un site qui « saute » pendant le chargement.' },
    { term: 'TBT', label: 'Total Blocking Time', definition: 'Temps total durant lequel l’interface est bloquée par du JavaScript. Cible : moins de 200 millisecondes.' },
    { term: 'FCP', label: 'First Contentful Paint', definition: 'Temps avant l’affichage du premier contenu. Cible : moins de 1,8 seconde sur mobile.' },
    { term: 'INP', label: 'Interaction to Next Paint', definition: 'Mesure la réactivité aux clics et saisies. Cible : moins de 200 millisecondes.' },
    { term: 'CSP', label: 'Content Security Policy', definition: 'Header HTTP qui restreint les sources de scripts pour bloquer les attaques XSS.' },
    { term: 'SRI', label: 'Subresource Integrity', definition: 'Empreinte cryptographique sur les scripts externes pour détecter toute altération.' },
    { term: 'HSTS', label: 'HTTP Strict Transport Security', definition: 'Force le navigateur à utiliser HTTPS pendant une durée donnée pour bloquer les attaques downgrade.' },
    { term: 'X-Frame-Options', label: 'Protection clickjacking', definition: 'Header qui empêche votre site d’être chargé dans une iframe malveillante.' },
    { term: 'DNSSEC', label: 'DNS Security Extensions', definition: 'Signe cryptographiquement les enregistrements DNS pour éviter les détournements de domaine.' },
    { term: 'SPF', label: 'Sender Policy Framework', definition: 'Enregistrement DNS qui liste les serveurs autorisés à envoyer du mail au nom du domaine.' },
    { term: 'DKIM', label: 'DomainKeys Identified Mail', definition: 'Signature cryptographique des emails sortants pour prouver leur authenticité.' },
    { term: 'DMARC', label: 'Domain-based Message Authentication', definition: 'Politique d’usurpation : indique aux serveurs receveurs quoi faire en cas d’échec SPF/DKIM.' },
    { term: 'WAF', label: 'Web Application Firewall', definition: 'Pare-feu applicatif qui filtre les requêtes malveillantes avant qu’elles n’atteignent le site.' },
    { term: 'TLS', label: 'Transport Layer Security', definition: 'Protocole de chiffrement utilisé par HTTPS. La version 1.2 minimum est recommandée.' },
    { term: 'JSON-LD', label: 'Données structurées', definition: 'Format de données injecté dans le HTML pour aider Google et les IA à comprendre la page.' },
  ];
  const projectScore = (score, criticalCount, warningCount) => {
    const base = scoreValue(score);
    if (base === null) return null;
    const lift = (criticalCount > 0 ? 25 : 0) + Math.min(warningCount * 4, 15);
    return Math.max(0, Math.min(95, base + lift));
  };
  const securityCriticalCount = counts.critical;
  const securityWarningCount = counts.warning;
  const comparison = {
    introduction: 'Estimation du score atteignable après application des corrections prioritaires identifiées dans ce rapport. Les gains réels dépendent de la qualité de mise en œuvre et seront mesurés au prochain scan.',
    rows: compact([
      { label: 'Score global', current: scoreValue(scores.global), projected: projectScore(scores.global, securityCriticalCount, securityWarningCount) },
      { label: 'Performance', current: scoreValue(scores.performance), projected: projectScore(scores.performance, 0, performance.opportunities.length) },
      { label: 'Sécurité', current: scoreValue(security.score), projected: projectScore(security.score, security.missingHeaders.filter((item) => item.severity === 'Critique').length, security.missingHeaders.length) },
      advancedSecurity.score !== null ? { label: 'Sécurité avancée', current: scoreValue(advancedSecurity.score), projected: projectScore(advancedSecurity.score, advancedSecurity.checks.filter((item) => item.status === 'Critique').length, advancedSecurity.checks.filter((item) => item.status === 'À corriger').length) } : null,
      { label: 'SEO', current: scoreValue(scores.seo), projected: projectScore(scores.seo, 0, seo.businessRecommendations.length) },
      { label: 'UX Mobile', current: scoreValue(scores.ux), projected: projectScore(scores.ux, 0, ux.issues.length) },
    ]),
    disclaimer: 'Projection indicative basée sur les bonnes pratiques sectorielles. Webisafe ne garantit pas l’atteinte de ces scores sans vérification post-correction.',
  };
  const narrative = {
    paragraphs: compact([
      `Votre audit premium met en évidence un niveau global de ${scoreDisplay(scores.global)} pour ${domain}.`,
      executive.businessSummary,
      recommendations[0]?.title ? `La première action recommandée est : ${recommendations[0].title}.` : '',
    ]).map((item) => pdfText(item)),
  };
  return {
    raw: reportData,
    url: pdfText(url, ''),
    domain: pdfText(domain, 'site'),
    scanDate,
    scanDateLabel,
    scanTimeLabel: formatPdfTime(scanDate),
    scanDateTimeLabel: formatPdfDateTime(scanDate),
    scanOrigin: {
      region_code: pdfText(reportData.scan_origin?.region_code, ''), city: pdfText(reportData.scan_origin?.city, ''),
      country: pdfText(reportData.scan_origin?.country, ''), label: pdfText(reportData.scan_origin?.label, ''),
    },
    report: {
      id: reportIdValue,
      scanType: 'Scan passif non intrusif',
      confidentiality: 'Confidentiel - usage interne',
      brandUrl,
      verifyUrl,
      contact: pdfText(firstDefined(reportData.contact, 'WhatsApp +225 05 95 33 56 62')),
      totalPages: 13,
    },
    agencyBranding,
    risk,
    scores,
    counts,
    executive,
    topRisks,
    actionPlan,
    scorecard,
    glossary,
    comparison,
    methodology,
    cover: {
      score: scores.global,
      scoreLabel: scoreLabel(scores.global),
      scoreColor: scoreColor(scores.global),
      metadata: compact([
        ['Domaine audité', pdfText(domain)], ['URL analysée', pdfText(url)], ['Date et heure du scan', formatPdfDateTime(scanDate)],
        ['Type de scan', 'Scan passif non intrusif'], ['ID rapport', reportIdValue],
        reportData.scan_origin?.label ? ['Origine de mesure', pdfText(reportData.scan_origin.label)] : null,
      ]),
      categoryScores: compact([
        { label: 'Performance', score: scores.performance, status: severityFromScore(scores.performance) },
        { label: 'Sécurité', score: security.score, status: sectionStatus(security.score, security.missingHeaders.map((item) => item.severity)) },
        advancedSecurity.score !== null ? { label: 'Sécurité avancée', score: advancedSecurity.score, status: sectionStatus(advancedSecurity.score, advancedSecurity.checks.map((item) => item.status)) } : null,
        { label: 'SEO', score: scores.seo, status: severityFromScore(scores.seo) },
        { label: 'UX Mobile', score: scores.ux, status: severityFromScore(scores.ux) },
      ]),
    },
    sections,
    criticalAlerts,
    recommendations,
    detectedImprovements,
    recommendationsByPriority: {
      urgent: recommendations.filter((item) => item.rank === 1),
      important: recommendations.filter((item) => item.rank === 2),
      improvement: recommendations.filter((item) => item.rank >= 3),
    },
    narrative,
  };
}
