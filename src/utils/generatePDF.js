import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getScoreColor, getScoreLabel } from './calculateScore.js';
import { formatDate } from './validators.js';

export function sanitizePdfText(value) {
  const source = String(value ?? '');

  return source
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[•·]/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pdfText(value, fallback = 'N/A') {
  const sanitized = sanitizePdfText(value);
  return sanitized || fallback;
}

function pdfCell(value, fallback = 'N/A') {
  return pdfText(value, fallback);
}

export function buildPdfFilename(reportData) {
  const rawDomain = reportData.domain || reportData.url || 'site';
  const sanitizedDomain = pdfText(rawDomain, 'site').replace(/[^a-zA-Z0-9.-]/g, '-');
  const datePart = new Date(reportData.scanDate || Date.now()).toISOString().split('T')[0];

  return `Webisafe_Rapport_${sanitizedDomain}_${datePart}.pdf`;
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

export function generatePDF(reportData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  doc.setFillColor(21, 102, 240);
  doc.rect(0, 0, pageWidth, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('WEBISAFE', margin, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text("Rapport d'Audit Web Complet", margin, 35);

  yPos = 65;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  doc.text(`Site analyse : ${pdfText(reportData.url || reportData.domain)}`, margin, yPos);
  yPos += 8;
  doc.text(`Date de l'audit : ${pdfText(formatDate(reportData.scanDate))}`, margin, yPos);
  yPos += 8;
  doc.text('Genere par : Webisafe - webisafe.ci', margin, yPos);

  yPos += 25;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Score Global', pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;
  const scoreColor = getScoreColor(reportData.scores.global);
  const rgb = hexToRgb(scoreColor);
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.circle(pageWidth / 2, yPos + 15, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(`${reportData.scores.global}`, pageWidth / 2, yPos + 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text('/100', pageWidth / 2, yPos + 26, { align: 'center' });

  yPos += 50;
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(12);
  doc.text(pdfText(getScoreLabel(reportData.scores.global)), pageWidth / 2, yPos, { align: 'center' });

  yPos += 20;
  const categories = [
    { name: 'Performance', score: reportData.scores.performance },
    { name: 'Securite', score: reportData.scores.security },
    { name: 'SEO', score: reportData.scores.seo },
    { name: 'UX Mobile', score: reportData.scores.ux },
  ];

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Categorie', 'Score', 'Statut']],
    body: categories.map((cat) => [
      pdfCell(cat.name),
      `${cat.score}/100`,
      cat.score >= 75 ? 'Bon' : cat.score >= 50 ? 'A ameliorer' : 'Critique',
    ]),
    headStyles: { fillColor: [21, 102, 240], fontSize: 11 },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [240, 245, 255] },
  });

  doc.addPage();
  yPos = 20;
  addSectionHeader(doc, 'Performance', yPos, margin);
  yPos += 15;

  const perfData = [
    ['Temps de chargement', reportData.performance.loadTime],
    ['Taille de la page', reportData.performance.pageSize],
    ['LCP (Largest Contentful Paint)', reportData.performance.lcp],
    ['FID (First Input Delay)', reportData.performance.fid],
    ['CLS (Cumulative Layout Shift)', reportData.performance.cls],
    ['TTFB (Time To First Byte)', reportData.performance.ttfb || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Metrique', 'Valeur']],
    body: perfData.map(([label, value]) => [pdfCell(label), pdfCell(value)]),
    headStyles: { fillColor: [21, 102, 240] },
    bodyStyles: { fontSize: 10 },
  });

  yPos = doc.lastAutoTable.finalY + 20;
  addSectionHeader(doc, 'Securite', yPos, margin);
  yPos += 15;

  const secData = [
    ['HTTPS active', reportData.security.https ? 'Oui' : 'Non'],
    ['Certificat SSL valide', reportData.security.sslValid ? `Oui (${reportData.security.sslDays} jours restants)` : 'Non'],
    ['HSTS active', reportData.security.hsts ? 'Oui' : 'Non'],
    ['Content-Security-Policy', reportData.security.csp ? 'Present' : 'Absent'],
    ['X-Frame-Options', reportData.security.xframe ? 'Present' : 'Absent'],
    ['Malware detecte', reportData.security.malware ? 'Oui - danger' : 'Non'],
  ];

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Verification', 'Resultat']],
    body: secData.map(([label, value]) => [pdfCell(label), pdfCell(value)]),
    headStyles: { fillColor: [21, 102, 240] },
    bodyStyles: { fontSize: 10 },
  });

  doc.addPage();
  yPos = 20;
  addSectionHeader(doc, 'SEO', yPos, margin);
  yPos += 15;

  const seoData = [
    ['Balise Title', reportData.seo.titleOk ? `Presente (${reportData.seo.titleLength} car.)` : 'Absente ou incorrecte'],
    ['Meta Description', reportData.seo.descriptionOk ? 'Presente' : 'Absente'],
    ['Images sans ALT', `${reportData.seo.altMissing} image(s)`],
    ['Sitemap.xml', reportData.seo.sitemapOk ? 'Trouve' : 'Non trouve'],
    ['Robots.txt', reportData.seo.robotsTxtOk ? 'Trouve' : 'Non trouve'],
    ['Balise H1', reportData.seo.h1Ok ? 'Correcte' : 'Probleme detecte'],
  ];

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Critere', 'Resultat']],
    body: seoData.map(([label, value]) => [pdfCell(label), pdfCell(value)]),
    headStyles: { fillColor: [21, 102, 240] },
    bodyStyles: { fontSize: 10 },
  });

  yPos = doc.lastAutoTable.finalY + 20;
  addSectionHeader(doc, 'Experience Mobile', yPos, margin);
  yPos += 15;

  const uxData = [
    ['Design responsive', reportData.ux.responsive ? 'Oui' : 'Non'],
    ['Texte lisible sans zoom', reportData.ux.textReadable ? 'Oui' : 'Non'],
    ['Elements tactiles espaces', reportData.ux.tapTargets ? 'Oui' : 'Non'],
    ["Temps d'interactivite", reportData.ux.timeToInteractive],
    ['Balise Viewport', reportData.ux.viewport ? 'Presente' : 'Absente'],
  ];

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Critere', 'Resultat']],
    body: uxData.map(([label, value]) => [pdfCell(label), pdfCell(value)]),
    headStyles: { fillColor: [21, 102, 240] },
    bodyStyles: { fontSize: 10 },
  });

  doc.addPage();
  yPos = 20;
  addSectionHeader(doc, "Plan d'Action Recommande", yPos, margin);
  yPos += 15;

  if (reportData.recommendations) {
    reportData.recommendations.forEach((rec, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      const priorityColors = {
        CRITIQUE: [239, 68, 68],
        IMPORTANT: [249, 115, 22],
        AMELIORATION: [34, 197, 94],
      };
      const pColor = priorityColors[rec.priority] || [100, 100, 100];

      doc.setFillColor(pColor[0], pColor[1], pColor[2]);
      doc.roundedRect(margin, yPos, 25, 6, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text(pdfText(rec.priority), margin + 12.5, yPos + 4, { align: 'center' });

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(pdfText(`${index + 1}. ${rec.title}`), margin + 28, yPos + 5);

      yPos += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      const descLines = doc.splitTextToSize(pdfText(rec.description || rec.impact), contentWidth - 5);
      doc.text(descLines, margin + 5, yPos);
      yPos += descLines.length * 4 + 3;

      doc.setTextColor(21, 102, 240);
      doc.text(pdfText(`-> ${rec.action}`), margin + 5, yPos);
      yPos += 5;

      doc.setTextColor(120, 120, 120);
      doc.text(
        pdfText(`Difficulte: ${rec.difficulty} - Temps estime: ${rec.time}`),
        margin + 5,
        yPos
      );
      yPos += 10;
    });
  }

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      pdfText(`Webisafe - Rapport d'audit web - webisafe.ci - Page ${i}/${totalPages}`),
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const filename = buildPdfFilename(reportData);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    downloadPdfBlob(doc, filename);
  } else {
    doc.save(filename);
  }

  return filename;
}

function addSectionHeader(doc, title, yPos, margin) {
  doc.setFillColor(21, 102, 240);
  doc.rect(margin, yPos, 3, 10, 'F');
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfText(title), margin + 8, yPos + 8);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
