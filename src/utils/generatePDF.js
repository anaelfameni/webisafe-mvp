import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, extractDomain } from './validators.js';
import { buildPremiumExplanationParagraphs } from './premiumExplanation.js';

export function sanitizePdfText(value) {
  const source = String(value ?? '');
  return source
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u00B7]/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function t(value, fallback = 'N/A') {
  const text = sanitizePdfText(value);
  return text || fallback;
}

function num(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function boolLabel(value, yes = 'Oui', no = 'Non') {
  if (value === true) return yes;
  if (value === false) return no;
  return 'N/A';
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function buildPdfFilename(reportData) {
  const rawDomain = reportData.domain || reportData.url || 'site';
  const sanitizedDomain = t(extractDomain(rawDomain), 'site').replace(/[^a-zA-Z0-9.-]/g, '-');
  const datePart = new Date(reportData.scanDate || Date.now()).toISOString().split('T')[0];
  return `Webisafe_Rapport_${sanitizedDomain}_${datePart}.pdf`;
}

function getScoreColor(score) {
  if (score >= 90) return '#3b82f6';
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#eab308';
  if (score >= 30) return '#f97316';
  return '#ef4444';
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function scoreRgb(score) {
  const rgb = hexToRgb(getScoreColor(num(score, 0)));
  return [rgb.r, rgb.g, rgb.b];
}

function getScoreLabel(score) {
  const s = num(score, 0);
  if (s >= 90) return 'Excellent';
  if (s >= 70) return 'Bon';
  if (s >= 50) return 'Acceptable';
  if (s >= 30) return 'Mauvais';
  return 'Critique';
}

function statusFromScore(score) {
  const s = num(score, 0);
  if (s >= 75) return 'OK';
  if (s >= 50) return 'A ameliorer';
  return 'Critique';
}

function statusColor(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('ok') || s.includes('bon') || s.includes('actif') || s.includes('present')) return [34, 197, 94];
  if (s.includes('ameliorer') || s.includes('moyen') || s.includes('avertissement') || s.includes('partiel')) return [234, 179, 8];
  if (s.includes('n/a')) return [148, 163, 184];
  return [239, 68, 68];
}

function normalizeHeaderLabel(header) {
  if (typeof header === 'string') return { header, message: '' };
  return {
    header: header?.header || header?.label || 'Header',
    message: header?.message || '',
  };
}

function normalizeRecommendation(rec = {}) {
  const title = rec.title || rec.label || rec.name || rec.action || 'Correction recommandee';
  return {
    priority: rec.priority || 'IMPORTANT',
    category: rec.category || rec.categorie || 'general',
    title,
    description: rec.description || rec.explication || '',
    impact: rec.impact || '',
    impactBusiness: rec.impactBusiness || rec.impact_business || '',
    action: rec.action || title,
    howTo: rec.comment_implémenter || rec.comment_implementer || '',
    difficulty: rec.difficulty || rec.difficulte || getFaultDifficultyPdf(rec.faultType),
    time: rec.time || rec.temps || getFaultTimePdf(rec.faultType),
    faultType: rec.faultType || 'default',
  };
}

const PDF_FAULT_TIME_MAP = {
  ssl_expired: '10 minutes', ssl_misconfigured: '20 minutes', hsts_missing: '15 minutes',
  csp_missing: '30 minutes', xframe_missing: '10 minutes', xcontent_missing: '10 minutes',
  mixed_content: '45 minutes', images_unoptimized: '20 minutes', cache_missing: '15 minutes',
  gzip_disabled: '10 minutes', js_render_blocking: '1 heure', css_render_blocking: '45 minutes',
  meta_title_missing: '5 minutes', meta_description_missing: '5 minutes', h1_missing: '5 minutes',
  alt_missing: '15 minutes', sitemap_missing: '20 minutes', robots_missing: '10 minutes',
  xss_vulnerability: '2 a 4 heures', sql_injection: '3 a 6 heures',
  wordpress_outdated: '15 minutes', plugin_outdated: '10 minutes',
  no_https_redirect: '15 minutes', mobile_not_responsive: '2 a 8 heures',
  malware: '4 a 8 heures', https_missing: '30 minutes', headers_missing: '30 a 60 minutes',
  sensitive_files: '1 a 2 heures', lcp_slow: '2 a 4 heures', cls_unstable: '1 a 2 heures',
  page_weight_heavy: '2 a 3 heures', open_graph_missing: '20 minutes',
  canonical_missing: '15 minutes', h1_multiple: '15 minutes', default: '30 minutes',
};

const PDF_FAULT_DIFFICULTY_MAP = {
  ssl_expired: 'Facile', ssl_misconfigured: 'Intermediaire', hsts_missing: 'Technique',
  csp_missing: 'Technique', xframe_missing: 'Intermediaire', xcontent_missing: 'Intermediaire',
  mixed_content: 'Intermediaire', images_unoptimized: 'Facile', cache_missing: 'Intermediaire',
  gzip_disabled: 'Intermediaire', js_render_blocking: 'Technique', css_render_blocking: 'Technique',
  meta_title_missing: 'Facile', meta_description_missing: 'Facile', h1_missing: 'Facile',
  alt_missing: 'Facile', sitemap_missing: 'Facile', robots_missing: 'Intermediaire',
  xss_vulnerability: 'Expert', sql_injection: 'Expert', wordpress_outdated: 'Facile',
  plugin_outdated: 'Facile', no_https_redirect: 'Intermediaire', mobile_not_responsive: 'Expert',
  malware: 'Expert', https_missing: 'Intermediaire', headers_missing: 'Intermediaire',
  sensitive_files: 'Intermediaire', lcp_slow: 'Technique', cls_unstable: 'Intermediaire',
  page_weight_heavy: 'Intermediaire', open_graph_missing: 'Facile', canonical_missing: 'Facile',
  h1_multiple: 'Facile', default: 'Intermediaire',
};

function getFaultTimePdf(faultType) {
  return PDF_FAULT_TIME_MAP[faultType] || PDF_FAULT_TIME_MAP.default;
}

function getFaultDifficultyPdf(faultType) {
  return PDF_FAULT_DIFFICULTY_MAP[faultType] || PDF_FAULT_DIFFICULTY_MAP.default;
}

function getDifficultyColor(difficulty) {
  const d = String(difficulty || '').toLowerCase();
  if (d.includes('facile')) return [0, 196, 140];
  if (d.includes('intermediaire') || d.includes('intermédiaire')) return [255, 184, 0];
  if (d.includes('technique')) return [255, 107, 53];
  if (d.includes('expert')) return [255, 59, 59];
  return [0, 212, 255];
}

function normalizeScores(scan) {
  const scores = scan.scores || {};
  const metrics = scan.metrics || {};
  const uxScore = num(scores.ux, num(scores.ux_mobile, num(metrics.ux?.accessibility_score, null)));
  const global = num(scan.global_score, num(scores.global, 0));

  return {
    global,
    performance: num(scores.performance, null),
    security: num(scores.security, null),
    seo: num(scores.seo, null),
    ux: uxScore,
    ux_mobile: uxScore,
  };
}

function normalizePerformance(scan, scores) {
  const metrics = scan.metrics?.performance || {};
  const legacy = scan.performance || {};
  const cwv = legacy.core_web_vitals || {};

  const lcp = num(metrics.lcp, num(cwv.lcp?.value, null));
  const fcp = num(metrics.fcp, num(cwv.fcp?.value, null));
  const cls = num(metrics.cls, num(cwv.cls?.value, null));
  const tbt = num(metrics.tbt, null);
  const tti = num(metrics.tti, null);
  const pageWeight = num(metrics.page_weight_mb, num(legacy.poids_page_mb, null));
  const partial = Boolean(metrics.partial ?? legacy.partial);

  return {
    raw: metrics,
    serverLocation: metrics.server_location || legacy.server_location || null,
    opportunities: normalizeList(metrics.opportunities || legacy.opportunities),
    metrics: [
      { label: 'Score Performance', value: scores.performance != null ? `${scores.performance}/100` : 'N/A', status: statusFromScore(scores.performance), explanation: 'Score de vitesse et stabilite mesure par Webisafe et PageSpeed quand disponible.' },
      { label: 'LCP', value: lcp != null ? `${Math.round(lcp)} ms` : 'N/A', status: lcp == null ? 'N/A' : lcp <= 2500 ? 'OK' : lcp <= 4000 ? 'A ameliorer' : 'Critique', explanation: 'Largest Contentful Paint : moment ou le contenu principal devient visible. Objectif : moins de 2500 ms.' },
      { label: 'FCP', value: fcp != null ? `${Math.round(fcp)} ms` : 'N/A', status: fcp == null ? 'N/A' : fcp <= 1800 ? 'OK' : fcp <= 3000 ? 'A ameliorer' : 'Critique', explanation: 'First Contentful Paint : premier affichage visible. Plus il est bas, plus le site semble rapide.' },
      { label: 'CLS', value: cls != null ? cls.toFixed(3) : 'N/A', status: cls == null ? 'N/A' : cls <= 0.1 ? 'OK' : cls <= 0.25 ? 'A ameliorer' : 'Critique', explanation: 'Cumulative Layout Shift : stabilite visuelle de la page. Objectif : moins de 0.1.' },
      { label: 'TBT', value: tbt != null ? `${Math.round(tbt)} ms` : 'N/A', status: tbt == null ? 'N/A' : tbt <= 200 ? 'OK' : tbt <= 600 ? 'A ameliorer' : 'Critique', explanation: 'Total Blocking Time : temps pendant lequel la page repond mal aux interactions.' },
      { label: 'TTI', value: tti != null ? `${Math.round(tti)} ms` : 'N/A', status: tti == null ? 'N/A' : tti <= 3800 ? 'OK' : tti <= 7300 ? 'A ameliorer' : 'Critique', explanation: 'Time To Interactive : moment ou la page devient vraiment utilisable.' },
      { label: 'Poids page', value: pageWeight != null ? `${pageWeight} MB` : 'N/A', status: pageWeight == null ? 'N/A' : pageWeight <= 2 ? 'OK' : pageWeight <= 4 ? 'A ameliorer' : 'Critique', explanation: 'Poids total charge. Sur mobile, chaque Mo supplementaire augmente les abandons.' },
      { label: 'Mode du scan', value: partial ? 'Partiel / fallback TTFB' : 'Complet', status: partial ? 'Partiel' : 'OK', explanation: partial ? `PageSpeed a echoue ou expire. Raison : ${metrics.partial_reason || 'fallback active'}.` : 'Les mesures principales ont ete collectees normalement.' },
    ],
  };
}

function normalizeSecurity(scan, scores) {
  const metrics = scan.metrics?.security || {};
  const legacy = scan.security || {};
  const malware = metrics.malware_detected ?? legacy.malware;
  const sslGrade = metrics.ssl_grade ?? legacy.ssl_grade ?? 'N/A';
  const securityGrade = metrics.security_grade ?? legacy.security_grade ?? 'N/A';
  const observatory = metrics.observatory_score ?? legacy.observatory_score;
  const missingHeaders = normalizeList(metrics.headers_manquants ?? legacy.headers_manquants).map(normalizeHeaderLabel);
  const cookieIssues = normalizeList(metrics.cookie_issues ?? legacy.cookie_issues);
  const sensitiveFiles = metrics.sensitive_files ?? legacy.sensitive_files ?? null;

  return {
    raw: metrics,
    missingHeaders,
    cookieIssues,
    sensitiveFiles,
    sslDetails: metrics.ssl_details || legacy.ssl_details || null,
    metrics: [
      { label: 'Score Securite', value: scores.security != null ? `${scores.security}/100` : 'N/A', status: statusFromScore(scores.security), explanation: 'Score global des protections detectees : HTTPS, headers, reputation et signaux de risque.' },
      { label: 'SSL Grade', value: sslGrade, status: ['A+', 'A'].includes(sslGrade) ? 'OK' : sslGrade === 'B' ? 'A ameliorer' : sslGrade === 'N/A' ? 'N/A' : 'Critique', explanation: 'Qualite du chiffrement HTTPS et de la configuration TLS.' },
      { label: 'Grade Headers', value: securityGrade, status: ['A+', 'A', 'B'].includes(securityGrade) ? 'OK' : securityGrade === 'N/A' ? 'N/A' : 'A ameliorer', explanation: 'Evaluation des headers de securite qui reduisent les risques XSS, clickjacking et fuite de donnees.' },
      { label: 'Malware (VirusTotal)', value: malware === true ? 'Detecte' : malware === false ? 'Aucun' : 'N/A', status: malware === true ? 'Critique' : malware === false ? 'OK' : 'N/A', explanation: 'Verification de reputation. Un signal malware peut bloquer la confiance et le trafic.' },
      { label: 'Observatory (Mozilla)', value: observatory != null ? `${observatory}/100` : 'N/A', status: observatory == null ? 'N/A' : statusFromScore(observatory), explanation: 'Signal externe utile pour juger la robustesse des protections HTTP.' },
    ],
  };
}

function normalizeSeo(scan, scores) {
  const metrics = scan.metrics?.seo || {};
  const legacy = scan.seo || {};
  const hasTitle = metrics.has_title ?? legacy.meta_tags_ok;
  const hasDescription = metrics.has_description ?? legacy.meta_tags_ok;
  const h1Count = metrics.h1_count;
  const hasViewport = metrics.has_viewport ?? legacy.indexed;
  const hasOpenGraph = metrics.has_open_graph ?? legacy.open_graph;

  return {
    raw: metrics,
    metrics: [
      { label: 'Score SEO', value: scores.seo != null ? `${scores.seo}/100` : 'N/A', status: statusFromScore(scores.seo), explanation: 'Score technique de visibilite : balises, structure, indexabilite et partage.' },
      { label: 'Title', value: boolLabel(hasTitle, 'Present', 'Absent'), status: hasTitle ? 'OK' : 'Critique', explanation: 'Le title aide Google et les visiteurs a comprendre la page.' },
      { label: 'Meta Description', value: boolLabel(hasDescription, 'Presente', 'Absente'), status: hasDescription ? 'OK' : 'Critique', explanation: 'La meta description influence le taux de clic dans les resultats Google.' },
      { label: 'H1', value: h1Count != null ? `${h1Count}` : 'N/A', status: h1Count == null ? 'N/A' : h1Count === 1 ? 'OK' : h1Count === 0 ? 'Critique' : 'A ameliorer', explanation: 'Une page doit generalement avoir un H1 unique et descriptif.' },
      { label: 'Viewport', value: boolLabel(hasViewport, 'OK', 'Absent'), status: hasViewport ? 'OK' : 'Critique', explanation: 'Indispensable pour un affichage mobile correct.' },
      { label: 'Open Graph', value: boolLabel(hasOpenGraph, 'Present', 'Absent'), status: hasOpenGraph ? 'OK' : 'A ameliorer', explanation: 'Controle l apparence du lien lorsqu il est partage sur les reseaux sociaux.' },
    ],
  };
}

function normalizeUx(scan, scores) {
  const metrics = scan.metrics?.ux || {};
  const legacy = scan.ux || {};
  const tapTargets = metrics.tap_targets_ok ?? legacy.elements_tactiles_ok;
  const issues = normalizeList(metrics.issues ?? legacy.issues);

  return {
    raw: metrics,
    issues,
    metrics: [
      { label: 'Score UX', value: scores.ux != null ? `${scores.ux}/100` : 'N/A', status: statusFromScore(scores.ux), explanation: 'Evaluation de l experience mobile : confort, accessibilite et facilite d interaction.' },
      { label: 'Grade UX', value: metrics.grade ?? legacy.grade ?? 'N/A', status: ['A+', 'A', 'B'].includes(metrics.grade ?? legacy.grade) ? 'OK' : 'A ameliorer', explanation: 'Synthese rapide de la qualite mobile.' },
      { label: 'Tap targets', value: tapTargets === true ? 'OK' : tapTargets === false ? 'A ameliorer' : 'N/A', status: tapTargets === true ? 'OK' : tapTargets === false ? 'A ameliorer' : 'N/A', explanation: 'Les boutons doivent etre assez grands et espaces pour les doigts sur smartphone.' },
    ],
  };
}

function normalizeScanOrigin(scan) {
  const origin = scan.scan_origin || scan.scanOrigin || {};
  return {
    region_code: origin.region_code || scan.scan_region || 'standard',
    region_name: origin.region_name || '',
    city: origin.city || '',
    country: origin.country || '',
    continent: origin.continent || '',
    label: origin.label || (origin.region_code || scan.scan_region ? 'Mesure africaine' : 'Mesure standard Webisafe'),
    note: origin.note || '',
  };
}

function buildExecutiveSummary(model) {
  const score = model.scores.global;
  const domain = model.domain;
  const perf = model.scores.performance;
  const sec = model.scores.security;
  const seo = model.scores.seo;
  const ux = model.scores.ux;
  const alerts = model.criticalAlerts.length;

  const opener =
    score >= 80
      ? `Le site ${domain} presente une base solide avec un score global de ${score}/100.`
      : score >= 60
        ? `Le site ${domain} fonctionne, mais son score de ${score}/100 montre plusieurs freins importants.`
        : `Le site ${domain} demande une correction prioritaire : le score de ${score}/100 indique des risques visibles pour la confiance, la vitesse et la conversion.`;

  const details = [
    `Performance : ${perf ?? 'N/A'}/100. Les mesures de chargement, notamment LCP, FCP, CLS, TBT, TTI et poids de page, indiquent le ressenti concret d'un visiteur mobile.`,
    `Securite : ${sec ?? 'N/A'}/100. Le rapport verifie HTTPS, SSL, headers, malware, fichiers sensibles et signaux externes disponibles.`,
    `SEO : ${seo ?? 'N/A'}/100. Les balises title, meta description, H1, viewport et Open Graph influencent la visibilite et le taux de clic.`,
    `UX Mobile : ${ux ?? 'N/A'}/100. Les problemes de boutons tactiles, accessibilite ou lisibilite peuvent bloquer les visiteurs sur smartphone.`,
  ];

  if (alerts > 0) {
    details.push(`${alerts} alerte(s) critique(s) ou avertissement(s) doivent etre traitees avant les optimisations secondaires.`);
  }

  return [opener, ...details].join(' ');
}

export function buildPdfAuditModel(scan = {}) {
  const domain = t(extractDomain(scan.url || scan.domain || ''), 'site');
  const scores = normalizeScores(scan);
  const recommendations = normalizeList(scan.recommendations || scan.ai_analysis?.recommandations_prioritaires).map(normalizeRecommendation);
  const scanOrigin = normalizeScanOrigin(scan);

  const model = {
    raw: scan,
    domain,
    url: scan.url || scan.domain || '',
    scanDate: scan.scanDate || scan.created_at || null,
    scanOrigin,
    scores,
    grade: scan.grade || getScoreLabel(scores.global),
    criticalAlerts: normalizeList(scan.critical_alerts),
    sections: {
      performance: normalizePerformance(scan, scores),
      security: normalizeSecurity(scan, scores),
      seo: normalizeSeo(scan, scores),
      ux: normalizeUx(scan, scores),
    },
    recommendations,
    narrative: {
      title: 'Ce que revele votre audit premium',
      paragraphs: buildPremiumExplanationParagraphs(recommendations).map((paragraph) => t(paragraph, '')),
    },
  };

  model.executiveSummary = scan.summary?.resume_executif
    ? t(scan.summary.resume_executif)
    : buildExecutiveSummary(model);

  return model;
}

const BLUE = [21, 102, 240];
const DARK_BG = [13, 27, 42];
const PANEL = [15, 30, 55];
const PANEL_ALT = [20, 40, 70];
const WHITE = [255, 255, 255];
const GRAY = [148, 163, 184];
const LIGHT = [226, 232, 240];
const GREEN = [34, 197, 94];
const YELLOW = [234, 179, 8];
const RED = [239, 68, 68];

function drawBackground(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
}

function drawLogo(doc, x, y) {
  doc.setFillColor(...BLUE);
  doc.roundedRect(x, y, 10, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('W', x + 5, y + 7, { align: 'center' });
}

function addHeader(doc, title, domain) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 8, 'F');
  doc.setTextColor(219, 234, 254);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${t(title)} - ${t(domain)}`, pageWidth / 2, 5.5, { align: 'center' });
}

function addFooter(doc, pageNum, totalPages, domain) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...DARK_BG);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, pageHeight - 12, pageWidth, 1, 'F');
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Webisafe - Audit de ${t(domain)}`, 18, pageHeight - 5);
  doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - 18, pageHeight - 5, { align: 'right' });
  doc.text('webisafe.tech', pageWidth / 2, pageHeight - 5, { align: 'center' });
}

function sectionTitle(doc, title, y, margin = 18) {
  doc.setFillColor(...BLUE);
  doc.rect(margin, y, 3, 8, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(t(title), margin + 7, y + 6);
  return y + 13;
}

function paragraphBlock(doc, title, text, x, y, w, options = {}) {
  const lines = doc.splitTextToSize(t(text), w - 12);
  const maxLines = options.maxLines || lines.length;
  const used = lines.slice(0, maxLines);
  const h = 14 + used.length * 4.5;
  doc.setFillColor(...(options.fill || PANEL));
  doc.roundedRect(x, y, w, h, 3, 3, 'F');
  doc.setFillColor(...(options.accent || BLUE));
  doc.roundedRect(x, y, 2, h, 1, 1, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(options.titleSize || 9);
  doc.text(t(title), x + 6, y + 8);
  doc.setTextColor(...(options.textColor || LIGHT));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(options.fontSize || 7.5);
  used.forEach((line, index) => {
    doc.text(line, x + 6, y + 15 + index * 4.5);
  });
  return y + h + 5;
}

function scoreCard(doc, x, y, w, label, score) {
  const color = scoreRgb(score);
  doc.setFillColor(...PANEL);
  doc.roundedRect(x, y, w, 26, 3, 3, 'F');
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, 2, 1, 1, 'F');
  doc.setTextColor(...color);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(score != null ? `${score}` : 'N/A', x + w / 2, y + 12, { align: 'center' });
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(t(label), x + w / 2, y + 20, { align: 'center' });
}

function drawMetricCards(doc, items, x, y, w) {
  const cardW = (w - 6) / 4;
  items.slice(0, 4).forEach((item, index) => {
    const cardX = x + index * (cardW + 2);
    const color = statusColor(item.status);
    doc.setFillColor(...PANEL);
    doc.roundedRect(cardX, y, cardW, 20, 2, 2, 'F');
    doc.setFillColor(...color);
    doc.roundedRect(cardX, y, cardW, 2, 1, 1, 'F');
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(t(item.value), cardX + cardW / 2, y + 9, { align: 'center' });
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.text(t(item.label), cardX + cardW / 2, y + 15.5, { align: 'center' });
  });
  return y + 25;
}

function drawTable(doc, y, head, body, margin = 18) {
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [head.map((item) => t(item))],
    body: body.map((row) => row.map((cell) => t(cell))),
    headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.2, textColor: LIGHT, fillColor: PANEL, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: PANEL_ALT },
    styles: { overflow: 'linebreak', lineColor: [30, 58, 95], lineWidth: 0.1 },
  });
  return doc.lastAutoTable.finalY + 9;
}

function addNewPage(doc, model, pageNum, totalPages, title) {
  doc.addPage();
  drawBackground(doc);
  addHeader(doc, title, model.domain);
  addFooter(doc, pageNum, totalPages, model.domain);
  return 18;
}

function downloadPdfBlob(doc, filename) {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatScanDate(model) {
  try {
    return model.scanDate ? formatDate(model.scanDate) : formatDate(new Date().toISOString());
  } catch {
    return new Date().toLocaleDateString('fr-FR');
  }
}

function drawCover(doc, model, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  drawBackground(doc);

  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 68, 'F');
  doc.setFillColor(10, 60, 160);
  doc.rect(0, 0, pageWidth / 2, 68, 'F');

  drawLogo(doc, margin, 15);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Webi', margin + 14, 23);
  doc.setTextColor(147, 197, 253);
  doc.text('safe', margin + 14 + doc.getTextWidth('Webi'), 23);
  doc.setTextColor(219, 234, 254);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Audit Web Professionnel', margin + 14, 30);

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(25);
  doc.text("Rapport d'Audit Premium", pageWidth / 2, 49, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(186, 230, 253);
  doc.text(model.domain, pageWidth / 2, 60, { align: 'center' });

  const centerY = 110;
  const bigR = 28;
  const rgb = scoreRgb(model.scores.global);
  doc.setFillColor(rgb[0] * 0.18, rgb[1] * 0.18, rgb[2] * 0.18);
  doc.circle(pageWidth / 2, centerY, bigR + 8, 'F');
  doc.setFillColor(...rgb);
  doc.circle(pageWidth / 2, centerY, bigR, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text(`${model.scores.global}`, pageWidth / 2, centerY + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.text('/100', pageWidth / 2, centerY + 14, { align: 'center' });
  doc.setTextColor(...rgb);
  doc.setFontSize(12);
  doc.text(getScoreLabel(model.scores.global).toUpperCase(), pageWidth / 2, centerY + 41, { align: 'center' });

  const cards = [
    ['Performance', model.scores.performance],
    ['Securite', model.scores.security],
    ['SEO', model.scores.seo],
    ['UX Mobile', model.scores.ux],
  ];
  const cardY = 165;
  const cardW = (contentWidth - 9) / 4;
  cards.forEach(([label, score], index) => {
    scoreCard(doc, margin + index * (cardW + 3), cardY, cardW, label, score);
  });

  let y = 207;
  y = paragraphBlock(
    doc,
    'Contexte de mesure',
    `${model.scanOrigin.label} : ${model.scanOrigin.city || 'region'} ${model.scanOrigin.country || ''} (${model.scanOrigin.region_code}). ${model.scanOrigin.note || 'Les mesures locales de disponibilite et de latence utilisent le point de scan Webisafe disponible.'}`,
    margin,
    y,
    contentWidth,
    { maxLines: 4, accent: GREEN }
  );
  y = paragraphBlock(doc, 'Synthese executive', model.executiveSummary, margin, y, contentWidth, { maxLines: 8 });

  doc.setFillColor(...PANEL);
  doc.roundedRect(margin, pageHeight - 38, contentWidth, 18, 3, 3, 'F');
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Site analyse : ${t(model.url || model.domain)}`, margin + 5, pageHeight - 31);
  doc.text(`Date : ${t(formatScanDate(model))}`, margin + 5, pageHeight - 24);
  doc.text('Genere par Webisafe - webisafe.tech', pageWidth - margin - 5, pageHeight - 28, { align: 'right' });
  addFooter(doc, 1, totalPages, model.domain);
}

function drawAlertsAndNarrative(doc, model, pageNum, totalPages) {
  const margin = 18;
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = addNewPage(doc, model, pageNum, totalPages, 'Lecture experte');
  y = sectionTitle(doc, 'Alertes et lecture experte', y, margin);

  if (model.criticalAlerts.length > 0) {
    model.criticalAlerts.forEach((alert) => {
      const text = [alert.message, alert.impact ? `Impact : ${alert.impact}` : '', alert.recommendation ? `Conseil : ${alert.recommendation}` : ''].filter(Boolean).join(' ');
      y = paragraphBlock(doc, alert.title || 'Alerte', text, margin, y, contentWidth, {
        accent: String(alert.severity).toLowerCase() === 'critical' ? RED : YELLOW,
        maxLines: 4,
      });
    });
  } else {
    y = paragraphBlock(doc, 'Aucune alerte critique', 'Aucune alerte critique prioritaire n a ete remontee par le scan.', margin, y, contentWidth, { accent: GREEN });
  }

  y += 2;
  y = sectionTitle(doc, model.narrative.title, y, margin);
  model.narrative.paragraphs.forEach((paragraph, index) => {
    if (y > pageHeight - 58) {
      y = addNewPage(doc, model, pageNum, totalPages, 'Lecture experte - suite');
    }
    y = paragraphBlock(doc, index === 0 ? 'Vue globale' : `Point ${index}`, paragraph, margin, y, contentWidth, { maxLines: index === 0 ? 8 : 10 });
  });
}

function drawPerformanceSecurity(doc, model, pageNum, totalPages) {
  const margin = 18;
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = addNewPage(doc, model, pageNum, totalPages, 'Performance et securite');

  y = sectionTitle(doc, 'Performance', y, margin);
  y = drawMetricCards(doc, model.sections.performance.metrics, margin, y, contentWidth);
  y = drawTable(
    doc,
    y,
    ['Metrique', 'Valeur', 'Statut', 'Explication'],
    model.sections.performance.metrics.map((item) => [item.label, item.value, item.status, item.explanation]),
    margin
  );

  const server = model.sections.performance.serverLocation;
  if (server) {
    const serverText = [
      `Serveur : ${server.city || 'N/A'}, ${server.country || 'N/A'}`,
      server.isp ? `ISP : ${server.isp}` : '',
      server.ip ? `IP : ${server.ip}` : '',
      server.latency_warning?.message || '',
      server.latency_warning?.impact ? `Impact : ${server.latency_warning.impact}` : '',
      server.latency_warning?.recommendation ? `Conseil : ${server.latency_warning.recommendation}` : '',
    ].filter(Boolean).join(' ');
    y = paragraphBlock(doc, 'Localisation serveur', serverText, margin, y, contentWidth, {
      accent: server.latency_warning?.warning ? YELLOW : GREEN,
      maxLines: 6,
    });
  }

  if (model.sections.performance.opportunities.length > 0) {
    y = drawTable(
      doc,
      y,
      ['Optimisation PageSpeed', 'Description', 'Gain estime'],
      model.sections.performance.opportunities.slice(0, 5).map((op) => [
        op.title,
        op.description || '',
        op.savings_ms != null ? `~${Math.round(op.savings_ms)} ms` : 'N/A',
      ]),
      margin
    );
  }

  if (y > pageHeight - 95) {
    y = addNewPage(doc, model, pageNum, totalPages, 'Securite - suite');
  }

  y = sectionTitle(doc, 'Securite', y, margin);
  y = drawMetricCards(doc, model.sections.security.metrics, margin, y, contentWidth);
  y = drawTable(
    doc,
    y,
    ['Controle', 'Resultat', 'Statut', 'Explication'],
    model.sections.security.metrics.map((item) => [item.label, item.value, item.status, item.explanation]),
    margin
  );

  if (model.sections.security.missingHeaders.length > 0) {
    y = drawTable(
      doc,
      y,
      ['Header manquant', 'Message'],
      model.sections.security.missingHeaders.map((item) => [item.header, item.message || 'Protection absente ou incomplete']),
      margin
    );
  }

  if (model.sections.security.sensitiveFiles?.critical) {
    const files = normalizeList(model.sections.security.sensitiveFiles.exposed_files).join(', ');
    y = paragraphBlock(doc, 'Fichiers sensibles exposes', `${model.sections.security.sensitiveFiles.alert_message || 'Fichiers sensibles detectes.'} Fichiers : ${files || 'N/A'}`, margin, y, contentWidth, { accent: RED, maxLines: 5 });
  }

  if (model.sections.security.cookieIssues.length > 0) {
    y = drawTable(doc, y, ['Probleme cookie'], model.sections.security.cookieIssues.map((item) => [item]), margin);
  }
}

function drawSeoUx(doc, model, pageNum, totalPages) {
  const margin = 18;
  const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = addNewPage(doc, model, pageNum, totalPages, 'SEO et UX mobile');

  y = sectionTitle(doc, 'SEO - Referencement', y, margin);
  y = drawMetricCards(doc, model.sections.seo.metrics, margin, y, contentWidth);
  y = drawTable(
    doc,
    y,
    ['Critere SEO', 'Resultat', 'Statut', 'Explication business'],
    model.sections.seo.metrics.map((item) => [item.label, item.value, item.status, item.explanation]),
    margin
  );

  y = sectionTitle(doc, 'UX Mobile', y, margin);
  y = drawMetricCards(doc, model.sections.ux.metrics, margin, y, contentWidth);
  y = drawTable(
    doc,
    y,
    ['Critere UX', 'Resultat', 'Statut', 'Explication business'],
    model.sections.ux.metrics.map((item) => [item.label, item.value, item.status, item.explanation]),
    margin
  );

  if (model.sections.ux.issues.length > 0) {
    y = drawTable(
      doc,
      y,
      ['Probleme detecte', 'Severite', 'Impact', 'Code'],
      model.sections.ux.issues.map((issue) => [issue.message, issue.severity || 'info', issue.impact || '', issue.type || '']),
      margin
    );
  }
}

function drawRecommendations(doc, model, pageNum, totalPages) {
  const margin = 18;
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = addNewPage(doc, model, pageNum, totalPages, "Plan d'action");
  y = sectionTitle(doc, "Plan d'action recommande", y, margin);

  if (model.recommendations.length === 0) {
    paragraphBlock(doc, 'Aucune recommandation', 'Aucune recommandation detaillee n est disponible pour ce scan.', margin, y, contentWidth);
    return;
  }

  model.recommendations.forEach((rec, index) => {
    if (y > pageHeight - 90) {
      y = addNewPage(doc, model, pageNum, totalPages, "Plan d'action - suite");
    }

    const accent = rec.priority === 'CRITIQUE' ? RED : rec.priority === 'AMELIORATION' ? GREEN : YELLOW;
    const diffColor = getDifficultyColor(rec.difficulty);
    const timeStr = t(rec.time, '30 minutes');
    const diffStr = t(rec.difficulty, 'Intermediaire');

    const blockH = 14;
    doc.setFillColor(0, 30, 60);
    doc.roundedRect(margin, y, contentWidth, blockH, 2, 2, 'F');
    doc.setFillColor(0, 212, 255);
    doc.roundedRect(margin, y, 2, blockH, 1, 1, 'F');

    doc.setTextColor(0, 212, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`Temps estime : ${timeStr}`, margin + 6, y + 5.5);

    doc.setFillColor(...diffColor);
    const diffLabel = `Difficulte : ${diffStr}`;
    const diffLabelW = doc.getTextWidth(diffLabel) + 6;
    const diffX = margin + 6 + doc.getTextWidth(`Temps estime : ${timeStr}`) + 16;
    doc.roundedRect(diffX, y + 2, diffLabelW, 9, 1, 1, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(diffLabel, diffX + 3, y + 7.5);

    y += blockH + 2;

    const body = [
      rec.description,
      rec.impact ? `Impact : ${rec.impact}` : '',
      rec.impactBusiness ? `Impact business : ${rec.impactBusiness}` : '',
      `Action : ${rec.action}`,
      rec.howTo ? `Comment : ${rec.howTo}` : '',
    ].filter(Boolean).join(' ');
    y = paragraphBlock(doc, `${index + 1}. ${rec.title}`, body, margin, y, contentWidth, { accent, maxLines: 10 });
  });

  y = Math.min(y + 4, pageHeight - 42);
  doc.setFillColor(...BLUE);
  doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("Besoin d'aide pour corriger ces problemes ?", margin + contentWidth / 2, y + 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Webisafe peut prioriser, corriger et recontroler votre site avec un rescan offert dans 30 jours.', margin + contentWidth / 2, y + 15, { align: 'center' });
}

export function generatePDF(reportData) {
  const model = buildPdfAuditModel(reportData);
  const doc = new jsPDF('p', 'mm', 'a4');
  const totalPages = 5;
  const filename = buildPdfFilename({
    domain: model.domain,
    scanDate: model.scanDate,
  });

  drawCover(doc, model, totalPages);
  drawAlertsAndNarrative(doc, model, 2, totalPages);
  drawPerformanceSecurity(doc, model, 3, totalPages);
  drawSeoUx(doc, model, 4, totalPages);
  drawRecommendations(doc, model, 5, totalPages);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    downloadPdfBlob(doc, filename);
  } else {
    doc.save(filename);
  }

  return filename;
}
