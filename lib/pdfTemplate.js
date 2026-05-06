import { buildPdfAuditModel, scoreColor, scoreDisplay, scoreLabel, scoreValue } from './pdfModel.js';
import { buildChartsScript } from './charts/chartBuilder.js';

const COLORS = {
  pageBg: '#0A0F1E',
  darkNavy: '#0F172A',
  cardBg: '#1E293B',
  cardDeep: '#0B1424',
  panelLight: '#253649',
  border: '#334155',
  borderDim: '#1F2A3D',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#1566F0',
  primaryLight: '#3B82F6',
  success: '#22C55E',
  warning: '#F97316',
  danger: '#EF4444',
};

const h = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const rows = (value) => Array.isArray(value) ? value : [];

function statusClass(status = '') {
  const normalized = String(status);
  if (normalized === 'OK') return 'ok';
  if (normalized === 'Critique') return 'critical';
  if (normalized === 'À corriger' || normalized === 'Avertissement') return 'warning';
  return 'muted';
}

function badge(status) {
  return `<span class="badge ${statusClass(status)}">${h(status || 'Non mesuré')}</span>`;
}

function brand() {
  return `<div class="brand"><span></span><strong>WEBISAFE</strong></div>`;
}

function header(model, title) {
  return `<div class="page-header">${brand()}<p>${h(String(title).toUpperCase())} · ${h(model.domain)}</p></div>`;
}

function footer(model) {
  return `<div class="page-footer"><p>Confidentiel · webisafe.ci · ${h(model.scanDateLabel)}</p><p></p></div>`;
}

function page(model, title, eyebrow, heading, subtitle, content) {
  return `<section class="page">${header(model, title)}<main><p class="eyebrow">${h(eyebrow)}</p><h1>${h(heading)}</h1><p class="subtitle">${h(subtitle)}</p>${content}</main>${footer(model)}</section>`;
}

function panel(title, content, accent = false) {
  return `<div class="panel ${accent ? 'accent' : ''}">${title ? `<h3>${h(title)}</h3>` : ''}${content}</div>`;
}

function metricCard(item) {
  return `<div class="metric"><p>${h(item.label)}</p><strong>${h(item.value)}</strong>${badge(item.status)}${item.note ? `<small>${h(item.note)}</small>` : ''}</div>`;
}

function metricGrid(metrics) {
  return `<div class="metric-grid">${rows(metrics).map(metricCard).join('')}</div>`;
}

function scoreBar(label, value, caption) {
  const score = scoreValue(value);
  const color = scoreColor(value);
  return `<div class="score-box"><div class="score-row"><div><p>${h(label)}</p><strong style="color:${color}">${score === null ? '—' : score}</strong><span>/100</span><em>${h(score === null ? 'Non mesuré' : scoreLabel(score))}</em></div>${caption ? `<small>${h(caption)}</small>` : ''}</div><div class="track"><i style="width:${score ?? 0}%;background:${color}"></i></div><div class="ticks"><span>0</span><span>40 Critique</span><span>65 À corriger</span><span>85 Bon</span><span>100</span></div></div>`;
}

function miniScore(item) {
  const score = scoreValue(item.score);
  const color = scoreColor(item.score);
  return `<div class="mini-score"><div><span style="background:${color}"></span><p>${h(item.label)}</p><strong style="color:${color}">${h(scoreDisplay(score))}</strong></div><div class="track small"><i style="width:${score ?? 0}%;background:${color}"></i></div></div>`;
}

function dataTable(columns, values, widths = [], emptyText = 'Aucune donnée détaillée disponible.') {
  const visibleRows = rows(values).filter((line) => Array.isArray(line) && line.some(Boolean));
  if (!visibleRows.length) return `<p class="empty">${h(emptyText)}</p>`;
  return `<table><thead><tr>${columns.map((column, index) => `<th style="width:${widths[index] || 'auto'}">${h(column)}</th>`).join('')}</tr></thead><tbody>${visibleRows.map((line) => `<tr>${line.map((cell, index) => `<td style="width:${widths[index] || 'auto'}">${index === line.length - 1 && columns[index]?.toLowerCase().includes('statut') ? badge(cell) : h(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function statusLegend() {
  return panel('Comment lire les statuts ?', ['OK', 'À corriger', 'Critique', 'Non mesuré'].map((status) => `<div class="legend-row">${badge(status)}<p>${h(status === 'OK' ? 'Le point est conforme. Aucune action urgente n’est nécessaire.' : status === 'À corriger' ? 'Le point doit être amélioré pour renforcer la sécurité, la performance ou la confiance.' : status === 'Critique' ? 'Risque important. Une correction rapide est recommandée.' : 'La donnée n’a pas pu être vérifiée pendant l’analyse.')}</p></div>`).join(''), true);
}

function alertCard(alert) {
  return `<div class="alert ${statusClass(alert.severity)}"><strong>${h(alert.title)}</strong><p>${h(alert.message || alert.recommendation || '')}</p></div>`;
}

function coverPage(model) {
  const score = scoreValue(model.scores.global);
  return `<section class="cover"><div class="orb one"></div><div class="orb two"></div><div class="cover-top">${brand()}<p>Rapport d'audit · Confidentiel</p></div><div class="cover-hero"><p class="eyebrow">Audit Webisafe Premium</p><h1>Analyse complète<br><span>de votre site</span></h1><h2>${h(model.domain)}</h2><p>${h(model.scanDateLabel)}</p><div class="cover-score"><canvas id="scoreGauge"></canvas><div><strong style="color:${h(model.cover.scoreColor)}">${score === null ? '—' : score}</strong><span>/100</span><em>${h(model.cover.scoreLabel)}</em></div></div></div><div class="cover-scores">${model.cover.categoryScores.slice(0, 4).map((item) => `<div><strong style="color:${scoreColor(item.score)}">${scoreValue(item.score) ?? '—'}</strong><span>${h(item.label)}</span></div>`).join('')}</div><div class="cover-meta">${model.cover.metadata.map(([label, value]) => `<p><span>${h(label)}</span><strong>${h(value)}</strong></p>`).join('')}</div><div class="cover-footer"><p>Document confidentiel — Usage interne uniquement</p><strong>webisafe.ci</strong></div></section>`;
}

function executivePage(model) {
  const alerts = model.criticalAlerts.length ? `<h3 class="section-label">Alertes à traiter en priorité</h3>${model.criticalAlerts.slice(0, 3).map(alertCard).join('')}` : '';
  return page(model, 'Résumé exécutif', 'Vue d\'ensemble', 'Résumé exécutif', 'Synthèse des risques, de la performance, du SEO et de l\'expérience mobile de votre site.', `${scoreBar('Score global consolidé', model.scores.global, 'Indice Webisafe basé sur les dimensions mesurées durant l\'audit.')}<div class="charts-grid"><div class="chart-card"><h3>Scores par catégorie</h3><canvas id="categoryRadar"></canvas></div><div class="chart-card"><h3>Répartition des statuts</h3><canvas id="statusDonut"></canvas></div></div><div class="two-cols"><div>${panel('Scores par catégorie', model.cover.categoryScores.map(miniScore).join(''), true)}</div><div>${panel('Synthèse', model.narrative.paragraphs.map((item) => `<p class="text">${h(item)}</p>`).join(''))}</div></div>${statusLegend()}${alerts}`);
}

function performancePage(model) {
  const section = model.sections.performance;
  const serverRows = [
    section.serverLocation.city ? ['Ville', section.serverLocation.city] : null,
    section.serverLocation.country ? ['Pays', section.serverLocation.country] : null,
    section.serverLocation.isp ? ['Hébergeur', section.serverLocation.isp] : null,
    section.serverLocation.ip ? ['IP', section.serverLocation.ip] : null,
    section.serverLocation.message ? ['Latence', section.serverLocation.message] : null,
    section.serverLocation.recommendation ? ['Recommandation', section.serverLocation.recommendation] : null,
  ].filter(Boolean);
  return page(model, 'Performance', 'Section 01 · Core Web Vitals', 'Performance', 'Vitesse perçue, stabilité visuelle, poids de page et opportunités d\'optimisation.', `${scoreBar('Score performance', section.score, 'Une vitesse faible pénalise directement la conversion, surtout sur mobile.')}${metricGrid(section.metrics)}<div class="two-cols"><div>${panel('Localisation serveur', dataTable(['Signal', 'Valeur'], serverRows, ['36%', '64%']))}</div><div>${panel('Optimisations prioritaires', dataTable(['Optimisation', 'Détail', 'Gain'], section.opportunities.map((item) => [item.title, item.description, item.savings]), ['34%', '48%', '18%']))}</div></div>`);
}

function securityPage(model) {
  const section = model.sections.security;
  const sensitiveRows = [
    section.sensitiveFiles.alert_message ? ['Alerte', section.sensitiveFiles.alert_message, section.sensitiveFiles.critical ? 'Critique' : 'À corriger'] : null,
    ...section.sensitiveFiles.exposed_files.map((file) => ['Fichier exposé', file, 'Critique']),
  ].filter(Boolean);
  return page(model, 'Sécurité', 'Section 02 · Conformité OWASP', 'Sécurité', 'HTTPS, certificat SSL, malware, headers de sécurité, cookies et fichiers sensibles.', `${scoreBar('Score sécurité', section.score, 'Les signaux critiques sont priorisés pour réduire le risque utilisateur.')}${section.sensitiveFiles.critical ? alertCard({ title: `Fichiers sensibles exposés · ${section.sensitiveFiles.exposed_files.length} fichier(s)`, message: section.sensitiveFiles.alert_message || 'Des fichiers confidentiels sont accessibles publiquement sur votre serveur.', severity: 'Critique' }) : ''}${metricGrid(section.metrics)}${statusLegend()}<div class="chart-card wide"><h3>Headers de sécurité</h3><canvas id="headersBar"></canvas></div><div class="two-cols"><div>${panel('Headers de sécurité manquants', dataTable(['Header', 'Détail', 'Statut'], section.missingHeaders.map((item) => [item.header, item.message, item.severity]), ['32%', '48%', '20%'], 'Tous les headers recommandés sont présents.'))}</div><div>${panel('Cookies & fichiers sensibles', dataTable(['Élément', 'Détail', 'Statut'], [...section.cookieIssues.map((item) => ['Cookie', item, 'À corriger']), ...sensitiveRows], ['28%', '52%', '20%'], 'Aucun cookie à risque ni fichier sensible exposé.'))}</div></div>`);
}

function advancedPage(model) {
  const section = model.sections.advancedSecurity;
  const emailRows = [
    section.email.spf ? ['SPF', section.email.spf, section.email.spf === 'Présent' ? 'OK' : 'À corriger'] : null,
    section.email.dmarc ? ['DMARC', section.email.dmarc, section.email.dmarc === 'Présent' ? 'OK' : 'À corriger'] : null,
    section.email.dkim ? ['DKIM', section.email.dkim, section.email.dkim === 'Présent' ? 'OK' : 'À corriger'] : null,
    section.email.missing.length ? ['Manquants', section.email.missing.join(', '), 'À corriger'] : null,
  ].filter(Boolean);
  return page(model, 'Sécurité avancée', 'Section 03 · Contrôles étendus', 'Sécurité avancée', 'WAF, sous-domaines, takeover, supply chain, sécurité email SPF/DMARC/DKIM et typosquatting.', `${section.score !== null ? scoreBar('Score sécurité avancée', section.score, 'Agrégation des checks avancés disponibles.') : panel('Score sécurité avancée', '<p class="empty">Score global non mesuré.</p>')}<div class="two-cols"><div>${panel('Checks principaux', dataTable(['Check', 'Résultat', 'Statut'], section.summaryRows, ['35%', '45%', '20%']))}</div><div>${panel('Sécurité email', dataTable(['Élément', 'Résultat', 'Statut'], emailRows, ['30%', '50%', '20%']))}</div></div>${panel('Détail des vérifications', dataTable(['Check', 'Détail', 'Statut'], section.checks.map((item) => [item.name, item.detail, item.status]), ['30%', '50%', '20%']))}`);
}

function seoPage(model) {
  const section = model.sections.seo;
  return page(model, 'SEO', 'Section 04 · Référencement', 'SEO Technique', 'Structure de page, indexabilité, métadonnées et signaux de partage social.', `${scoreBar('Score SEO', section.score, 'Un SEO technique propre améliore la visibilité et la qualité du trafic organique.')}${metricGrid(section.metrics)}<div class="two-cols"><div>${panel('Signaux complémentaires', dataTable(['Critère', 'Valeur', 'Statut'], section.extraRows, ['34%', '44%', '22%']))}</div><div>${panel('Lecture SEO', '<p class="text">Les absences critiques doivent être corrigées avant toute optimisation éditoriale.</p><p class="text">La priorité est de rendre les pages lisibles, indexables et correctement présentées dans les moteurs de recherche.</p>')}</div></div>`);
}

function uxPage(model) {
  const section = model.sections.ux;
  return page(model, 'UX Mobile', 'Section 05 · Expérience utilisateur', 'UX Mobile', 'Accessibilité, confort tactile, zoom mobile, médias et obstacles à la conversion.', `${scoreBar('Score UX Mobile', section.score, 'La qualité mobile influence la confiance, le taux de rebond et les demandes entrantes.')}${metricGrid([...section.metrics, section.tapTargets])}${panel('Problèmes UX détectés', dataTable(['Problème', 'Impact', 'Statut'], section.issues.map((item) => [item.message, item.impact || item.type, item.severity]), ['42%', '40%', '18%'], 'Aucun problème UX majeur détecté.'))}`);
}

function actionCard(item) {
  const level = item.rank === 1 ? 'critical' : item.rank === 2 ? 'warning' : 'primary';
  return `<div class="action ${level}"><div>${badge(item.priority)}</div><h4>${h(item.title)}</h4>${item.description ? `<p>${h(item.description)}</p>` : ''}${item.action ? `<strong>→ ${h(item.action)}</strong>` : ''}${item.impactBusiness ? `<p>Impact business : ${h(item.impactBusiness)}</p>` : ''}<small>${item.difficulty ? `Difficulté : ${h(item.difficulty)}` : ''}${item.time ? ` · Temps : ${h(item.time)}` : ''}</small></div>`;
}

function actionGroup(title, items) {
  return `<div><h3 class="section-label">${h(title)}</h3>${items.slice(0, 2).length ? items.slice(0, 2).map(actionCard).join('') : panel('', '<p class="empty">Aucune action dans cette catégorie.</p>')}</div>`;
}

function actionPage(model) {
  const g = model.recommendationsByPriority;
  const alerts = model.criticalAlerts.length ? panel('Alertes à surveiller', dataTable(['Alerte', 'Détail', 'Statut'], model.criticalAlerts.map((item) => [item.title, item.message || item.recommendation, item.severity]), ['32%', '48%', '20%']), true) : '';
  return page(model, 'Plan d\'action', 'Section 06 · Feuille de route', 'Plan d\'action priorisé', 'Priorités de correction classées pour transformer ce rapport en feuille de route exploitable.', `${alerts}<div class="two-cols">${actionGroup('URGENT · À traiter immédiatement', g.urgent)}${actionGroup('IMPORTANT · À planifier', g.important)}</div><div class="two-cols">${actionGroup('AMÉLIORATIONS · Optimisations', g.improvement)}<div>${panel('Méthode de correction recommandée', '<p class="text">1. Commencer par les risques critiques.</p><p class="text">2. Poursuivre avec les freins business importants.</p><p class="text">3. Finir avec les améliorations de confort.</p>')}</div></div>`);
}

function closingPage(model) {
  return page(model, 'Prochaine étape', 'Section 07 · Passez à l\'action', 'Transformez ce rapport en résultats', 'Nos experts peuvent corriger pour vous tous les points identifiés dans ce rapport.', `<div class="cta"><p>Accompagnement Webisafe</p><h2>Corrigez les points critiques avec nous</h2><span>Sécurité, performance, SEO, UX mobile : nos experts prennent en charge les corrections et vous livrent un site optimisé.</span><strong>${h(model.domain)}</strong></div><div class="two-cols"><div>${panel('Ce que nous corrigeons pour vous', dataTable(['Domaine', 'Objectif', 'Priorité'], [['Sécurité', 'Réduire failles et expositions', 'Critique'], ['Performance', 'Accélérer le chargement mobile', 'À corriger'], ['SEO', 'Améliorer les signaux techniques', 'À corriger'], ['UX Mobile', 'Réduire les freins de conversion', 'À corriger']], ['28%', '52%', '20%']), true)}</div><div><div class="whatsapp"><p>Contact rapide</p><h3>Parlons de votre site</h3><strong>WhatsApp · +225 05 75 96 20 20</strong><span>Envoyez-nous votre rapport. Nous vous répondons sous 2h avec un devis personnalisé.</span></div>${panel('Livrable attendu', '<p class="text">Après correction : risques réduits, priorités traitées et rapport exploitable pour mesurer les progrès.</p><p class="text primary">→ webisafe.ci</p>')}</div></div><div class="final-brand">${brand()}<p>Audits de sites web pour PME africaines</p></div>`);
}

function styles() {
  return `<style>
    @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:${COLORS.pageBg};font-family:Inter,Arial,sans-serif;color:${COLORS.textPrimary};-webkit-print-color-adjust:exact;print-color-adjust:exact}.page,.cover{position:relative;width:210mm;min-height:297mm;padding:22mm 14mm 18mm;background:radial-gradient(circle at 92% 8%,rgba(21,102,240,.18),transparent 28%),linear-gradient(180deg,#0A0F1E 0%,#0B1120 100%);page-break-after:always;overflow:hidden}.page main{position:relative;z-index:2}.page-header,.page-footer{position:absolute;left:14mm;right:14mm;display:flex;align-items:center;justify-content:space-between;z-index:5}.page-header{top:8mm;padding-bottom:3mm;border-bottom:1px solid ${COLORS.border}}.page-footer{bottom:8mm;padding-top:3mm;border-top:1px solid ${COLORS.borderDim};color:${COLORS.textMuted};font-size:7.5px}.brand{display:flex;align-items:center;gap:7px}.brand span{width:10px;height:10px;border-radius:3px;background:linear-gradient(135deg,#38BDF8,${COLORS.primary});box-shadow:0 0 18px rgba(21,102,240,.75)}.brand strong{font-size:10px;letter-spacing:1.5px}.page-header p{font-size:7.8px;letter-spacing:.6px;color:${COLORS.textSecondary}}.eyebrow{margin:0 0 9px;color:${COLORS.primaryLight};font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:1.9px}h1{margin:0 0 8px;font-size:28px;line-height:1.05;letter-spacing:-.8px}.subtitle{max-width:520px;margin:0 0 16px;color:${COLORS.textSecondary};font-size:10px;line-height:1.55}.panel,.metric,.chart-card,.score-box,.action{background:linear-gradient(145deg,rgba(30,41,59,.96),rgba(15,23,42,.98));border:1px solid ${COLORS.border};border-radius:14px;box-shadow:0 18px 42px rgba(0,0,0,.22);padding:13px;margin-bottom:11px}.panel.accent{border-left:4px solid ${COLORS.primary}}.panel h3,.chart-card h3,.section-label{margin:0 0 10px;color:${COLORS.textPrimary};font-size:11px;letter-spacing:.3px}.text,.empty{margin:0 0 7px;color:${COLORS.textSecondary};font-size:8.7px;line-height:1.55}.empty{color:${COLORS.textMuted};font-style:italic}.primary{color:${COLORS.primaryLight}!important;font-weight:800}.two-cols,.charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.charts-grid{margin-bottom:13px}.chart-card{height:225px}.chart-card.wide{height:190px}.chart-card canvas{width:100%!important;height:165px!important}.metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.metric{margin-bottom:0;min-height:92px}.metric p{margin:0 0 6px;color:${COLORS.textSecondary};font-size:7.4px;font-weight:800;text-transform:uppercase;letter-spacing:.8px}.metric strong{display:block;margin-bottom:7px;color:${COLORS.textPrimary};font-size:15px}.metric small{display:block;margin-top:7px;color:${COLORS.textMuted};font-size:7px;line-height:1.4}.badge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;font-size:6.8px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;border:1px solid}.badge.ok{background:#052E1A;border-color:#14532D;color:#86EFAC}.badge.warning{background:#3A2507;border-color:#92400E;color:#FCD34D}.badge.critical{background:#3B0A12;border-color:#991B1B;color:#FCA5A5}.badge.muted{background:${COLORS.cardBg};border-color:${COLORS.border};color:${COLORS.textSecondary}}.score-row{display:flex;justify-content:space-between;gap:20px;align-items:flex-end}.score-row p{margin:0 0 5px;color:${COLORS.textMuted};font-size:7.8px;font-weight:900;letter-spacing:1.3px;text-transform:uppercase}.score-row strong{font-size:36px;line-height:1}.score-row span{margin-left:4px;color:${COLORS.textMuted};font-size:13px;font-weight:800}.score-row em{display:block;margin-top:3px;color:${COLORS.textSecondary};font-style:normal;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.8px}.score-row small{width:170px;color:${COLORS.textSecondary};font-size:8.3px;line-height:1.45;text-align:right}.track{height:8px;margin-top:11px;background:#020617;border:1px solid ${COLORS.borderDim};border-radius:999px;overflow:hidden}.track i{display:block;height:100%;border-radius:999px}.track.small{height:6px;margin-top:5px}.ticks{display:flex;justify-content:space-between;margin-top:5px;color:#475569;font-size:6.4px}.mini-score{margin-bottom:10px}.mini-score>div:first-child{display:flex;align-items:center;gap:6px}.mini-score span{width:6px;height:6px;border-radius:50%}.mini-score p{margin:0;flex:1;color:${COLORS.textPrimary};font-size:8.5px;font-weight:800}.mini-score strong{font-size:8.7px}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid ${COLORS.border};border-radius:10px}th{padding:7px 8px;background:${COLORS.cardDeep};color:${COLORS.primaryLight};font-size:6.8px;text-align:left;text-transform:uppercase;letter-spacing:.7px}td{padding:7px 8px;border-top:1px solid ${COLORS.borderDim};color:${COLORS.textSecondary};font-size:7.2px;line-height:1.35;vertical-align:top}tr:nth-child(even) td{background:rgba(15,23,42,.7)}.legend-row{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid ${COLORS.borderDim}}.legend-row:first-child{border-top:0;padding-top:0}.legend-row .badge{width:82px;justify-content:center}.legend-row p{margin:0;flex:1;color:${COLORS.textSecondary};font-size:8px;line-height:1.4}.alert{border-radius:11px;padding:11px 13px;margin-bottom:9px;border:1px solid;border-left-width:4px}.alert strong{font-size:9.5px}.alert p{margin:5px 0 0;font-size:8.2px;line-height:1.45}.alert.critical{background:#3B0A12;border-color:${COLORS.danger};color:#FCA5A5}.alert.warning{background:#3A2507;border-color:${COLORS.warning};color:#FCD34D}.action{border-left:4px solid ${COLORS.primary}}.action.critical{border-left-color:${COLORS.danger}}.action.warning{border-left-color:${COLORS.warning}}.action h4{margin:8px 0 6px;font-size:10.3px}.action p{margin:0 0 6px;color:${COLORS.textSecondary};font-size:8.2px;line-height:1.45}.action strong{display:block;color:${COLORS.primaryLight};font-size:8.3px;line-height:1.4}.action small{display:block;margin-top:8px;padding-top:7px;border-top:1px solid ${COLORS.borderDim};color:${COLORS.textMuted};font-size:7px}.cta{padding:20px;border-radius:18px;margin-bottom:14px;background:linear-gradient(135deg,${COLORS.primary},#0B47B0);box-shadow:0 22px 55px rgba(21,102,240,.28)}.cta p{margin:0 0 9px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:1.8px;color:#DBEAFE}.cta h2{margin:0 0 8px;font-size:18px}.cta span,.cta strong{display:block;color:#EFF6FF;font-size:9.3px;line-height:1.5}.cta strong{margin-top:8px;font-size:11px}.whatsapp{padding:15px;border-radius:15px;margin-bottom:11px;border:1px solid ${COLORS.success};background:#052E1A}.whatsapp p{margin:0 0 8px;color:#86EFAC;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:1.6px}.whatsapp h3{margin:0 0 6px;color:#BBF7D0;font-size:12px}.whatsapp strong{display:block;color:${COLORS.success};font-size:13px;margin-bottom:6px}.whatsapp span{display:block;color:#BBF7D0;font-size:8.4px;line-height:1.5}.final-brand{text-align:center;margin-top:14px;padding-top:14px;border-top:1px solid ${COLORS.border}}.final-brand .brand{justify-content:center}.final-brand p{color:${COLORS.textMuted};font-size:8px}.cover{padding:14mm;background:radial-gradient(circle at 80% 6%,rgba(59,130,246,.38),transparent 24%),radial-gradient(circle at 15% 82%,rgba(34,197,94,.16),transparent 20%),linear-gradient(145deg,#0A0F1E,#0B1424 55%,#020617)}.cover-top,.cover-footer{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${COLORS.border};padding-bottom:14px}.cover-top p,.cover-footer p{color:${COLORS.textSecondary};font-size:8px;text-transform:uppercase;letter-spacing:1.2px}.cover-hero{text-align:center;margin-top:36px}.cover-hero h1{font-size:39px;line-height:1.05;margin-bottom:12px}.cover-hero h1 span{background:linear-gradient(135deg,#38BDF8,#1566F0);-webkit-background-clip:text;color:transparent}.cover-hero h2{margin:0 0 4px;color:${COLORS.primaryLight};font-size:17px}.cover-hero>p:not(.eyebrow){margin:0;color:${COLORS.textMuted};font-size:9px}.cover-score{position:relative;width:180px;height:180px;margin:24px auto}.cover-score canvas{width:180px!important;height:180px!important}.cover-score div{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}.cover-score strong{font-size:48px;line-height:1}.cover-score span{color:${COLORS.textMuted};font-size:13px;font-weight:800}.cover-score em{margin-top:5px;color:${COLORS.textSecondary};font-size:8px;font-style:normal;font-weight:900;text-transform:uppercase;letter-spacing:1.2px}.cover-scores{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:18px}.cover-scores div{padding:13px 8px;text-align:center;border-radius:12px;background:${COLORS.cardBg};border:1px solid ${COLORS.border}}.cover-scores strong{display:block;font-size:24px}.cover-scores span{display:block;margin-top:5px;color:${COLORS.textSecondary};font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.8px}.cover-meta{margin-top:22px;padding:16px;border-radius:14px;background:${COLORS.cardDeep};border:1px solid ${COLORS.border}}.cover-meta p{display:flex;justify-content:space-between;margin:0;padding:6px 0;border-top:1px solid ${COLORS.borderDim};font-size:8.5px}.cover-meta p:first-child{border-top:0}.cover-meta span{color:${COLORS.textMuted}}.cover-meta strong{color:${COLORS.textPrimary}}.cover-footer{position:absolute;left:14mm;right:14mm;bottom:13mm;border-top:1px solid ${COLORS.border};border-bottom:0;padding-top:14px;padding-bottom:0}.cover-footer strong{color:${COLORS.primaryLight};font-size:8px}.orb{position:absolute;border-radius:999px;filter:blur(2px)}.orb.one{width:320px;height:320px;right:-130px;top:-100px;background:rgba(21,102,240,.18)}.orb.two{width:220px;height:220px;left:-90px;bottom:30px;background:rgba(34,197,94,.12)}
  </style>`;
}

export function buildTemplate(scanData, { chartScript = '' } = {}) {
  const model = buildPdfAuditModel(scanData);
  const chartsScript = buildChartsScript(model);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">${styles()}</head><body>${coverPage(model)}${executivePage(model)}${performancePage(model)}${securityPage(model)}${advancedPage(model)}${seoPage(model)}${uxPage(model)}${actionPage(model)}${closingPage(model)}<script>${chartScript}</script><script>${chartsScript}</script></body></html>`;
}
