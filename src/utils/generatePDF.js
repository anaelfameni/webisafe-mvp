import React from 'react';
import { Document, Link, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { formatDate, extractDomain } from './validators.js';
import { REPORT_FIX_PHONE, REPORT_FIX_PHONE_RAW } from '../config/brand.js';
import { buildPremiumExplanationParagraphs } from './premiumExplanation.js';

export function sanitizePdfText(value) {
  const source = String(value ?? '');
  return source
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function t(value, fallback = 'N/A') { const text = sanitizePdfText(value); return text || fallback; }
function num(value, fallback = null) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function boolLabel(v, yes = 'Oui', no = 'Non') { if (v === true) return yes; if (v === false) return no; return 'N/A'; }
function normalizeList(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }

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

const WEBISAFE_URL = 'https://webisafe.vercel.app';
const CORRECTION_URL = `${WEBISAFE_URL}/corrections`;
const WHATSAPP_URL = `https://wa.me/${REPORT_FIX_PHONE_RAW}?text=${encodeURIComponent("Bonjour Webisafe, je souhaite corriger les problemes identifies dans mon rapport d'audit.")}`;

function buildPremiumExplanation(paragraphs) {
  const text = Array.isArray(paragraphs) ? paragraphs.join(' ') : String(paragraphs ?? '');
  const clean = text.replace(/\[.*?\]/g, '').replace(/https?:\/\/[^\s]+/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 300);
  if (sentences.length === 0) return ['Ce site presente un potentiel interessant mais plusieurs points techniques meritent attention.'];
  const unique = []; const seen = new Set();
  for (const sentence of sentences) { const key = sentence.toLowerCase().slice(0, 40); if (!seen.has(key)) { seen.add(key); unique.push(sentence); } }
  return unique.slice(0, 4);
}

const RESOLUTION_TEMPLATES = {
  securite: "Corriger la configuration de securite concernee, activer les protections HTTP manquantes, renforcer les regles serveur et verifier ensuite que le risque detecte n'est plus exploitable.",
  security: "Corriger la configuration de securite concernee, activer les protections HTTP manquantes, renforcer les regles serveur et verifier ensuite que le risque detecte n'est plus exploitable.",
  performance: "Reduire les ressources trop lourdes, differer les scripts non essentiels, compresser les fichiers statiques et ajuster le cache afin de diminuer le temps d'affichage reel sur mobile.",
  seo: "Mettre a jour les balises, titres, descriptions, structure Hn et donnees de partage afin que Google comprenne mieux la page et que le lien soit plus attractif dans les resultats.",
  ux: "Adapter les tailles, espacements, contrastes et zones cliquables pour rendre la navigation plus confortable sur smartphone et reduire les abandons.",
  mobile: "Adapter les tailles, espacements, contrastes et zones cliquables pour rendre la navigation plus confortable sur smartphone et reduire les abandons.",
  default: "Identifier le reglage ou l'element responsable, appliquer la correction adaptee dans le code ou la configuration, puis refaire un scan pour confirmer la disparition du probleme.",
};

function firstSentence(text) { const txt = String(text ?? ''); const idx = txt.search(/[.!?](\s|$)/); if (idx === -1) return txt; return txt.slice(0, idx + 1).trim(); }
function resolutionFor(rec) { const cat = String(rec.category || 'default').toLowerCase().trim(); return RESOLUTION_TEMPLATES[cat] || RESOLUTION_TEMPLATES.default; }
function buildRecommendationBody(rec) {
  const intro = firstSentence(rec.description || rec.action || rec.title);
  const resolution = `Correction recommandee : ${resolutionFor(rec)}`;
  return { intro, resolution };
}

export function buildPdfAuditModel(reportData) {
  const r = reportData || {};
  const domain = t(r.domain || r.url, 'site inconnu');
  const url = t(r.url || r.domain, domain);
  const scanDate = r.scanDate || r.createdAt || new Date().toISOString();
  const city = r.scanOrigin?.city || r.city || '';
  const country = r.scanOrigin?.country || r.country || '';
  const originLabel = country ? `${city || ''}${city ? ', ' : ''}${country}`.trim() : city || 'Local';
  const globalScore = num(r.scores?.global ?? r.global_score, null);
  const perfScore = num(r.scores?.performance ?? r.scores?.speed ?? r.performance_score, null);
  const seoScore = num(r.scores?.seo ?? r.seo_score, null);
  const securityScore = num(r.scores?.security ?? r.scores?.securite ?? r.security_score, null);
  const uxScore = num(r.scores?.ux ?? r.scores?.mobile ?? r.ux_score ?? r.mobile_score, null);
  const recommendations = normalizeList(r.recommendations || r.actions).map((rec, i) => ({
    title: t(rec.title || rec.name || `Recommandation ${i + 1}`),
    description: t(rec.description || rec.details || rec.action || ''),
    category: t(rec.category || rec.type || 'general'),
    priority: t(rec.priority || rec.urgence || 'IMPORTANT'),
    time: t(rec.estimatedTime || rec.time || '30 minutes'),
    difficulty: t(rec.difficulty || rec.complexite || 'Intermediaire'),
    action: t(rec.action || rec.description || ''),
  }));
  const criticalAlerts = recommendations.filter(rec => rec.priority.toLowerCase().includes('critique') || rec.priority.toLowerCase().includes('urgent'));
  const loadTime = num(r.loadTime || r.load_time || r.metrics?.loadTime, null);
  const pageSize = num(r.pageSize || r.page_size || r.metrics?.pageSize, null);
  const requests = num(r.requests || r.metrics?.requests, null);
  const perfDetails = r.performanceDetails || r.performance || {};
  const resources = normalizeList(perfDetails.resources || perfDetails.files || r.resources);
  const hasHTTPS = !!(r.hasHTTPS || r.https || r.security?.https);
  const hasHSTS = !!(r.hasHSTS || r.hsts || r.security?.hsts);
  const hasXFrame = !!(r.hasXFrameOptions || r.xframe || r.security?.xframe);
  const hasXContent = !!(r.hasXContentTypeOptions || r.xcontent || r.security?.xcontent);
  const securityIssues = normalizeList(r.securityIssues || r.security?.issues || r.vulnerabilities);
  const seoDetails = r.seoDetails || r.seo || {};
  const metaTitle = t(seoDetails.title || r.metaTitle || r.title, 'Non defini');
  const metaDescription = t(seoDetails.description || r.metaDescription || r.description, 'Non definie');
  const headings = normalizeList(seoDetails.headings || r.headings);
  const hasCanonical = !!(seoDetails.canonical || r.canonical);
  const hasSitemap = !!(seoDetails.sitemap || r.sitemap);
  const hasRobots = !!(seoDetails.robots || r.robots);
  const ogTags = normalizeList(seoDetails.ogTags || r.ogTags || r.openGraph);
  const hasAnalytics = !!(r.hasAnalytics || r.analytics || r.tracking);
  const hasSchema = !!(r.hasSchema || r.schema || r.structuredData || r.microdata);
  const uxDetails = r.uxDetails || r.ux || r.mobile || {};
  const isResponsive = !!(uxDetails.isResponsive || r.isResponsive || r.responsive);
  const mobileScore = num(uxDetails.mobileScore || r.mobileScore, null);
  const viewport = t(uxDetails.viewport || r.viewport, 'Non configure');
  const fontSize = t(uxDetails.fontSize || r.fontSize, 'Non verifie');
  const tapTargets = t(uxDetails.tapTargets || r.tapTargets, 'Non verifie');
  const cms = t(r.cms || r.platform || r.detectedCMS || 'Non detecte');
  const server = t(r.server || r.serverType || r.serverSoftware || 'Non detecte');
  const serverLocation = {
    city: t(r.serverLocation?.city || r.serverCity || '', 'Inconnue'),
    country: t(r.serverLocation?.country || r.serverCountry || '', 'Inconnue'),
    ip: t(r.serverLocation?.ip || r.serverIP || '', 'Non disponible'),
    provider: t(r.serverLocation?.provider || r.hostingProvider || '', 'Non identifie'),
  };
  const serverGrade = r.serverGrade || r.server_grade || 'N/A';
  const technologies = normalizeList(r.technologies || r.techStack || r.detectedTech || r.tech);
  const cookies = num(r.cookies || r.cookieCount, null);
  const hasCookieConsent = boolLabel(r.hasCookieConsent || r.cookieConsent, 'Oui', 'Non');
  const sslInfo = {
    valid: boolLabel(r.ssl?.valid || r.hasSSL || r.ssl, 'Oui', 'Non'),
    issuer: t(r.ssl?.issuer || r.sslIssuer || '', 'Non identifie'),
    expiry: t(r.ssl?.expiry || r.sslExpiry || '', 'Non disponible'),
  };
  const seoSentences = buildPremiumExplanation(buildPremiumExplanationParagraphs(recommendations));
  return {
    domain, url, scanDate,
    scanOrigin: { label: originLabel, city, country },
    scores: { global: globalScore, performance: perfScore, seo: seoScore, security: securityScore, ux: uxScore },
    recommendations, criticalAlerts,
    sections: {
      performance: { loadTime, pageSize, requests, resources },
      security: { https: hasHTTPS, hsts: hasHSTS, xframe: hasXFrame, xcontent: hasXContent, issues: securityIssues },
      seo: { title: metaTitle, description: metaDescription, headings, canonical: hasCanonical, sitemap: hasSitemap, robots: hasRobots, ogTags, analytics: hasAnalytics, schema: hasSchema },
      ux: { responsive: isResponsive, mobileScore, viewport, fontSize, tapTargets },
      server: { cms, server, location: serverLocation, grade: serverGrade, technologies, ssl: sslInfo, cookies, cookieConsent: hasCookieConsent },
    },
    executiveSummary: seoSentences.join(' '),
  };
}

const h = React.createElement;

const C = {
  primary: '#1566F0',
  primaryLight: '#38BDF8',
  dark: '#0F172A',
  dark2: '#1E293B',
  border: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  light: '#1E293B',
  success: '#22C55E',
  warning: '#F97316',
  danger: '#EF4444',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  page: { padding: 34, backgroundColor: C.dark, color: C.text, fontFamily: 'Helvetica', fontSize: 9, lineHeight: 1.35 },
  cover: { padding: 0, backgroundColor: C.dark, color: C.white, fontFamily: 'Helvetica' },
  coverHero: { backgroundColor: C.dark, padding: 34, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: C.border },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  logo: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.primary, color: C.white, textAlign: 'center', paddingTop: 8, fontSize: 18, fontWeight: 700, marginRight: 9 },
  brand: { fontSize: 20, fontWeight: 700 },
  brandAccent: { color: C.primary },
  tagline: { fontSize: 8, color: '#DBEAFE', marginTop: 3 },
  coverTitle: { fontSize: 31, fontWeight: 700, marginBottom: 8, maxWidth: 470 },
  coverDomain: { fontSize: 14, color: '#DBEAFE', marginBottom: 18 },
  coverMeta: { flexDirection: 'row', gap: 8, marginTop: 8 },
  metaPill: { borderRadius: 999, backgroundColor: '#FFFFFF22', paddingVertical: 6, paddingHorizontal: 10, color: C.white, fontSize: 8 },
  coverBody: { padding: 34, paddingTop: 26 },
  scorePanel: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  scoreMain: { width: 135, borderRadius: 18, padding: 18, backgroundColor: C.light, borderWidth: 1, borderColor: C.border },
  scoreValue: { fontSize: 42, fontWeight: 700, color: C.primary, textAlign: 'center' },
  scoreLabel: { fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 3 },
  scoreGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  darkCard: { width: '48%', borderRadius: 14, padding: 12, backgroundColor: C.light, borderWidth: 1, borderColor: C.border },
  darkCardLabel: { fontSize: 8, color: '#BFDBFE', marginBottom: 6 },
  darkCardValue: { fontSize: 18, fontWeight: 700, color: C.white },
  summaryDark: { borderRadius: 16, padding: 15, backgroundColor: '#111827', borderWidth: 1, borderColor: '#334155' },
  summaryTitleDark: { fontSize: 11, fontWeight: 700, color: C.white, marginBottom: 8 },
  summaryTextDark: { fontSize: 9.3, color: '#E5E7EB' },
  summaryLead: { fontSize: 10.8, color: C.white, lineHeight: 1.35, marginBottom: 12 },
  summaryMetricTitle: { fontSize: 9.4, fontWeight: 700, color: C.primaryLight, marginTop: 8, marginBottom: 3 },
  summaryMetricText: { fontSize: 8.8, color: '#CBD5E1', lineHeight: 1.35 },
  header: { marginBottom: 18, paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between' },
  headerBrand: { color: C.primary, fontWeight: 700, fontSize: 10 },
  headerDomain: { color: C.muted, fontSize: 8, maxWidth: 230, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 18, left: 34, right: 34, color: '#94A3B8', fontSize: 7, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 7, flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: C.primary, marginBottom: 10 },
  sectionIntro: { fontSize: 9, color: C.muted, marginBottom: 12 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.light, padding: 13, marginBottom: 10 },
  cardTitle: { fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 7 },
  paragraph: { fontSize: 9, color: '#CBD5E1' },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metricCard: { flex: 1, borderRadius: 12, padding: 11, backgroundColor: C.light, borderWidth: 1, borderColor: C.border },
  metricLabel: { fontSize: 7.5, color: C.muted, marginBottom: 5 },
  metricValue: { fontSize: 13, fontWeight: 700 },
  table: { borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: 'hidden', marginBottom: 12, backgroundColor: C.light },
  tableHeader: { flexDirection: 'row', backgroundColor: C.primary },
  th: { color: C.white, fontSize: 7.5, fontWeight: 700, padding: 6 },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border },
  td: { fontSize: 7.3, color: '#CBD5E1', padding: 6 },
  recCard: { borderRadius: 13, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 10, backgroundColor: C.light, borderLeftWidth: 5 },
  recTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  recTitle: { fontSize: 10.5, fontWeight: 700, color: C.text, flex: 1 },
  recPriority: { fontSize: 7, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 999, backgroundColor: '#0F172A' },
  recIntro: { fontSize: 8.5, color: '#E2E8F0', marginBottom: 8, lineHeight: 1.35 },
  recCorrection: { fontSize: 8.4, color: '#CBD5E1', lineHeight: 1.35 },
  recMeta: { fontSize: 7.2, color: C.muted, marginTop: 7 },
  ctaPage: { padding: 42, backgroundColor: C.dark, color: C.white, fontFamily: 'Helvetica', justifyContent: 'center' },
  ctaCard: { borderRadius: 22, padding: 30, backgroundColor: '#111827', borderWidth: 1, borderColor: '#334155' },
  ctaEyebrow: { color: C.primaryLight, fontSize: 10, fontWeight: 700, marginBottom: 9 },
  ctaTitle: { fontSize: 26, fontWeight: 700, marginBottom: 12 },
  ctaText: { fontSize: 11, color: '#E5E7EB', marginBottom: 18 },
  ctaButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  ctaButton: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.primary, color: C.white, fontSize: 10, fontWeight: 700, textDecoration: 'none' },
  ctaButtonLight: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#22C55E', color: C.white, fontSize: 10, fontWeight: 700, textDecoration: 'none' },
});

function formatScanDate(model) {
  try { return model.scanDate ? formatDate(model.scanDate) : formatDate(new Date().toISOString()); }
  catch { return new Date().toLocaleDateString('fr-FR'); }
}

function PageFooter({ model }) {
  return h(View, { style: styles.footer, fixed: true },
    h(Text, null, `Webisafe - Audit de ${model.domain}`),
    h(Text, { render: ({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}` })
  );
}

function ReportPage({ model, title, children }) {
  return h(Page, { size: 'A4', style: styles.page, wrap: true },
    h(View, { style: styles.header, fixed: true },
      h(Text, { style: styles.headerBrand }, 'Webisafe'),
      h(Text, { style: styles.headerDomain }, `${title} - ${model.domain}`)
    ),
    children,
    h(PageFooter, { model })
  );
}

function MetricCard({ item }) {
  const color = getScoreColor(Number(String(item.value).replace(/[^0-9.]/g, '')));
  return h(View, { style: styles.metricCard },
    h(Text, { style: styles.metricLabel }, t(item.label, '')),
    h(Text, { style: [styles.metricValue, { color }] }, t(item.value, 'N/A')),
    h(Text, { style: { fontSize: 7, color: C.muted, marginTop: 4 } }, t(item.status, ''))
  );
}

function MetricsGrid({ metrics }) {
  return h(View, { style: styles.metricsRow }, ...metrics.slice(0, 4).map((item, index) => h(MetricCard, { key: `${item.label}-${index}`, item })));
}

function DataTable({ columns, rows, widths }) {
  return h(View, { style: styles.table, wrap: false },
    h(View, { style: styles.tableHeader }, ...columns.map((col, i) => h(Text, { key: col, style: [styles.th, { width: widths?.[i] || `${100 / columns.length}%` }] }, t(col, '')))),
    ...rows.map((row, r) => h(View, { key: `r-${r}`, style: styles.tr },
      ...row.map((cell, c) => h(Text, { key: `c-${c}`, style: [styles.td, { width: widths?.[c] || `${100 / columns.length}%` }] }, t(cell, '')))
    ))
  );
}

function InfoCard({ title, children }) {
  return h(View, { style: styles.card }, h(Text, { style: styles.cardTitle }, title), h(Text, { style: styles.paragraph }, children));
}

function ExecutiveSummaryCard({ model }) {
  const global = model.scores.global;
  const alertCount = model.criticalAlerts.length;
  const recCount = model.recommendations.length;
  const globalVerdict =
    global >= 80 ? 'globalement solide'
    : global >= 60 ? 'fonctionnel mais perfectible'
    : global >= 40 ? 'en dessous des standards actuels'
    : 'fragile et a corriger en priorite';
  const lead = `Le site ${model.domain} obtient un score global de ${global ?? 'N/A'}/100. Son niveau est ${globalVerdict}. ${alertCount > 0 ? `${alertCount} alerte(s) critique(s) doivent etre traitees en priorite.` : "Aucune alerte critique n'a ete remontee lors de ce scan."} ${recCount > 0 ? `${recCount} recommandation(s) priorisee(s) sont proposees pour corriger les points bloquants.` : 'Le site respecte globalement les standards professionnels attendus.'}`;
  const metrics = [
    ['Performance', model.scores.performance, "La vitesse percue, le poids des ressources et la stabilite de chargement influencent directement l'experience utilisateur et les conversions."],
    ['Securite', model.scores.security, "Les protections HTTPS, headers, reputation et signaux de risque determinent le niveau de confiance accorde au site."],
    ['SEO', model.scores.seo, "La structure technique, les balises et les signaux de partage aident Google a comprendre et presenter correctement la page."],
    ['UX mobile', model.scores.ux, "L'affichage mobile, les zones tactiles et le confort de lecture conditionnent la capacite des visiteurs a utiliser le site sans friction."],
  ];

  return h(View, { style: styles.summaryDark },
    h(Text, { style: styles.summaryTitleDark }, 'Synthese executive'),
    h(Text, { style: styles.summaryLead }, lead),
    ...metrics.map(([label, score, text]) => h(View, { key: label },
      h(Text, { style: styles.summaryMetricTitle }, `${label} (${score != null ? `${score}/100` : 'N/A'})`),
      h(Text, { style: styles.summaryMetricText }, text)
    ))
  );
}

function CoverPage({ model }) {
  const scanRows = [
    `Site analyse : ${t(model.url || model.domain, '-')}`,
    `Date du scan : ${t(formatScanDate(model), '-')}`,
    `Contexte : ${model.scanOrigin.label}${model.scanOrigin.city ? ` - ${model.scanOrigin.city}` : ''}`,
    `Recommandations : ${model.recommendations.length}`,
    `Alertes critiques : ${model.criticalAlerts.length}`,
  ];
  const cards = [
    ['Performance', model.scores.performance],
    ['Securite', model.scores.security],
    ['SEO', model.scores.seo],
    ['UX Mobile', model.scores.ux],
  ];

  return h(Page, { size: 'A4', style: styles.cover },
    h(View, { style: styles.coverHero },
      h(View, { style: styles.brandRow },
        h(Text, { style: styles.logo }, 'W'),
        h(View, null,
          h(Text, { style: styles.brand }, ['Webi', h(Text, { key: 'safe', style: styles.brandAccent }, 'safe')]),
          h(Text, { style: styles.tagline }, 'Analyse Web Professionnelle')
        )
      ),
      h(Text, { style: styles.coverTitle }, "Rapport d'Audit Premium"),
      h(Text, { style: styles.coverDomain }, model.domain),
      h(View, { style: styles.coverMeta },
        h(Text, { style: styles.metaPill }, `Scan du ${formatScanDate(model)}`),
        h(Text, { style: styles.metaPill }, `${model.recommendations.length} recommandation(s)`)
      )
    ),
    h(View, { style: styles.coverBody },
      h(View, { style: styles.scorePanel },
        h(View, { style: styles.scoreMain },
          h(Text, { style: styles.scoreValue }, `${model.scores.global ?? '-'}`),
          h(Text, { style: styles.scoreLabel }, `${getScoreLabel(model.scores.global)} / 100`)
        ),
        h(View, { style: styles.scoreGrid },
          ...cards.map(([label, score]) => h(View, { key: label, style: styles.darkCard },
            h(Text, { style: styles.darkCardLabel }, label),
            h(Text, { style: styles.darkCardValue }, score != null ? `${score}/100` : 'N/A')
          ))
        )
      ),
      h(ExecutiveSummaryCard, { model }),
      h(View, { style: [styles.summaryDark, { marginTop: 12 }] },
        h(Text, { style: styles.summaryTitleDark }, 'Informations du scan'),
        ...scanRows.map((row) => h(Text, { key: row, style: styles.summaryTextDark }, row))
      )
    ),
    h(PageFooter, { model })
  );
}

function PerformanceSecurityPage({ model }) {
  const perf = model.sections.performance;
  const security = model.sections.security;
  return h(ReportPage, { model, title: 'Performance et securite' },
    h(Text, { style: styles.sectionTitle }, '1. Performance'),
    h(Text, { style: styles.sectionIntro }, "Vitesse de chargement, poids des ressources et bonnes pratiques d'optimisation identifiees lors du scan."),
    h(MetricsGrid, { metrics: [
      { label: 'Temps de chargement', value: perf.loadTime != null ? `${perf.loadTime}s` : 'N/A', status: statusFromScore((1 - (perf.loadTime || 0) / 5) * 100) },
      { label: 'Taille de page', value: perf.pageSize != null ? `${(perf.pageSize / 1024).toFixed(1)} Mo` : 'N/A', status: statusFromScore((1 - (perf.pageSize || 0) / 3e6) * 100) },
      { label: 'Requetes HTTP', value: perf.requests != null ? `${perf.requests}` : 'N/A', status: perf.requests != null && perf.requests > 80 ? 'A ameliorer' : 'OK' },
      { label: 'Score Performance', value: model.scores.performance != null ? `${model.scores.performance}/100` : 'N/A', status: getScoreLabel(model.scores.performance) },
    ] }),
    perf.resources.length > 0
      ? h(DataTable, { columns: ['Ressource', 'Type', 'Taille'], rows: perf.resources.slice(0, 18).map(r => [t(r.name || r.url || r.path || 'Fichier'), t(r.type || 'Inconnu'), r.size != null ? `${(r.size / 1024).toFixed(1)} ko` : 'N/A']), widths: ['45%', '25%', '30%'] })
      : h(InfoCard, { title: 'Ressources analysees' }, "Les metriques globales de performance sont evaluees mais aucun detail de ressource n'a ete fourni dans ce scan."),

    h(Text, { style: [styles.sectionTitle, { marginTop: 18 }] }, '2. Securite'),
    h(Text, { style: styles.sectionIntro }, "Protections HTTPS, headers de securite et eventuelles failles ou mauvaises configurations detectees."),
    h(MetricsGrid, { metrics: [
      { label: 'Score Securite', value: model.scores.security != null ? `${model.scores.security}/100` : 'N/A', status: getScoreLabel(model.scores.security) },
      { label: 'HTTPS', value: boolLabel(security.https), status: security.https ? 'OK' : 'Critique' },
      { label: 'HSTS', value: boolLabel(security.hsts), status: security.hsts ? 'OK' : 'A ameliorer' },
      { label: 'X-Frame-Options', value: boolLabel(security.xframe), status: security.xframe ? 'OK' : 'A ameliorer' },
    ] }),
    h(InfoCard, { title: 'Headers de securite' }, `HTTPS : ${boolLabel(security.https)}  |  HSTS : ${boolLabel(security.hsts)}  |  X-Frame-Options : ${boolLabel(security.xframe)}  |  X-Content-Type-Options : ${boolLabel(security.xcontent)}`),
    security.issues.length > 0
      ? h(DataTable, { columns: ['Probleme', 'Severite'], rows: security.issues.slice(0, 12).map(iss => [t(iss.title || iss.name || iss.message || iss), t(iss.severity || iss.priority || 'Info')]), widths: ['70%', '30%'] })
      : h(InfoCard, { title: 'Vulnerabilites detectees' }, "Aucune vulnerabilite majeure n'a ete detectee dans la configuration actuelle.")
  );
}

function SeoUxPage({ model }) {
  const seo = model.sections.seo;
  const ux = model.sections.ux;
  return h(ReportPage, { model, title: 'SEO et UX mobile' },
    h(Text, { style: styles.sectionTitle }, '3. Referencement SEO'),
    h(Text, { style: styles.sectionIntro }, "Balises, structure Hn, donnees de partage et signaux techniques utilises par Google pour indexer la page."),
    h(MetricsGrid, { metrics: [
      { label: 'Score SEO', value: model.scores.seo != null ? `${model.scores.seo}/100` : 'N/A', status: getScoreLabel(model.scores.seo) },
      { label: 'Balise title', value: seo.title.length > 0 && seo.title !== 'Non defini' ? `${seo.title.length} car.` : 'Manquante', status: seo.title === 'Non defini' ? 'Critique' : 'OK' },
      { label: 'Meta description', value: seo.description.length > 0 && seo.description !== 'Non definie' ? `${seo.description.length} car.` : 'Manquante', status: seo.description === 'Non definie' ? 'A ameliorer' : 'OK' },
      { label: 'Sitemap.xml', value: boolLabel(seo.sitemap), status: seo.sitemap ? 'OK' : 'A ameliorer' },
    ] }),
    h(InfoCard, { title: 'Balise title' }, seo.title),
    h(InfoCard, { title: 'Meta description' }, seo.description),
    h(InfoCard, { title: 'Signaux techniques' }, `Canonical : ${boolLabel(seo.canonical)}  |  Robots.txt : ${boolLabel(seo.robots)}  |  Open Graph : ${seo.ogTags.length}  |  Schema.org : ${boolLabel(seo.schema)}  |  Analytics : ${boolLabel(seo.analytics)}`),

    h(Text, { style: [styles.sectionTitle, { marginTop: 18 }] }, '4. UX mobile'),
    h(Text, { style: styles.sectionIntro }, "Adaptation mobile, viewport, lisibilite et zones cliquables pour les visiteurs sur smartphone."),
    h(MetricsGrid, { metrics: [
      { label: 'Score UX', value: model.scores.ux != null ? `${model.scores.ux}/100` : 'N/A', status: getScoreLabel(model.scores.ux) },
      { label: 'Responsive', value: boolLabel(ux.responsive), status: ux.responsive ? 'OK' : 'Critique' },
      { label: 'Viewport', value: ux.viewport.length > 24 ? 'Configure' : ux.viewport, status: 'OK' },
      { label: 'Tap targets', value: ux.tapTargets.slice(0, 18), status: 'A verifier' },
    ] }),
    h(InfoCard, { title: 'Police de texte' }, ux.fontSize),
    h(InfoCard, { title: 'Configuration viewport' }, ux.viewport)
  );
}

function ServerInfoPage({ model }) {
  const server = model.sections.server;
  return h(ReportPage, { model, title: 'Infrastructure et certificat' },
    h(Text, { style: styles.sectionTitle }, '5. Infrastructure technique'),
    h(Text, { style: styles.sectionIntro }, "CMS, technologies, hebergement et certificat SSL identifies sur le site."),
    h(DataTable, { columns: ['Element', 'Valeur'], rows: [
      ['CMS / plateforme', server.cms],
      ['Serveur HTTP', server.server],
      ['Hebergeur', server.location.provider],
      ['Localisation', `${server.location.city}, ${server.location.country}`],
      ['IP', server.location.ip],
      ['Note serveur', String(server.grade)],
      ['SSL valide', server.ssl.valid],
      ['Emetteur SSL', server.ssl.issuer],
      ['Expiration SSL', server.ssl.expiry],
      ['Cookies detectes', server.cookies != null ? String(server.cookies) : 'N/A'],
      ['Bandeau cookies', server.cookieConsent],
    ], widths: ['38%', '62%'] }),
    server.technologies.length > 0
      ? h(InfoCard, { title: 'Technologies detectees' }, server.technologies.map(t1 => t(t1.name || t1)).join(', '))
      : null
  );
}

function RecommendationCard({ rec, index }) {
  const isCritical = rec.priority.toLowerCase().includes('critique') || rec.priority.toLowerCase().includes('urgent');
  const isImprovement = rec.priority.toLowerCase().includes('amelior');
  const color = isCritical ? C.danger : isImprovement ? C.success : C.warning;
  const label = isCritical ? 'URGENT' : isImprovement ? 'AMELIORATION' : 'IMPORTANT';
  const body = buildRecommendationBody(rec);
  return h(View, { style: [styles.recCard, { borderLeftColor: color }], wrap: false },
    h(View, { style: styles.recTop },
      h(Text, { style: styles.recTitle }, `${index + 1}. ${t(rec.title, '')}`),
      h(Text, { style: [styles.recPriority, { color }] }, label)
    ),
    body.intro ? h(Text, { style: styles.recIntro }, body.intro) : null,
    h(Text, { style: styles.recCorrection }, body.resolution),
    h(Text, { style: styles.recMeta }, `${t(rec.category || 'general')} - ${t(rec.time || '30 minutes')} - ${t(rec.difficulty || 'Intermediaire')}`)
  );
}

function RecommendationsPage({ model }) {
  if (model.recommendations.length === 0) {
    return h(ReportPage, { model, title: "Plan d'action" },
      h(Text, { style: styles.sectionTitle }, "Plan d'action recommande"),
      h(InfoCard, { title: 'Aucune action critique requise' }, "Le site respecte globalement les standards professionnels attendus. Continuez a surveiller la performance et la securite regulierement.")
    );
  }
  return h(ReportPage, { model, title: "Plan d'action" },
    h(Text, { style: styles.sectionTitle }, "Plan d'action recommande"),
    h(Text, { style: styles.sectionIntro }, `${model.recommendations.length} recommandation(s) priorisee(s) pour corriger les points identifies durant le scan.`),
    ...model.recommendations.map((rec, i) => h(RecommendationCard, { key: i, rec, index: i }))
  );
}

function CtaPage({ model }) {
  return h(Page, { size: 'A4', style: styles.ctaPage },
    h(View, { style: styles.ctaCard },
      h(Text, { style: styles.ctaEyebrow }, 'PASSER A L\'ACTION'),
      h(Text, { style: styles.ctaTitle }, 'Faites corriger votre site par Webisafe'),
      h(Text, { style: styles.ctaText }, "Ce rapport identifie les points a corriger sur " + model.domain + ". Confiez la mise en conformite a notre equipe : audit complet, corrections techniques, controle final et mise en production."),
      h(View, { style: styles.ctaButtons },
        h(Link, { src: CORRECTION_URL, style: styles.ctaButton }, 'Demander une correction'),
        h(Link, { src: WHATSAPP_URL, style: styles.ctaButtonLight }, `WhatsApp ${REPORT_FIX_PHONE}`)
      )
    ),
    h(PageFooter, { model })
  );
}

function WebisafePdfDocument({ model }) {
  return h(Document, { author: 'Webisafe', title: `Audit ${model.domain}`, subject: 'Rapport audit web Webisafe' },
    h(CoverPage, { model }),
    h(PerformanceSecurityPage, { model }),
    h(SeoUxPage, { model }),
    h(ServerInfoPage, { model }),
    h(RecommendationsPage, { model }),
    h(CtaPage, { model })
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createPDFBlob(reportData) {
  const model = buildPdfAuditModel(reportData);
  return pdf(h(WebisafePdfDocument, { model })).toBlob();
}

export function generatePDF(reportData) {
  const model = buildPdfAuditModel(reportData);
  const filename = buildPdfFilename({ domain: model.domain, scanDate: model.scanDate });
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    createPDFBlob(reportData)
      .then((blob) => downloadBlob(blob, filename))
      .catch((error) => {
        console.error('Erreur PDF:', error);
      });
  }
  return filename;
}
