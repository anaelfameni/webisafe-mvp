import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, extractDomain } from './validators.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  const s = sanitizePdfText(value);
  return s || fallback;
}

export function buildPdfFilename(reportData) {
  const rawDomain = reportData.domain || reportData.url || 'site';
  const sanitizedDomain = t(rawDomain, 'site').replace(/[^a-zA-Z0-9.-]/g, '-');
  const datePart = new Date(reportData.scanDate || Date.now()).toISOString().split('T')[0];
  return `Webisafe_Rapport_${sanitizedDomain}_${datePart}.pdf`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function getScoreColor(score) {
  if (score >= 90) return '#3b82f6';
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#eab308';
  if (score >= 30) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Bon';
  if (score >= 50) return 'Acceptable';
  if (score >= 30) return 'Mauvais';
  return 'Critique';
}

function getStatusIcon(status) {
  if (status === 'pass') return 'OK';
  if (status === 'warn') return '!!';
  return 'KO';
}

function getStatusColor(status) {
  if (status === 'pass') return [34, 197, 94];
  if (status === 'warn') return [234, 179, 8];
  return [239, 68, 68];
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

// ── Génération de la synthèse exécutive ───────────────────────────────────────
function buildResumeExecutif(reportData) {
  // Si une synthèse externe est fournie et non vide, on la retourne directement
  if (reportData.summary?.resume_executif) {
    return reportData.summary.resume_executif;
  }

  const scores = reportData.scores || {};
  const global = scores.global ?? 0;
  const perf = scores.performance ?? 0;
  const sec = scores.security ?? 0;
  const seo = scores.seo ?? 0;
  const ux = scores.ux_mobile ?? scores.ux ?? 0;

  const cwv = reportData.performance?.core_web_vitals || {};
  const lcpMs = cwv.lcp?.value;
  const secData = reportData.security || {};
  const missingHeaders = secData.headers_manquants || [];

  // Évaluation globale
  let globalEval = '';
  if (global >= 85) {
    globalEval = `Avec un score global de ${global}/100, votre site affiche d'excellentes performances et constitue un atout solide pour votre activite en ligne.`;
  } else if (global >= 70) {
    globalEval = `Avec un score global de ${global}/100, votre site est dans une situation satisfaisante, mais plusieurs points d'amelioration peuvent encore renforcer significativement votre position en ligne.`;
  } else if (global >= 50) {
    globalEval = `Avec un score global de ${global}/100, votre site presente des lacunes importantes qui freinent son efficacite commerciale et sa credibilite aupres des visiteurs.`;
  } else {
    globalEval = `Avec un score global de ${global}/100, votre site necessite une intervention urgente : les failles identifiees impactent directement votre visibilite, votre securite et vos conversions.`;
  }

  // Bloc performance
  let perfBlock = '';
  if (perf >= 80) {
    perfBlock = `Performance (${perf}/100) : votre site se charge rapidement et offre une bonne experience utilisateur.`;
  } else if (perf >= 60) {
    const lcpInfo = lcpMs ? ` Le temps de chargement principal (LCP) est de ${lcpMs}ms, alors que l'objectif recommande est de 2500ms.` : '';
    perfBlock = `Performance (${perf}/100) : le chargement du site est perfectible et peut decourager certains visiteurs.${lcpInfo}`;
  } else {
    const lcpInfo = lcpMs ? ` Le LCP mesure a ${lcpMs}ms depasse largement le seuil acceptable de 2500ms.` : '';
    perfBlock = `Performance (${perf}/100) : les temps de chargement sont trop eleves et degradent l'experience utilisateur de maniere significative.${lcpInfo}`;
  }

  // Bloc securite
  let secBlock = '';
  if (sec >= 80) {
    secBlock = `Securite (${sec}/100) : les protections en place sont satisfaisantes.`;
  } else if (sec >= 60) {
    const hInfo = missingHeaders.length > 0
      ? ` Les headers HTTP suivants sont absents : ${missingHeaders.join(', ')}.`
      : '';
    secBlock = `Securite (${sec}/100) : le niveau de protection est insuffisant et expose le site a des vulnerabilites evitables.${hInfo}`;
  } else {
    secBlock = `Securite (${sec}/100) : des failles de securite critiques sont detectees et necessitent une correction prioritaire.`;
  }

  // Bloc SEO
  let seoBlock = '';
  if (seo >= 85) {
    seoBlock = `Referencement SEO (${seo}/100) : votre site est bien optimise pour les moteurs de recherche.`;
  } else if (seo >= 65) {
    seoBlock = `Referencement SEO (${seo}/100) : le positionnement sur les moteurs de recherche peut encore etre ameliore.`;
  } else {
    seoBlock = `Referencement SEO (${seo}/100) : votre visibilite sur Google est fortement limitee par des elements techniques manquants.`;
  }

  // Bloc UX mobile
  let uxBlock = '';
  if (ux >= 80) {
    uxBlock = `Experience mobile (${ux}/100) : votre site offre une navigation fluide et agréable sur smartphone.`;
  } else if (ux >= 60) {
    uxBlock = `Experience mobile (${ux}/100) : la navigation sur mobile reste perfectible et peut engendrer des abandons de visite.`;
  } else {
    uxBlock = `Experience mobile (${ux}/100) : l'experience sur smartphone est insuffisante, ce qui penalise un segment majeur de votre audience.`;
  }

  return [globalEval, perfBlock, secBlock, seoBlock, uxBlock].join(' ');
}

// ── Couleurs & constantes ─────────────────────────────────────────────────────
const BLUE = [21, 102, 240];
const DARK_BLUE = [10, 25, 60];
const DARK_BG = [13, 27, 42];
const WHITE = [255, 255, 255];
const GRAY_TEXT = [148, 163, 184];
const LIGHT_BG = [241, 245, 249];
const BORDER = [30, 58, 95];

// ── Fonctions utilitaires dessin ──────────────────────────────────────────────
function drawRoundedRect(doc, x, y, w, h, r, fillColor, strokeColor) {
  doc.setFillColor(...fillColor);
  if (strokeColor) doc.setDrawColor(...strokeColor);
  doc.roundedRect(x, y, w, h, r, r, strokeColor ? 'FD' : 'F');
}

function drawScoreCircle(doc, cx, cy, radius, score) {
  const color = hexToRgb(getScoreColor(score));
  doc.setFillColor(color.r * 0.2, color.g * 0.2, color.b * 0.2);
  doc.circle(cx, cy, radius + 3, 'F');
  doc.setFillColor(color.r, color.g, color.b);
  doc.circle(cx, cy, radius, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(radius > 15 ? 22 : 14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${score}`, cx, cy + (radius > 15 ? 4 : 2), { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('/100', cx, cy + (radius > 15 ? 12 : 9), { align: 'center' });
}

function drawLogo(doc, x, y) {
  doc.setFillColor(...BLUE);
  doc.roundedRect(x, y, 10, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('W', x + 5, y + 7, { align: 'center' });
}

function addPageHeader(doc, pageWidth, title = '') {
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 8, 'F');
  if (title) {
    doc.setTextColor(...GRAY_TEXT);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(t(title), pageWidth / 2, 5.5, { align: 'center' });
  }
}

function addPageFooter(doc, pageWidth, pageNum, totalPages, domain) {
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...DARK_BG);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  doc.setTextColor(...GRAY_TEXT);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Webisafe - Audit de ${t(domain)}`, 20, pageHeight - 5);
  doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - 20, pageHeight - 5, { align: 'right' });
  doc.text('webisafe.tech', pageWidth / 2, pageHeight - 5, { align: 'center' });
}

function sectionTitle(doc, text, y, margin) {
  doc.setFillColor(...BLUE);
  doc.rect(margin, y, 3, 8, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(t(text), margin + 7, y + 6);
  return y + 14;
}

// ── Fonction principale ───────────────────────────────────────────────────────
export function generatePDF(reportData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  const domain = t(extractDomain(reportData.url || reportData.domain || ''), 'site');
  const scanDate = t(formatDate(reportData.scanDate || reportData.scan_duration_ms ? new Date().toISOString() : ''));
  const scores = reportData.scores || {};
  const globalScore = scores.global ?? 0;

  // Génération de la synthèse exécutive (externe ou construite dynamiquement)
  const resumeExecutif = buildResumeExecutif(reportData);

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COUVERTURE
  // ════════════════════════════════════════════════════════════════════════

  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 70, 'F');

  doc.setFillColor(10, 60, 160);
  doc.rect(0, 0, pageWidth / 2, 70, 'F');

  drawLogo(doc, margin, 15);
  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Webi', margin + 14, 23);
  doc.setTextColor(147, 197, 253);
  doc.text('safe', margin + 14 + doc.getTextWidth('Webi'), 23);

  doc.setTextColor(186, 230, 253);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Audit Web Professionnel', margin + 14, 30);

  doc.setTextColor(...WHITE);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text("Rapport d'Audit", pageWidth / 2, 50, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(186, 230, 253);
  doc.text(domain, pageWidth / 2, 61, { align: 'center' });

  const centerY = 115;
  const bigR = 28;

  const scoreRgb = hexToRgb(getScoreColor(globalScore));
  doc.setFillColor(scoreRgb.r, scoreRgb.g, scoreRgb.b);
  doc.setGState && doc.setGState(doc.GState({ opacity: 0.15 }));
  doc.circle(pageWidth / 2, centerY, bigR + 10, 'F');
  doc.setGState && doc.setGState(doc.GState({ opacity: 1 }));

  doc.setFillColor(20, 40, 80);
  doc.circle(pageWidth / 2, centerY, bigR + 3, 'F');

  doc.setFillColor(scoreRgb.r, scoreRgb.g, scoreRgb.b);
  doc.circle(pageWidth / 2, centerY, bigR, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(30);
  doc.setFont('helvetica', 'bold');
  doc.text(`${globalScore}`, pageWidth / 2, centerY + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.text('/100', pageWidth / 2, centerY + 14, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(scoreRgb.r, scoreRgb.g, scoreRgb.b);
  doc.text(getScoreLabel(globalScore).toUpperCase(), pageWidth / 2, centerY + bigR + 12, { align: 'center' });

  doc.setTextColor(...GRAY_TEXT);
  doc.setFontSize(9);
  doc.text('Score Global Webisafe', pageWidth / 2, centerY + bigR + 19, { align: 'center' });

  const cats = [
    { label: 'Performance', score: scores.performance ?? 0 },
    { label: 'Securite', score: scores.security ?? 0 },
    { label: 'SEO', score: scores.seo ?? 0 },
    { label: 'UX Mobile', score: scores.ux_mobile ?? scores.ux ?? 0 },
  ];

  const catY = 170;
  const catW = (contentWidth - 9) / 4;
  cats.forEach((cat, i) => {
    const x = margin + i * (catW + 3);
    const rgb = hexToRgb(getScoreColor(cat.score));
    doc.setFillColor(20, 35, 65);
    doc.roundedRect(x, catY, catW, 28, 3, 3, 'F');
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.roundedRect(x, catY, catW, 2, 1, 1, 'F');
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cat.score}`, x + catW / 2, catY + 13, { align: 'center' });
    doc.setTextColor(...GRAY_TEXT);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(t(cat.label), x + catW / 2, catY + 22, { align: 'center' });
  });

  const infoY = 215;
  doc.setFillColor(20, 35, 65);
  doc.roundedRect(margin, infoY, contentWidth, 20, 3, 3, 'F');
  doc.setTextColor(...GRAY_TEXT);
  doc.setFontSize(8);
  doc.text(`Site analyse : ${t(reportData.url || domain)}`, margin + 5, infoY + 7);
  doc.text(`Date : ${scanDate || new Date().toLocaleDateString('fr-FR')}`, margin + 5, infoY + 14);
  doc.text('Genere par Webisafe - webisafe.tech', pageWidth - margin - 5, infoY + 10, { align: 'right' });

  // Synthèse sur la page de couverture
  const resumeY = infoY + 28;
  doc.setFillColor(15, 30, 60);
  doc.roundedRect(margin, resumeY, contentWidth, 8, 2, 2, 'F');
  doc.setFillColor(...BLUE);
  doc.roundedRect(margin, resumeY, 3, 8, 1, 1, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Synthese', margin + 7, resumeY + 5.5);

  const lines = doc.splitTextToSize(
    sanitizePdfText(resumeExecutif).split('\n\n')[0],
    contentWidth - 10
  ).slice(0, 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_TEXT);
  doc.setFontSize(7.5);
  lines.forEach((line, i) => {
    doc.text(line, margin + 5, resumeY + 16 + i * 5);
  });

  doc.setFillColor(...DARK_BG);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, pageHeight - 12, pageWidth, 1, 'F');
  doc.setTextColor(...GRAY_TEXT);
  doc.setFontSize(7);
  doc.text('Webisafe - webisafe.tech', pageWidth / 2, pageHeight - 5, { align: 'center' });

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 2 — PERFORMANCE & SÉCURITÉ
  // ════════════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  addPageHeader(doc, pageWidth, `Rapport Webisafe - ${domain}`);

  let y = 18;

  y = sectionTitle(doc, 'Performance', y, margin);

  const perf = reportData.performance || {};
  const cwv = perf.core_web_vitals || {};
  const perfScore = scores.performance ?? 0;
  const perfRgb = hexToRgb(getScoreColor(perfScore));

  doc.setFillColor(15, 30, 55);
  doc.roundedRect(margin, y, 38, 22, 3, 3, 'F');
  doc.setFillColor(perfRgb.r, perfRgb.g, perfRgb.b);
  doc.roundedRect(margin, y, 38, 2, 1, 1, 'F');
  doc.setTextColor(perfRgb.r, perfRgb.g, perfRgb.b);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${perfScore}`, margin + 19, y + 13, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_TEXT);
  doc.text('/100 - ' + getScoreLabel(perfScore), margin + 19, y + 19, { align: 'center' });

  const cvwMetrics = [
    { label: 'LCP', value: cwv.lcp?.value ? `${cwv.lcp.value}ms` : 'N/A', status: cwv.lcp?.rating === 'good' ? 'pass' : cwv.lcp?.rating === 'needs_improvement' ? 'warn' : 'fail', desc: 'Largest Contentful Paint - Objectif < 2500ms' },
    { label: 'CLS', value: cwv.cls?.value !== null && cwv.cls?.value !== undefined ? cwv.cls.value.toFixed(3) : 'N/A', status: cwv.cls?.rating === 'good' ? 'pass' : cwv.cls?.rating === 'needs_improvement' ? 'warn' : 'fail', desc: 'Cumulative Layout Shift - Objectif < 0.1' },
    { label: 'FCP', value: cwv.fcp?.value ? `${cwv.fcp.value}ms` : 'N/A', status: cwv.fcp?.rating === 'good' ? 'pass' : cwv.fcp?.rating === 'needs_improvement' ? 'warn' : 'fail', desc: 'First Contentful Paint - Objectif < 1800ms' },
  ];

  const cvwX = margin + 42;
  cvwMetrics.forEach((m, i) => {
    const mx = cvwX + i * ((contentWidth - 42) / 3 + 1);
    const mw = (contentWidth - 42) / 3 - 1;
    const sc = getStatusColor(m.status);
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(mx, y, mw, 22, 3, 3, 'F');
    doc.setFillColor(...sc);
    doc.roundedRect(mx, y, mw, 2, 1, 1, 'F');
    doc.setTextColor(...sc);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(t(m.value), mx + mw / 2, y + 11, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(t(m.label), mx + mw / 2, y + 17, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(getStatusIcon(m.status), mx + mw - 4, y + 6, { align: 'center' });
  });

  y += 28;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Metrique', 'Valeur', 'Statut', 'Interpretation']],
    body: [
      ['Poids de la page', perf.poids_page_mb ? `${perf.poids_page_mb} MB` : 'N/A', perf.poids_page_mb <= 2 ? 'OK' : perf.poids_page_mb <= 4 ? 'Moyen' : 'Lourd', perf.poids_page_mb > 4 ? 'Page trop lourde, ralentit le chargement' : perf.poids_page_mb > 2 ? 'Acceptable, optimisable' : 'Bon poids de page'],
      ['Nb requetes', perf.nb_requetes ?? 'N/A', perf.nb_requetes <= 50 ? 'OK' : 'Eleve', perf.nb_requetes > 80 ? 'Trop de requetes, fusionner les fichiers' : 'Nombre de requetes acceptable'],
      ['LCP (chargement)', cwv.lcp?.value ? `${cwv.lcp.value}ms` : 'N/A', cwv.lcp?.rating === 'good' ? 'Bon' : cwv.lcp?.rating === 'needs_improvement' ? 'A ameliorer' : 'Mauvais', cwv.lcp?.rating === 'good' ? 'Element principal visible rapidement' : 'Element principal trop lent a charger'],
      ['CLS (stabilite)', cwv.cls?.value !== null ? cwv.cls?.value?.toFixed(3) : 'N/A', cwv.cls?.rating === 'good' ? 'Stable' : 'Instable', cwv.cls?.rating === 'good' ? 'Page stable, pas de sauts visuels' : 'Elements qui bougent pendant le chargement'],
      ['FCP (premier affichage)', cwv.fcp?.value ? `${cwv.fcp.value}ms` : 'N/A', cwv.fcp?.rating === 'good' ? 'Rapide' : 'Lent', cwv.fcp?.rating === 'good' ? 'Premier contenu affiche rapidement' : 'Trop long avant le premier affichage'],
    ],
    headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [226, 232, 240], fillColor: [15, 30, 55] },
    alternateRowStyles: { fillColor: [20, 40, 70] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 'auto' },
    },
    didDrawCell: (data) => {
      if (data.column.index === 2 && data.section === 'body') {
        const val = data.cell.text[0];
        let color = [34, 197, 94];
        if (['A ameliorer', 'Moyen', 'Eleve', 'Instable', 'Lent'].includes(val)) color = [234, 179, 8];
        if (['Mauvais', 'Lourd'].includes(val)) color = [239, 68, 68];
        doc.setTextColor(...color);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
      }
    },
  });

  y = doc.lastAutoTable.finalY + 12;

  y = sectionTitle(doc, 'Securite', y, margin);

  const sec = reportData.security || {};
  const secScore = scores.security ?? 0;
  const secRgb = hexToRgb(getScoreColor(secScore));

  doc.setFillColor(15, 30, 55);
  doc.roundedRect(margin, y, 38, 18, 3, 3, 'F');
  doc.setFillColor(secRgb.r, secRgb.g, secRgb.b);
  doc.roundedRect(margin, y, 38, 2, 1, 1, 'F');
  doc.setTextColor(secRgb.r, secRgb.g, secRgb.b);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${secScore}`, margin + 19, y + 10, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(getScoreLabel(secScore), margin + 19, y + 15, { align: 'center' });

  const secIndicators = [
    { label: 'HTTPS', value: (reportData.summary?.https_enabled || sec.ssl_grade === 'OK') ? 'Actif' : 'Inactif', pass: reportData.summary?.https_enabled },
    { label: 'Headers', value: sec.headers_manquants?.length === 0 ? 'Complets' : `${sec.headers_manquants?.length ?? '?'} manquants`, pass: sec.headers_manquants?.length === 0 },
    { label: 'Malware', value: sec.malware ? 'Detecte!' : 'Aucun', pass: !sec.malware },
    { label: 'OWASP', value: sec.failles_owasp_count === 0 ? 'OK' : `${sec.failles_owasp_count} faille(s)`, pass: sec.failles_owasp_count === 0 },
  ];

  const indW = (contentWidth - 42) / 4 - 1;
  secIndicators.forEach((ind, i) => {
    const ix = margin + 42 + i * (indW + 1.5);
    const ic = ind.pass ? [34, 197, 94] : [239, 68, 68];
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(ix, y, indW, 18, 2, 2, 'F');
    doc.setFillColor(...ic);
    doc.roundedRect(ix, y, indW, 2, 1, 1, 'F');
    doc.setTextColor(...ic);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(t(ind.value), ix + indW / 2, y + 9, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(t(ind.label), ix + indW / 2, y + 15, { align: 'center' });
  });

  y += 24;

  if (sec.headers_manquants?.length > 0) {
    doc.setFillColor(60, 20, 20);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setTextColor(252, 165, 165);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Headers de securite manquants : ', margin + 4, y + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(t(sec.headers_manquants.join(', ')), margin + 58, y + 6.5);
    y += 14;
  }

  addPageFooter(doc, pageWidth, 2, 4, domain);

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 3 — SEO & UX
  // ════════════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  addPageHeader(doc, pageWidth, `Rapport Webisafe - ${domain}`);

  y = 18;

  y = sectionTitle(doc, 'SEO - Referencement', y, margin);

  const seo = reportData.seo || {};
  const seoScore = scores.seo ?? 0;
  const seoRgb = hexToRgb(getScoreColor(seoScore));

  const seoMetrics = [
    { label: 'Indexation Google', value: seo.indexed ? 'Indexe' : 'Non indexe', pass: seo.indexed, desc: seo.indexed ? 'Votre site est visible par Google' : 'Votre site est invisible sur Google' },
    { label: 'Sitemap XML', value: seo.sitemap_present ? 'Present' : 'Absent', pass: seo.sitemap_present, desc: seo.sitemap_present ? 'Aide Google a explorer votre site' : 'Sans sitemap, Google explore moins bien votre site' },
    { label: 'Balises Meta', value: seo.meta_tags_ok ? 'Completes' : 'Incompletes', pass: seo.meta_tags_ok, desc: seo.meta_tags_ok ? 'Titre et description presents' : 'Description ou titre manquants, impact SEO negatif' },
    { label: 'Open Graph', value: seo.open_graph ? 'Present' : 'Absent', pass: seo.open_graph, desc: seo.open_graph ? 'Partage sur reseaux sociaux optimise' : 'Mauvais affichage lors du partage sur les reseaux' },
  ];

  doc.setFillColor(15, 30, 55);
  doc.roundedRect(margin, y, 38, 18, 3, 3, 'F');
  doc.setFillColor(seoRgb.r, seoRgb.g, seoRgb.b);
  doc.roundedRect(margin, y, 38, 2, 1, 1, 'F');
  doc.setTextColor(seoRgb.r, seoRgb.g, seoRgb.b);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${seoScore}`, margin + 19, y + 10, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(getScoreLabel(seoScore), margin + 19, y + 15, { align: 'center' });

  const seoIndW = (contentWidth - 42) / 4 - 1;
  seoMetrics.forEach((m, i) => {
    const sx = margin + 42 + i * (seoIndW + 1.5);
    const sc2 = m.pass ? [34, 197, 94] : [239, 68, 68];
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(sx, y, seoIndW, 18, 2, 2, 'F');
    doc.setFillColor(...sc2);
    doc.roundedRect(sx, y, seoIndW, 2, 1, 1, 'F');
    doc.setTextColor(...sc2);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(t(m.value), sx + seoIndW / 2, y + 9, { align: 'center' });
    doc.setFontSize(6);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(t(m.label), sx + seoIndW / 2, y + 15, { align: 'center' });
  });

  y += 24;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Critere SEO', 'Resultat', 'Impact Business']],
    body: seoMetrics.map(m => [t(m.label), t(m.value), t(m.desc)]),
    headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [226, 232, 240], fillColor: [15, 30, 55] },
    alternateRowStyles: { fillColor: [20, 40, 70] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 'auto' },
    },
  });

  y = doc.lastAutoTable.finalY + 12;

  y = sectionTitle(doc, 'UX Mobile', y, margin);

  const ux = reportData.ux || {};
  const uxScore = scores.ux_mobile ?? scores.ux ?? 0;
  const uxRgb = hexToRgb(getScoreColor(uxScore));

  const uxMetrics = [
    { label: 'Responsive', value: ux.responsive ? 'Oui' : 'Non', pass: ux.responsive, desc: ux.responsive ? 'Site adapte aux mobiles - essentiel pour 80% du trafic africain' : 'Site non adapte au mobile, perte massive de visiteurs' },
    { label: 'Taille texte', value: ux.taille_texte_px ? `${ux.taille_texte_px}px` : 'N/A', pass: ux.taille_texte_px >= 12, desc: ux.taille_texte_px >= 14 ? 'Texte lisible sans zoom sur mobile' : 'Texte trop petit, difficile a lire sur smartphone' },
    { label: 'Boutons tactiles', value: ux.elements_tactiles_ok ? 'Optimises' : 'Trop proches', pass: ux.elements_tactiles_ok, desc: ux.elements_tactiles_ok ? 'Boutons bien espaces, navigation facile' : 'Boutons trop proches, clics difficiles sur mobile' },
    { label: 'Score Vitesse Mobile', value: ux.vitesse_mobile ? `${ux.vitesse_mobile}/100` : 'N/A', pass: ux.vitesse_mobile >= 70, desc: ux.vitesse_mobile >= 70 ? 'Bonne experience mobile' : 'Experience mobile degradee, taux de rebond eleve' },
  ];

  doc.setFillColor(15, 30, 55);
  doc.roundedRect(margin, y, 38, 18, 3, 3, 'F');
  doc.setFillColor(uxRgb.r, uxRgb.g, uxRgb.b);
  doc.roundedRect(margin, y, 38, 2, 1, 1, 'F');
  doc.setTextColor(uxRgb.r, uxRgb.g, uxRgb.b);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${uxScore}`, margin + 19, y + 10, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(getScoreLabel(uxScore), margin + 19, y + 15, { align: 'center' });

  const uxIndW = (contentWidth - 42) / 4 - 1;
  uxMetrics.forEach((m, i) => {
    const ux2 = margin + 42 + i * (uxIndW + 1.5);
    const sc3 = m.pass ? [34, 197, 94] : [239, 68, 68];
    doc.setFillColor(15, 30, 55);
    doc.roundedRect(ux2, y, uxIndW, 18, 2, 2, 'F');
    doc.setFillColor(...sc3);
    doc.roundedRect(ux2, y, uxIndW, 2, 1, 1, 'F');
    doc.setTextColor(...sc3);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(t(m.value), ux2 + uxIndW / 2, y + 9, { align: 'center' });
    doc.setFontSize(6);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(t(m.label), ux2 + uxIndW / 2, y + 15, { align: 'center' });
  });

  y += 24;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Critere UX', 'Resultat', 'Impact Business']],
    body: uxMetrics.map(m => [t(m.label), t(m.value), t(m.desc)]),
    headStyles: { fillColor: BLUE, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [226, 232, 240], fillColor: [15, 30, 55] },
    alternateRowStyles: { fillColor: [20, 40, 70] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 'auto' },
    },
  });

  addPageFooter(doc, pageWidth, 3, 4, domain);

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 4 — RECOMMANDATIONS & PLAN D'ACTION
  // ════════════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  addPageHeader(doc, pageWidth, `Rapport Webisafe - ${domain}`);

  y = 18;
  y = sectionTitle(doc, "Plan d'Action - Recommandations Prioritaires", y, margin);

  const recs = reportData.recommendations || reportData.ai_analysis?.recommandations_prioritaires || [];

  if (recs.length === 0) {
    doc.setTextColor(...GRAY_TEXT);
    doc.setFontSize(9);
    doc.text('Aucune recommandation disponible.', margin, y + 8);
    y += 16;
  } else {
    recs.forEach((rec, index) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        doc.setFillColor(...DARK_BG);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        addPageHeader(doc, pageWidth, `Rapport Webisafe - ${domain}`);
        y = 18;
      }

      const recH = 22;
      const diffColors = {
        'Facile': [34, 197, 94],
        'Moyenne': [234, 179, 8],
        'Difficile': [239, 68, 68],
      };
      const diff = t(rec.difficulte || rec.difficulty, 'Moyenne');
      const dc = diffColors[diff] || [148, 163, 184];

      doc.setFillColor(15, 30, 55);
      doc.roundedRect(margin, y, contentWidth, recH, 3, 3, 'F');
      doc.setFillColor(...dc);
      doc.roundedRect(margin, y, 2, recH, 1, 1, 'F');

      doc.setFillColor(...dc);
      doc.circle(margin + 10, y + recH / 2, 5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}`, margin + 10, y + recH / 2 + 1, { align: 'center' });

      doc.setTextColor(...WHITE);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const actionLines = doc.splitTextToSize(t(rec.action), contentWidth - 60);
      doc.text(actionLines[0], margin + 18, y + 8);

      doc.setTextColor(...GRAY_TEXT);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(t(rec.impact), margin + 18, y + 15);

      const badgeX = pageWidth - margin - 42;
      doc.setFillColor(dc[0] * 0.3, dc[1] * 0.3, dc[2] * 0.3);
      doc.roundedRect(badgeX, y + 4, 18, 6, 1, 1, 'F');
      doc.setTextColor(...dc);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(diff, badgeX + 9, y + 8, { align: 'center' });

      const tempsVal = t(rec.temps || rec.time, '');
      if (tempsVal) {
        doc.setFillColor(20, 40, 70);
        doc.roundedRect(badgeX + 20, y + 4, 18, 6, 1, 1, 'F');
        doc.setTextColor(...GRAY_TEXT);
        doc.setFontSize(6);
        doc.text(tempsVal, badgeX + 29, y + 8, { align: 'center' });
      }

      y += recH + 3;
    });
  }

  // ── Synthèse finale — section dédiée page 4 ───────────────────────────────
  if (y < pageHeight - 65) {
    y += 8;

    // Hauteur dynamique selon le texte
    const synthLines = doc.splitTextToSize(sanitizePdfText(resumeExecutif), contentWidth - 14);
    const maxLines = Math.min(synthLines.length, 7);
    const synthHeight = 16 + maxLines * 5;

    doc.setFillColor(15, 30, 55);
    doc.roundedRect(margin, y, contentWidth, synthHeight, 3, 3, 'F');
    doc.setFillColor(...BLUE);
    doc.roundedRect(margin, y, contentWidth, 2, 1, 1, 'F');

    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Synthese de l'audit", margin + 6, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_TEXT);
    synthLines.slice(0, maxLines).forEach((line, i) => {
      doc.text(line, margin + 6, y + 18 + i * 5);
    });

    y += synthHeight + 5;
  }

  const ctaY = pageHeight - 35;
  doc.setFillColor(...BLUE);
  doc.roundedRect(margin, ctaY, contentWidth, 18, 3, 3, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Besoin d'aide pour corriger ces problemes ?", pageWidth / 2, ctaY + 7, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Contactez-nous : webisafe@gmail.com  |  WhatsApp : +225 05 95 33 56 62', pageWidth / 2, ctaY + 13, { align: 'center' });

  addPageFooter(doc, pageWidth, 4, 4, domain);

  const filename = buildPdfFilename({
    domain,
    url: reportData.url,
    scanDate: reportData.scanDate,
  });

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    downloadPdfBlob(doc, filename);
  } else {
    doc.save(filename);
  }

  return filename;
}