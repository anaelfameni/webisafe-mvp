import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

const e = React.createElement;

const COLORS = {
  bg: '#0A0F1E',
  panel: '#111827',
  panelSoft: '#142033',
  panelDeep: '#0B172A',
  line: '#263449',
  cyan: '#00D4FF',
  text: '#F8FAFC',
  muted: '#CBD5E1',
  quiet: '#94A3B8',
  dim: '#64748B',
  red: '#EF4444',
  orange: '#F59E0B',
  green: '#22C55E',
  blue: '#38BDF8',
  black: '#020617',
};

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

const pdfText = (value, fallback = '—') => sanitizePdfText(value) || fallback;
const compact = (values) => values.filter(Boolean);
const firstDefined = (...values) => values.find((value) => value !== null && value !== undefined && value !== '');

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

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

function formatDate(value) {
  return safeDate(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = rawText(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function scoreValue(value) {
  const parsed = asNumber(value);
  if (parsed === null) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function scoreDisplay(value) {
  const score = scoreValue(value);
  return score === null ? 'Non mesuré' : `${score}/100`;
}

function scoreColor(value) {
  const score = scoreValue(value);
  if (score === null) return COLORS.dim;
  if (score < SCORE_LIMITS.critical) return COLORS.red;
  if (score < SCORE_LIMITS.warning) return COLORS.orange;
  if (score < SCORE_LIMITS.good) return COLORS.green;
  return COLORS.blue;
}

function scoreLabel(value) {
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

function normalizeStatus(value) {
  const current = sanitizePdfText(value).toLowerCase();
  if (!current || current.includes('non mesur') || current.includes('non exécut') || current.includes('indisponible')) return 'Non mesuré';
  if (['ok', 'pass', 'passed', 'success', 'présent', 'present', 'activé', 'active', 'complet'].includes(current)) return 'OK';
  if (current.includes('critique') || current.includes('critical') || current.includes('fail') || current.includes('échec') || current.includes('echec') || current.includes('absent') || current.includes('missing')) return 'Critique';
  if (current.includes('warn') || current.includes('avert') || current.includes('medium') || current.includes('moyen') || current.includes('partiel')) return 'Avertissement';
  return pdfText(value);
}

function statusPalette(value) {
  const status = normalizeStatus(value);
  if (status === 'OK') return { bg: '#052E1A', border: '#14532D', text: '#86EFAC' };
  if (status === 'Avertissement') return { bg: '#3A2507', border: '#92400E', text: '#FCD34D' };
  if (status === 'Critique') return { bg: '#3B0A12', border: '#991B1B', text: '#FCA5A5' };
  return { bg: COLORS.panel, border: COLORS.line, text: COLORS.quiet };
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
  if (typeof item === 'string') return { header: pdfText(item), message: '', severity: 'Avertissement' };
  return {
    header: pdfText(firstDefined(item?.header, item?.name, item?.label, 'Header')),
    message: pdfText(firstDefined(item?.message, item?.description, item?.recommendation, ''), ''),
    severity: normalizeStatus(firstDefined(item?.severity, item?.status, 'Avertissement')),
  };
}

function normalizeIssue(item) {
  if (typeof item === 'string') return { type: 'issue', message: pdfText(item), impact: '', severity: 'Avertissement' };
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
    missingHeaders: asArray(sec.headers_manquants).map(normalizeHeader),
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
    global: scoreValue(firstDefined(reportData.global_score, reportData.score)),
    performance: scoreValue(firstDefined(reportData.scores?.performance, reportData.metrics?.performance?.score)),
    security: scoreValue(firstDefined(reportData.scores?.security, reportData.metrics?.security?.score)),
    seo: scoreValue(firstDefined(reportData.scores?.seo, reportData.metrics?.seo?.score, reportData.metrics?.seo?.local_score)),
    ux: scoreValue(firstDefined(reportData.scores?.ux, reportData.metrics?.ux?.score, reportData.metrics?.ux?.accessibility_score)),
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
    scanDateLabel: formatDate(scanDate),
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
        ['Domaine audité', pdfText(domain)], ['URL analysée', pdfText(url)], ['Date du scan', formatDate(scanDate)],
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

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: 'Helvetica', paddingTop: 64, paddingBottom: 54, paddingHorizontal: 34 },
  header: { position: 'absolute', top: 24, left: 34, right: 34, height: 22, borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: 'row', justifyContent: 'space-between' },
  brand: { color: COLORS.cyan, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 },
  headerDomain: { color: COLORS.quiet, fontSize: 8 },
  footerText: { position: 'absolute', left: 34, bottom: 25, color: COLORS.dim, fontSize: 7.5 },
  pageNumber: { position: 'absolute', right: 34, bottom: 25, color: COLORS.quiet, fontSize: 7.5 },
  eyebrow: { color: COLORS.cyan, fontSize: 8, fontWeight: 700, letterSpacing: 1.1, marginBottom: 8, textTransform: 'uppercase' },
  title: { color: COLORS.text, fontSize: 28, lineHeight: 1.08, fontWeight: 700, marginBottom: 8 },
  subtitle: { color: COLORS.muted, fontSize: 10.5, lineHeight: 1.45, marginBottom: 18 },
  hero: { minHeight: 190, borderRadius: 22, borderWidth: 1, borderColor: '#164E63', backgroundColor: COLORS.panelDeep, padding: 22, marginBottom: 18 },
  heroTitle: { color: COLORS.text, fontSize: 34, lineHeight: 1.05, fontWeight: 700, marginBottom: 10 },
  heroDomain: { color: COLORS.cyan, fontSize: 16, fontWeight: 700, marginBottom: 12 },
  p: { color: COLORS.muted, fontSize: 9.2, lineHeight: 1.45, marginBottom: 7 },
  panel: { backgroundColor: COLORS.panel, borderColor: COLORS.line, borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 13 },
  panelTitle: { color: COLORS.text, fontSize: 12, fontWeight: 700, marginBottom: 9 },
  scoreBox: { backgroundColor: '#0C1626', borderColor: COLORS.line, borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 14 },
  scoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  scoreSmall: { color: COLORS.quiet, fontSize: 8, marginBottom: 4, textTransform: 'uppercase' },
  scoreBig: { fontSize: 30, fontWeight: 700 },
  scoreCaption: { color: COLORS.muted, fontSize: 9, lineHeight: 1.35, textAlign: 'right', width: 145 },
  track: { height: 12, borderRadius: 999, backgroundColor: COLORS.black, borderColor: '#1E293B', borderWidth: 1, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 999 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  tick: { color: COLORS.dim, fontSize: 6.5 },
  cols: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48.5%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 6 },
  metric: { width: '48.5%', backgroundColor: '#0C1626', borderColor: COLORS.line, borderWidth: 1, borderRadius: 13, padding: 11, marginBottom: 10 },
  metricLabel: { color: COLORS.quiet, fontSize: 7.5, marginBottom: 5 },
  metricValue: { color: COLORS.text, fontSize: 13, fontWeight: 700, marginBottom: 7 },
  metricNote: { color: COLORS.dim, fontSize: 6.7, lineHeight: 1.3, marginTop: 6 },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  badgeText: { fontSize: 6.7, fontWeight: 700 },
  table: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  tableHead: { backgroundColor: '#0E1A2B', borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: 'row' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1D2A3D' },
  th: { color: COLORS.cyan, fontSize: 7.4, fontWeight: 700, paddingVertical: 7, paddingHorizontal: 8, lineHeight: 1.25 },
  td: { color: COLORS.muted, fontSize: 7.2, paddingVertical: 7, paddingHorizontal: 8, lineHeight: 1.35 },
  empty: { color: COLORS.quiet, fontSize: 8.5, lineHeight: 1.4 },
  action: { backgroundColor: '#0C1626', borderColor: COLORS.line, borderWidth: 1, borderRadius: 14, padding: 11, marginBottom: 9 },
  actionTitle: { color: COLORS.text, fontSize: 10, fontWeight: 700, lineHeight: 1.25, marginBottom: 5 },
  actionMeta: { color: COLORS.cyan, fontSize: 7, fontWeight: 700, marginBottom: 5 },
  cta: { backgroundColor: '#062A3A', borderColor: '#0E7490', borderWidth: 1, borderRadius: 18, padding: 17, marginTop: 8 },
  ctaTitle: { color: COLORS.cyan, fontSize: 15, fontWeight: 700, marginBottom: 8 },
});

function PageShell({ model, title, children }) {
  return e(Page, { size: 'A4', style: styles.page, wrap: false },
    e(View, { fixed: true, style: styles.header }, e(Text, { style: styles.brand }, 'Webisafe'), e(Text, { style: styles.headerDomain }, `${title} - ${model.domain}`)),
    e(View, null, children),
    e(Text, { fixed: true, style: styles.footerText }, 'Rapport confidentiel — webisafe.ci'),
    e(Text, { fixed: true, style: styles.pageNumber, render: ({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}` }),
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return e(View, { wrap: false }, e(Text, { style: styles.eyebrow }, eyebrow), e(Text, { style: styles.title }, title), e(Text, { style: styles.subtitle }, subtitle));
}

function Badge({ value }) {
  const palette = statusPalette(value);
  return e(View, { style: [styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }], wrap: false }, e(Text, { style: [styles.badgeText, { color: palette.text }] }, normalizeStatus(value)));
}

function Gauge({ label, value, caption }) {
  const score = scoreValue(value);
  return e(View, { style: styles.scoreBox, wrap: false },
    e(View, { style: styles.scoreTop },
      e(View, null,
        e(Text, { style: styles.scoreSmall }, label),
        e(Text, { style: [styles.scoreBig, { color: scoreColor(value) }] }, score === null ? '—' : `${score}`),
        e(Text, { style: { color: COLORS.quiet, fontSize: 8, marginTop: 2 } }, score === null ? 'Non mesuré' : `${scoreLabel(score)} / 100`),
      ),
      e(Text, { style: styles.scoreCaption }, caption),
    ),
    e(View, { style: styles.track }, e(View, { style: [styles.fill, { width: `${score === null ? 0 : score}%`, backgroundColor: scoreColor(value) }] })),
    e(View, { style: styles.ticks }, e(Text, { style: styles.tick }, '0 critique'), e(Text, { style: styles.tick }, '40'), e(Text, { style: styles.tick }, '65'), e(Text, { style: styles.tick }, '85'), e(Text, { style: styles.tick }, '100 excellent')),
  );
}

function MiniScore({ item }) {
  const value = scoreValue(item.score);
  return e(View, { style: { marginBottom: 9 }, wrap: false },
    e(View, { style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 } }, e(Text, { style: { color: COLORS.muted, fontSize: 8.5 } }, item.label), e(Text, { style: { color: scoreColor(value), fontSize: 8.5, fontWeight: 700 } }, scoreDisplay(value))),
    e(View, { style: [styles.track, { height: 8 }] }, e(View, { style: [styles.fill, { height: 6, width: `${value === null ? 0 : value}%`, backgroundColor: scoreColor(value) }] })),
  );
}

function Panel({ title, children }) {
  return e(View, { style: styles.panel, wrap: false }, e(Text, { style: styles.panelTitle }, title), children);
}

function MetricCard({ item }) {
  return e(View, { style: styles.metric, wrap: false }, e(Text, { style: styles.metricLabel }, item.label), e(Text, { style: styles.metricValue }, item.value), e(Badge, { value: item.status }), item.note ? e(Text, { style: styles.metricNote }, item.note) : null);
}

function MetricGrid({ metrics }) {
  return e(View, { style: styles.grid }, ...metrics.map((item, index) => e(MetricCard, { key: `${item.label}-${index}`, item })));
}

function DataTable({ columns, rows, widths, maxRows = 7, statusColumn = 2 }) {
  const visibleRows = asArray(rows).filter((item) => Array.isArray(item) && item.some((cell) => pdfText(cell, '') !== '')).slice(0, maxRows);
  if (!visibleRows.length) return e(Text, { style: styles.empty }, 'Aucune donnée détaillée disponible.');
  return e(View, { style: styles.table, wrap: false },
    e(View, { style: styles.tableHead }, ...columns.map((column, index) => e(Text, { key: column, style: [styles.th, { width: widths[index] }] }, column))),
    ...visibleRows.map((line, rowIndex) => e(View, { key: rowIndex, style: styles.tableRow, wrap: false },
      ...line.map((cell, cellIndex) => e(Text, { key: `${rowIndex}-${cellIndex}`, style: [styles.td, { width: widths[cellIndex] }, cellIndex === statusColumn ? { color: statusPalette(cell).text, fontWeight: 700 } : null] }, pdfText(cell))),
    )),
  );
}

function CoverPage({ model }) {
  return e(PageShell, { model, title: 'Rapport premium' },
    e(View, { style: styles.hero, wrap: false },
      e(Text, { style: styles.eyebrow }, 'Rapport d’audit premium'),
      e(Text, { style: styles.heroTitle }, 'Audit Webisafe'),
      e(Text, { style: styles.heroDomain }, model.domain),
      e(Text, { style: styles.p }, `Analyse générée le ${model.scanDateLabel}. Ce document synthétise les risques, la performance, le SEO, l’expérience mobile et les priorités de correction.`),
      e(Text, { style: styles.p }, 'Document conçu pour une présentation client : pages dédiées, hiérarchie claire, fond sombre uniforme et statuts exploitables.'),
    ),
    e(Gauge, { label: 'Score global', value: model.scores.global, caption: 'Indice consolidé Webisafe basé sur les dimensions mesurées.' }),
    e(View, { style: styles.cols },
      e(View, { style: styles.half }, e(Panel, { title: 'Scores par catégorie' }, ...model.cover.categoryScores.map((item, index) => e(MiniScore, { key: index, item })))),
      e(View, { style: styles.half }, e(Panel, { title: 'Résumé exécutif' }, ...model.narrative.paragraphs.map((item, index) => e(Text, { key: index, style: styles.p }, item)))),
    ),
    e(Panel, { title: 'Métadonnées du scan' }, e(DataTable, { columns: ['Élément', 'Valeur'], rows: model.cover.metadata, widths: ['34%', '66%'], maxRows: 6, statusColumn: -1 })),
  );
}

function PerformancePage({ model }) {
  const section = model.sections.performance;
  const serverRows = compact([
    section.serverLocation.city ? ['Ville', section.serverLocation.city] : null,
    section.serverLocation.country ? ['Pays', section.serverLocation.country] : null,
    section.serverLocation.isp ? ['Hébergeur', section.serverLocation.isp] : null,
    section.serverLocation.ip ? ['IP', section.serverLocation.ip] : null,
    section.serverLocation.message ? ['Latence', section.serverLocation.message] : null,
    section.serverLocation.recommendation ? ['Recommandation', section.serverLocation.recommendation] : null,
  ]);
  return e(PageShell, { model, title: 'Performance' },
    e(SectionHeading, { eyebrow: 'Section 01', title: 'Performance', subtitle: 'Vitesse perçue, stabilité visuelle, poids de page et opportunités d’optimisation.' }),
    e(Gauge, { label: 'Score performance', value: section.score, caption: 'Une vitesse faible pénalise directement la conversion, surtout sur mobile.' }),
    e(MetricGrid, { metrics: section.metrics }),
    e(View, { style: styles.cols },
      e(View, { style: styles.half }, e(Panel, { title: 'Localisation serveur' }, e(DataTable, { columns: ['Signal', 'Valeur'], rows: serverRows, widths: ['36%', '64%'], maxRows: 6, statusColumn: -1 }))),
      e(View, { style: styles.half }, e(Panel, { title: 'Optimisations prioritaires' }, e(DataTable, { columns: ['Optimisation', 'Détail', 'Gain'], rows: section.opportunities.map((item) => [item.title, item.description, item.savings]), widths: ['34%', '48%', '18%'], maxRows: 5, statusColumn: -1 }))),
    ),
  );
}

function SecurityPage({ model }) {
  const section = model.sections.security;
  const sensitiveRows = compact([
    section.sensitiveFiles.alert_message ? ['Alerte', section.sensitiveFiles.alert_message, section.sensitiveFiles.critical ? 'Critique' : 'Avertissement'] : null,
    ...section.sensitiveFiles.exposed_files.map((file) => ['Fichier exposé', file, 'Critique']),
  ]);
  return e(PageShell, { model, title: 'Sécurité' },
    e(SectionHeading, { eyebrow: 'Section 02', title: 'Sécurité', subtitle: 'HTTPS, SSL, malware, headers, cookies et fichiers sensibles accessibles.' }),
    e(Gauge, { label: 'Score sécurité', value: section.score, caption: 'Les signaux critiques sont priorisés pour réduire le risque client.' }),
    e(MetricGrid, { metrics: section.metrics }),
    e(View, { style: styles.cols },
      e(View, { style: styles.half }, e(Panel, { title: 'Headers manquants' }, e(DataTable, { columns: ['Header', 'Message', 'Statut'], rows: section.missingHeaders.map((item) => [item.header, item.message, item.severity]), widths: ['30%', '50%', '20%'], maxRows: 6 }))),
      e(View, { style: styles.half }, e(Panel, { title: 'Cookies et fichiers sensibles' }, e(DataTable, { columns: ['Élément', 'Détail', 'Statut'], rows: [...section.cookieIssues.map((item) => ['Cookie', item, 'Avertissement']), ...sensitiveRows], widths: ['28%', '52%', '20%'], maxRows: 7 }))),
    ),
  );
}

function AdvancedSecurityPage({ model }) {
  const section = model.sections.advancedSecurity;
  const emailRows = compact([
    section.email.spf ? ['SPF', section.email.spf, section.email.spf === 'Présent' ? 'OK' : 'Avertissement'] : null,
    section.email.dmarc ? ['DMARC', section.email.dmarc, section.email.dmarc === 'Présent' ? 'OK' : 'Avertissement'] : null,
    section.email.dkim ? ['DKIM', section.email.dkim, section.email.dkim === 'Présent' ? 'OK' : 'Avertissement'] : null,
    section.email.missing.length ? ['Manquants', section.email.missing.join(', '), 'Avertissement'] : null,
  ]);
  return e(PageShell, { model, title: 'Sécurité avancée' },
    e(SectionHeading, { eyebrow: 'Section 03', title: 'Sécurité avancée', subtitle: 'WAF, sous-domaines, takeover, supply chain, email, typosquatting et contrôles étendus.' }),
    section.score !== null
      ? e(Gauge, { label: 'Score sécurité avancée', value: section.score, caption: 'Ce score agrège uniquement les checks avancés disponibles.' })
      : e(Panel, { title: 'Score sécurité avancée' }, e(Text, { style: styles.empty }, 'Score global non mesuré : certains checks avancés peuvent être indisponibles, sans que cela signifie une faille critique.')),
    e(View, { style: styles.cols },
      e(View, { style: styles.half }, e(Panel, { title: 'Checks principaux' }, e(DataTable, { columns: ['Check', 'Résultat', 'Statut'], rows: section.summaryRows, widths: ['35%', '45%', '20%'], maxRows: 6 }))),
      e(View, { style: styles.half }, e(Panel, { title: 'Sécurité email' }, e(DataTable, { columns: ['Élément', 'Résultat', 'Statut'], rows: emailRows, widths: ['30%', '50%', '20%'], maxRows: 5 }))),
    ),
    e(Panel, { title: 'Détail des checks étendus' }, e(DataTable, { columns: ['Check', 'Détail', 'Statut'], rows: section.checks.map((item) => [item.name, item.detail, item.status]), widths: ['30%', '50%', '20%'], maxRows: 7 })),
  );
}

function SeoPage({ model }) {
  const section = model.sections.seo;
  return e(PageShell, { model, title: 'SEO' },
    e(SectionHeading, { eyebrow: 'Section 04', title: 'SEO', subtitle: 'Structure de page, indexabilité, métadonnées et signaux de partage.' }),
    e(Gauge, { label: 'Score SEO', value: section.score, caption: 'Un SEO technique propre améliore la visibilité et la qualité du trafic organique.' }),
    e(MetricGrid, { metrics: section.metrics }),
    e(View, { style: styles.cols },
      e(View, { style: styles.half }, e(Panel, { title: 'Signaux complémentaires' }, e(DataTable, { columns: ['Critère', 'Valeur', 'Statut'], rows: section.extraRows, widths: ['34%', '44%', '22%'], maxRows: 5 }))),
      e(View, { style: styles.half }, e(Panel, { title: 'Lecture SEO' }, e(Text, { style: styles.p }, 'Les absences critiques doivent être corrigées avant les optimisations éditoriales. La priorité est de rendre les pages lisibles, indexables et correctement présentées dans les moteurs.'))),
    ),
  );
}

function UxPage({ model }) {
  const section = model.sections.ux;
  return e(PageShell, { model, title: 'UX Mobile' },
    e(SectionHeading, { eyebrow: 'Section 05', title: 'UX Mobile', subtitle: 'Accessibilité, confort tactile, zoom mobile, médias et obstacles à la conversion.' }),
    e(Gauge, { label: 'Score UX mobile', value: section.score, caption: 'La qualité mobile influence la confiance, le taux de rebond et les demandes entrantes.' }),
    e(MetricGrid, { metrics: [...section.metrics, section.tapTargets] }),
    e(Panel, { title: 'Problèmes UX détectés' }, e(DataTable, { columns: ['Problème', 'Impact', 'Statut'], rows: section.issues.map((item) => [item.message, item.impact || item.type, item.severity]), widths: ['42%', '40%', '18%'], maxRows: 8 })),
  );
}

function ActionCard({ item }) {
  const color = item.rank === 1 ? COLORS.red : item.rank === 2 ? COLORS.orange : COLORS.cyan;
  return e(View, { style: [styles.action, { borderColor: color }], wrap: false },
    e(Text, { style: [styles.actionMeta, { color }] }, `${item.priority} — ${item.category}`),
    e(Text, { style: styles.actionTitle }, item.title),
    item.description ? e(Text, { style: styles.p }, item.description) : null,
    item.action ? e(Text, { style: styles.p }, `Action : ${item.action}`) : null,
    item.impactBusiness ? e(Text, { style: styles.p }, `Impact business : ${item.impactBusiness}`) : null,
    item.time || item.difficulty ? e(Text, { style: [styles.p, { color: COLORS.quiet }] }, compact([item.difficulty, item.time]).join(' • ')) : null,
  );
}

function ActionGroup({ title, items }) {
  return e(View, { style: styles.half, wrap: false },
    e(Text, { style: styles.panelTitle }, title),
    items.slice(0, 2).length ? items.slice(0, 2).map((item, index) => e(ActionCard, { key: index, item })) : e(View, { style: styles.panel }, e(Text, { style: styles.empty }, 'Aucune action dans cette catégorie.')),
  );
}

function Actions({ model }) {
  const g = model.recommendationsByPriority;
  return e(PageShell, { model, title: 'Plan d’action' },
    e(SectionHeading, { eyebrow: 'Section 06', title: 'Plan d’action', subtitle: 'Priorités de correction classées pour transformer le rapport en feuille de route.' }),
    e(Panel, { title: 'Alertes à surveiller' }, e(DataTable, { columns: ['Alerte', 'Détail', 'Statut'], rows: model.criticalAlerts.map((item) => [item.title, item.message || item.recommendation, item.severity]), widths: ['32%', '48%', '20%'], maxRows: 3 })),
    e(View, { style: styles.cols }, e(ActionGroup, { title: 'Urgentes', items: g.urgent }), e(ActionGroup, { title: 'Importantes', items: g.important })),
    e(View, { style: styles.cols },
      e(ActionGroup, { title: 'Améliorations', items: g.improvement }),
      e(View, { style: styles.half }, e(Panel, { title: 'Méthode de correction' }, e(Text, { style: styles.p }, 'Traiter d’abord les risques critiques, puis les freins business importants, avant les améliorations de confort et de visibilité.'))),
    ),
  );
}

function Cta({ model }) {
  return e(PageShell, { model, title: 'CTA' },
    e(SectionHeading, { eyebrow: 'Section 07', title: 'Prochaine étape', subtitle: 'Transformer ce rapport en corrections concrètes, priorisées et mesurables.' }),
    e(View, { style: [styles.hero, { minHeight: 220 }], wrap: false },
      e(Text, { style: styles.eyebrow }, 'Accompagnement Webisafe'),
      e(Text, { style: styles.heroTitle }, 'Corriger les points critiques'),
      e(Text, { style: styles.heroDomain }, model.domain),
      e(Text, { style: styles.p }, 'Ce rapport identifie les risques et les opportunités. L’étape suivante consiste à corriger les problèmes qui impactent directement la confiance, la sécurité, la vitesse et la conversion.'),
      e(Text, { style: styles.p }, 'Webisafe peut vous accompagner sur les corrections techniques, la sécurisation, l’optimisation mobile, le SEO technique et le suivi post-correction.'),
    ),
    e(View, { style: styles.cols },
      e(View, { style: styles.half },
        e(Panel, { title: 'Ce que nous pouvons corriger' },
          e(DataTable, { columns: ['Priorité', 'Objectif', 'Statut'], rows: [['Sécurité', 'Réduire les failles et expositions', 'Critique'], ['Performance', 'Accélérer le chargement mobile', 'Avertissement'], ['SEO', 'Améliorer les signaux techniques', 'Avertissement'], ['UX Mobile', 'Réduire les freins de conversion', 'Avertissement']], widths: ['30%', '50%', '20%'], maxRows: 4 }),
        ),
      ),
      e(View, { style: styles.half },
        e(View, { style: styles.cta, wrap: false },
          e(Text, { style: styles.ctaTitle }, 'Voir les packs de correction'),
          e(Text, { style: styles.p }, 'Consultez les packs Webisafe pour choisir le niveau d’intervention adapté à votre site.'),
          e(Text, { style: [styles.p, { color: COLORS.cyan, fontWeight: 700 }] }, 'webisafe.ci'),
        ),
        e(Panel, { title: 'Livrable attendu' },
          e(Text, { style: styles.p }, 'Après correction : risques réduits, priorités traitées et rapport exploitable pour mesurer les progrès.'),
        ),
      ),
    ),
  );
}

function PdfReport({ model }) {
  return e(Document, { title: `Rapport Webisafe - ${model.domain}`, author: 'Webisafe', creator: 'Webisafe' },
    e(CoverPage, { model }),
    e(PerformancePage, { model }),
    e(SecurityPage, { model }),
    e(AdvancedSecurityPage, { model }),
    e(SeoPage, { model }),
    e(UxPage, { model }),
    e(Actions, { model }),
    e(Cta, { model }),
  );
}

export async function generatePDF(reportData) {
  const model = buildPdfAuditModel(reportData);
  const blob = await pdf(e(PdfReport, { model })).toBlob();
  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = buildPdfFilename(reportData);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
  return blob;
}
