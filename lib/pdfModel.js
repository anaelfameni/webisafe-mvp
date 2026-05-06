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
  if (['ok', 'pass', 'passed', 'success', 'présent', 'present', 'activé', 'active', 'complet'].includes(current)) return 'OK';
  if (current.includes('critique') || current.includes('critical') || current.includes('fail') || current.includes('échec') || current.includes('echec') || current.includes('absent') || current.includes('missing')) return 'Critique';
  if (current.includes('warn') || current.includes('avert') || current.includes('medium') || current.includes('moyen') || current.includes('partiel')) return 'À corriger';
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

function normalizeHeader(item) {
  if (typeof item === 'string') return { header: pdfText(item), message: '', severity: 'À corriger' };
  return {
    header: pdfText(firstDefined(item?.header, item?.name, item?.label, 'Header')),
    message: pdfText(firstDefined(item?.message, item?.description, item?.recommendation, ''), ''),
    severity: normalizeStatus(firstDefined(item?.severity, item?.status, 'Avertissement')),
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

function normalizeCheck(item) {
  const key = pdfText(firstDefined(item?.check_name, item?.key, item?.id, item?.name, 'check')).toLowerCase();
  return {
    key,
    name: pdfText(firstDefined(item?.title, item?.label, item?.name, key)),
    status: normalizeStatus(firstDefined(item?.status, item?.result, 'Non mesuré')),
    detail: pdfText(firstDefined(item?.description, item?.technical_detail, item?.message, item?.recommendation, ''), ''),
    data: item?.data && typeof item.data === 'object' ? item.data : {},
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
  const rank = priorityRank(firstDefined(item?.priority, item?.severity, item?.niveau, 3));
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

function buildPerformance(reportData, scores) {
  const perf = reportData.metrics?.performance || {};
  const server = perf.server_location || {};
  const latency = server.latency_warning || {};
  const isPartial = perf.partial === true;
  return {
    score: scores.performance,
    metrics: [
      metric('Score performance', scoreDisplay(scores.performance), scoreStatus(scores.performance), 'Qualité de chargement ressentie par vos visiteurs.'),
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
  };
}

function buildSecurity(reportData, scores) {
  const sec = reportData.metrics?.security || {};
  const https = firstDefined(sec.https_enabled, sec.https);
  const sensitive = sec.sensitive_files || {};
  return {
    score: scores.security,
    metrics: [
      metric('Score sécurité', scoreDisplay(scores.security), scoreStatus(scores.security), 'Score global de sécurité technique.'),
      metric('Grade SSL', firstDefined(sec.ssl_grade, sec.security_grade, 'Non mesuré'), sec.ssl_grade === 'A' || sec.ssl_grade === 'A+' ? 'OK' : sec.ssl_grade ? 'Avertissement' : 'Non mesuré', 'Qualité TLS/SSL.'),
      metric('HTTPS', yesNo(https, 'Activé', 'Non activé'), boolStatus(https), 'Protection des échanges entre le visiteur et le site.'),
      metric('VirusTotal', sec.malware_detected === true ? 'Menace détectée' : sec.malware_detected === false ? 'Aucun malware détecté' : 'Non vérifié', sec.malware_detected === true ? 'Critique' : sec.malware_detected === false ? 'OK' : 'Non mesuré', 'Réputation malware publique.'),
    ],
    observatoryScore: scoreDisplay(sec.observatory_score),
    missingHeaders: asArray(firstDefined(sec.headers_manquants, sec.missing_headers, sec.headers_missing)).map(normalizeHeader),
    cookieIssues: asArray(sec.cookie_issues).map((item) => pdfText(item)),
    sensitiveFiles: { critical: sensitive.critical === true, alert_message: pdfText(sensitive.alert_message, ''), exposed_files: asArray(sensitive.exposed_files).map((item) => pdfText(item)) },
  };
}

function buildAdvancedSecurity(reportData) {
  const sec = reportData.metrics?.security || {};
  const allChecks = [...asArray(sec.extended_checks), ...asArray(sec.advanced_checks)].map(normalizeCheck);
  const checks = allChecks.filter((item, index, source) => source.findIndex((candidate) => candidate.key === item.key) === index);
  const findCheck = (key) => checks.find((item) => item.key === key);
  const checkRow = (key, label) => {
    const item = findCheck(key);
    return item ? row(label, item.name, item.status) : row(label, 'Check non exécuté', 'Non mesuré');
  };
  const email = findCheck('email_advanced');
  return {
    score: scoreValue(firstDefined(sec.extended_security_score, sec.advanced_security_score, reportData.scores?.advanced_security)),
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
  };
}

function buildSeo(reportData, scores) {
  const seo = reportData.metrics?.seo || {};
  return {
    score: scores.seo,
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
  };
}

function buildUx(reportData, scores) {
  const ux = reportData.metrics?.ux || {};
  return {
    score: scores.ux,
    metrics: [
      metric('Score UX', scoreDisplay(scores.ux), scoreStatus(scores.ux), 'Confort mobile et accessibilité.'),
      metric('Grade UX', firstDefined(ux.grade, 'Non mesuré'), ux.grade && ['A', 'B'].includes(ux.grade) ? 'OK' : ux.grade ? 'Avertissement' : 'Non mesuré', 'Synthèse ergonomique.'),
      metric('Compression', firstDefined(ux.compression, 'Non mesurée'), ux.compression ? 'OK' : 'Non mesuré', 'Compression des ressources.'),
      metric('Images sans alt', ux.images_without_alt !== undefined ? `${ux.images_without_alt}` : 'Non mesuré', ux.images_without_alt > 0 ? 'Avertissement' : ux.images_without_alt === 0 ? 'OK' : 'Non mesuré', 'Accessibilité des images.'),
      metric('Liens sans texte', ux.links_without_text !== undefined ? `${ux.links_without_text}` : 'Non mesuré', ux.links_without_text > 0 ? 'Avertissement' : ux.links_without_text === 0 ? 'OK' : 'Non mesuré', 'Compréhension des liens.'),
      metric('Zoom bloqué', yesNo(ux.user_zoom_blocked, 'Oui', 'Non'), ux.user_zoom_blocked === true ? 'Critique' : ux.user_zoom_blocked === false ? 'OK' : 'Non mesuré', 'Agrandissement mobile.'),
    ],
    tapTargets: metric('Cibles tactiles', yesNo(ux.tap_targets_ok, 'Correctes', 'Trop proches'), boolStatus(ux.tap_targets_ok, 'Avertissement'), 'Facilité de clic au doigt.'),
    issues: asArray(ux.issues).map(normalizeIssue),
  };
}

export function buildPdfFilename(reportData = {}) {
  const domain = extractDomain(firstDefined(reportData.domain, reportData.url, 'site'));
  const safeDomain = pdfText(domain, 'site').replace(/[^a-zA-Z0-9.-]/g, '-') || 'site';
  const date = safeDate(firstDefined(reportData.scanDate, reportData.scanned_at, reportData.created_at)).toISOString().split('T')[0];
  return `Webisafe_Rapport_${safeDomain}_${date}.pdf`;
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
  const recommendations = asArray(reportData.recommendations).map(normalizeRecommendation).sort((a, b) => a.rank - b.rank);
  const criticalAlerts = asArray(reportData.critical_alerts).map((item) => ({
    title: pdfText(firstDefined(item?.title, item?.message, 'Alerte')),
    message: pdfText(firstDefined(item?.message, item?.description, ''), ''),
    severity: normalizeStatus(firstDefined(item?.severity, 'Avertissement')),
    recommendation: pdfText(firstDefined(item?.recommendation, item?.action, ''), ''),
  }));
  const narrative = {
    paragraphs: compact([
      `Votre audit premium met en évidence un niveau global de ${scoreDisplay(scores.global)} pour ${domain}.`,
      recommendations[0]?.title ? `La première action recommandée est : ${recommendations[0].title}.` : '',
      'Chaque section isole un sujet et distingue clairement les statuts OK, avertissement et critique.',
    ]).map((item) => pdfText(item)),
  };
  return {
    raw: reportData,
    url: pdfText(url, ''),
    domain: pdfText(domain, 'site'),
    scanDate,
    scanDateLabel: formatPdfDate(scanDate),
    scanOrigin: {
      region_code: pdfText(reportData.scan_origin?.region_code, ''), city: pdfText(reportData.scan_origin?.city, ''),
      country: pdfText(reportData.scan_origin?.country, ''), label: pdfText(reportData.scan_origin?.label, ''),
    },
    scores,
    cover: {
      score: scores.global,
      scoreLabel: scoreLabel(scores.global),
      scoreColor: scoreColor(scores.global),
      metadata: compact([
        ['Domaine audité', pdfText(domain)], ['URL analysée', pdfText(url)], ['Date du scan', formatPdfDate(scanDate)],
        reportData.scan_origin?.label ? ['Origine de mesure', pdfText(reportData.scan_origin.label)] : null,
      ]),
      categoryScores: compact([
        { label: 'Performance', score: scores.performance }, { label: 'Sécurité', score: scores.security },
        advancedSecurity.score !== null ? { label: 'Sécurité avancée', score: advancedSecurity.score } : null,
        { label: 'SEO', score: scores.seo }, { label: 'UX Mobile', score: scores.ux },
      ]),
    },
    sections: { performance, security, advancedSecurity, advanced: advancedSecurity, seo, ux },
    criticalAlerts,
    recommendations,
    recommendationsByPriority: {
      urgent: recommendations.filter((item) => item.rank === 1),
      important: recommendations.filter((item) => item.rank === 2),
      improvement: recommendations.filter((item) => item.rank === 3),
    },
    narrative,
  };
}
