import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { extractDomain } from './validators';

/**
 * R.8 — Génère un PDF "Plan de Correction" focalisé sur les actions à mener,
 * regroupées par priorité et catégorie. Très utile à imprimer/partager avec
 * une équipe technique ou un freelance.
 *
 * Léger (jsPDF côté client) — pas besoin de Puppeteer. Génération instantanée
 * sans appel serveur.
 *
 * @param {Object} scan - scan complet (incluant scan.results.recommendations
 *                        ou scan.recommendations).
 * @param {Object} [options]
 * @param {Object} [options.branding] - branding agence (logo_url, primary_color,
 *                                      agency_name, agency_email, footer_text).
 * @returns {Blob} PDF blob (également déclenche le download via le navigateur).
 */
export async function generateCorrectionPlanPDF(scan, options = {}) {
  if (!scan) throw new Error('Scan requis');

  const branding = options.branding || null;
  const primaryColor = (branding?.enabled && branding?.primary_color) || '#1566F0';
  const agencyName = (branding?.enabled && branding?.agency_name) || 'Webisafe';
  const footerText =
    (branding?.enabled && branding?.footer_text) ||
    '© 2026 Webisafe — Plan de Correction généré automatiquement';

  const rgb = hexToRgb(primaryColor);
  const recommendations = collectRecommendations(scan);
  const grouped = groupByPriorityAndCategory(recommendations);
  const domain = extractDomain(scan.url || scan.site_url || '');
  const scanDate = scan.scan_date || scan.scanDate || scan.created_at || new Date().toISOString();

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Cover ───────────────────────────────────────────────────────────────
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(0, 0, pageWidth, 140, 'F');

  // Logo agence (si disponible et chargeable)
  if (branding?.enabled && branding.logo_url) {
    try {
      const img = await loadImage(branding.logo_url);
      const ratio = img.width / img.height;
      const h = 40;
      const w = h * ratio;
      doc.addImage(img, 'PNG', 40, 30, w, h);
    } catch {
      /* logo non chargeable : on continue sans */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(agencyName.toUpperCase(), 40, 110);

  doc.setFontSize(28);
  doc.text('Plan de Correction', 40, 195);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text(`Site : ${domain}`, 40, 225);
  doc.text(
    `Audit du : ${new Date(scanDate).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`,
    40,
    245
  );

  // Synthèse
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const stats = {
    critical: grouped.critical?.length || 0,
    high: grouped.high?.length || 0,
    medium: grouped.medium?.length || 0,
    low: grouped.low?.length || 0,
  };
  const total = stats.critical + stats.high + stats.medium + stats.low;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Synthèse des corrections à mener', 40, 290);

  // Stats boxes
  const boxY = 305;
  const boxW = (pageWidth - 100) / 4;
  drawStatBox(doc, 40, boxY, boxW - 10, stats.critical, 'Critiques', '#EF4444');
  drawStatBox(doc, 40 + boxW, boxY, boxW - 10, stats.high, 'Élevées', '#F97316');
  drawStatBox(doc, 40 + boxW * 2, boxY, boxW - 10, stats.medium, 'Moyennes', '#F59E0B');
  drawStatBox(doc, 40 + boxW * 3, boxY, boxW - 10, stats.low, 'Basses', '#3B82F6');

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  const intro = total === 0
    ? "Aucune recommandation prioritaire détectée. Maintenez vos bonnes pratiques."
    : `Ce document liste les ${total} actions correctives identifiées lors de l'audit, regroupées par niveau de priorité. Pour chaque action, vous trouverez le contexte, l'impact, et les étapes recommandées.`;
  const introLines = doc.splitTextToSize(intro, pageWidth - 80);
  doc.text(introLines, 40, 410);

  if (total === 0) {
    addFooter(doc, footerText, 1, 1);
    return saveBlob(doc, scan);
  }

  // ── Pages détaillées par priorité ──────────────────────────────────────
  const priorityOrder = ['critical', 'high', 'medium', 'low'];
  const priorityLabels = {
    critical: 'Priorité critique',
    high: 'Priorité élevée',
    medium: 'Priorité moyenne',
    low: 'Priorité basse',
  };
  const priorityColors = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#F59E0B',
    low: '#3B82F6',
  };

  let pageIndex = 1;
  for (const prio of priorityOrder) {
    const items = grouped[prio] || [];
    if (items.length === 0) continue;

    doc.addPage();
    pageIndex++;

    // Header section priorité
    const pColor = hexToRgb(priorityColors[prio]);
    doc.setFillColor(pColor.r, pColor.g, pColor.b);
    doc.rect(0, 0, pageWidth, 60, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(priorityLabels[prio], 40, 38);
    doc.setFontSize(10);
    doc.text(`${items.length} action${items.length > 1 ? 's' : ''} à mener`, pageWidth - 40, 38, {
      align: 'right',
    });

    // Tableau des actions
    const tableData = items.map((r, i) => [
      String(i + 1),
      sanitize(r.category || 'Général'),
      sanitize(r.title || r.titre || 'Action à définir'),
      sanitize(extractActionableSteps(r)),
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['#', 'Catégorie', 'Action', 'Étapes recommandées']],
      body: tableData,
      headStyles: {
        fillColor: [pColor.r, pColor.g, pColor.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 28, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 150, fontStyle: 'bold' },
        3: { cellWidth: 'auto' },
      },
      margin: { left: 40, right: 40, top: 80, bottom: 60 },
      didDrawPage: () => addFooter(doc, footerText, pageIndex, doc.internal.getNumberOfPages()),
    });
  }

  // Footer cover
  doc.setPage(1);
  addFooter(doc, footerText, 1, doc.internal.getNumberOfPages());

  return saveBlob(doc, scan);
}

// ── Helpers ──────────────────────────────────────────────────────────────

function collectRecommendations(scan) {
  const candidates = [
    scan?.recommendations,
    scan?.results?.recommendations,
    scan?.results?.business_recommendations,
    scan?.results?.seo?.business_recommendations,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  // Fallback : extraction depuis les checks faillis
  const checks = scan?.results?.security?.checks || scan?.checks || [];
  if (Array.isArray(checks)) {
    return checks
      .filter((c) => c.status === 'fail' || c.status === 'warn')
      .map((c) => ({
        title: c.label || c.name,
        category: c.category || 'Sécurité',
        priority: c.status === 'fail' ? 'high' : 'medium',
        description: c.recommendation || c.detail || '',
      }));
  }
  return [];
}

function groupByPriorityAndCategory(recs) {
  const groups = { critical: [], high: [], medium: [], low: [] };
  for (const rec of recs) {
    const prio = normalizePriority(rec.priority || rec.severity || rec.level);
    groups[prio].push(rec);
  }
  return groups;
}

function normalizePriority(p) {
  const v = String(p || '').toLowerCase();
  if (v.includes('critic')) return 'critical';
  if (v.includes('high') || v === 'élevée' || v === 'haute' || v === 'urgent') return 'high';
  if (v.includes('med') || v === 'moyenne' || v === 'normal') return 'medium';
  if (v.includes('low') || v === 'basse' || v === 'faible') return 'low';
  return 'medium';
}

function extractActionableSteps(rec) {
  if (rec.steps && Array.isArray(rec.steps)) {
    return rec.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  }
  if (rec.solution) return rec.solution;
  if (rec.recommendation) return rec.recommendation;
  if (rec.description) return rec.description;
  if (rec.message) return rec.message;
  return 'Voir le rapport complet pour les détails.';
}

function drawStatBox(doc, x, y, w, value, label, color) {
  const rgb = hexToRgb(color);
  doc.setFillColor(rgb.r, rgb.g, rgb.b, 0.1);
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.roundedRect(x, y, w, 60, 6, 6, 'FD');
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(String(value), x + w / 2, y + 30, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(label, x + w / 2, y + 48, { align: 'center' });
}

function addFooter(doc, text, currentPage, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200, 200, 200);
  doc.line(40, pageHeight - 35, pageWidth - 40, pageHeight - 35);
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.setFont('helvetica', 'normal');
  doc.text(text, 40, pageHeight - 20);
  doc.text(`Page ${currentPage} / ${totalPages}`, pageWidth - 40, pageHeight - 20, { align: 'right' });
}

function hexToRgb(hex) {
  const h = (hex || '#1566F0').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function sanitize(text) {
  if (text == null) return '';
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 500);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

function saveBlob(doc, scan) {
  const domain = extractDomain(scan?.url || scan?.site_url || 'site') || 'site';
  const date = new Date().toISOString().slice(0, 10);
  const filename = `Plan-de-Correction_${domain}_${date}.pdf`;
  const blob = doc.output('blob');

  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return blob;
}
