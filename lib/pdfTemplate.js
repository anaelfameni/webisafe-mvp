import { buildPdfAuditModel, scoreColor, scoreDisplay, scoreLabel, scoreValue } from './pdfModel.js';

const COLORS = {
  page: '#F7F9FC',
  cover: '#07111F',
  navy: '#0F172A',
  muted: '#64748B',
  text: '#E5E7EB',
  ink: '#111827',
  soft: '#F1F5F9',
  border: '#D9E2EF',
  primary: '#1566F0',
  primarySoft: '#EAF2FF',
  success: '#16A34A',
  warning: '#EA580C',
  danger: '#DC2626',
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

function brand(model = null) {
  const branding = model?.agencyBranding;
  const brandName = branding?.enabled ? branding.agency_name : 'WEBISAFE';
  const primaryColor = branding?.enabled ? branding.primary_color : COLORS.primary;
  const logoUrl = branding?.enabled ? branding.logo_url : '';
  if (logoUrl) return `<div class="brand"><img src="${h(logoUrl)}" alt="${h(brandName)}"><strong>${h(brandName)}</strong></div>`;
  return `<div class="brand"><span style="background:${h(primaryColor)};box-shadow:0 0 18px ${h(primaryColor)}66"></span><strong>${h(brandName)}</strong></div>`;
}

function pageHeader(model, title, pageNumber) {
  const footerText = model.agencyBranding?.enabled && model.agencyBranding.footer_text ? model.agencyBranding.footer_text : `${model.report.confidentiality} · ${model.report.id} · ${model.report.brandUrl}`;
  return `<header class="page-header">${brand(model)}<p>${h(title)} · ${h(model.domain)}</p></header><footer class="page-footer"><p>${h(footerText)}</p><p>Page ${pageNumber} / ${model.report.totalPages}</p></footer>`;
}

function sectionIntro(eyebrow, title, subtitle) {
  return `<div class="section-intro"><p>${h(eyebrow)}</p><h1>${h(title)}</h1><span>${h(subtitle)}</span></div>`;
}

function page(model, pageNumber, title, eyebrow, heading, subtitle, content, density = '') {
  return `<section class="page premium-shell ${density}">${pageHeader(model, title, pageNumber)}<main>${sectionIntro(eyebrow, heading, subtitle)}${content}</main></section>`;
}

function keyValueList(items) {
  const values = rows(items).filter((item) => Array.isArray(item) && item.some(Boolean));
  return `<div class="kv-list">${values.map(([label, value]) => `<p><span>${h(label)}</span><strong>${h(value)}</strong></p>`).join('')}</div>`;
}

function categoryScorePill(item) {
  const value = scoreValue(item.score);
  const color = scoreColor(item.score);
  const label = item.status && item.status !== 'OK' ? item.status : value === null ? 'Non mesuré' : scoreLabel(value);
  return `<div class="score-pill"><span>${h(item.label)}</span><strong style="color:${color}">${value ?? '—'}</strong><em>${h(label)}</em></div>`;
}

function scoreBar(label, score, insight = '') {
  const value = scoreValue(score);
  const color = scoreColor(score);
  return `<div class="score-bar"><div><p>${h(label)}</p><strong style="color:${color}">${value ?? '—'}<small>/100</small></strong><span>${h(value === null ? 'Non mesuré' : scoreLabel(value))}</span></div>${insight ? `<em>${h(insight)}</em>` : ''}<i><b style="width:${value ?? 0}%;background:${color}"></b></i></div>`;
}

function scorecardTile(item) {
  const value = scoreValue(item.score);
  const color = scoreColor(item.score);
  const status = item.status === 'OK' ? scoreLabel(item.score) : item.status || scoreLabel(item.score);
  return `<article class="scorecard-card ${statusClass(item.status)}"><div class="scorecard-head"><p>${h(item.label)}</p><strong style="color:${color}">${value ?? '—'}<small>/100</small></strong></div><span class="scorecard-status" style="color:${color}">${h(status)}</span><i><b style="width:${value ?? 0}%;background:${color}"></b></i>${item.insight ? `<em>${h(item.insight)}</em>` : ''}</article>`;
}

function sectionScoreCard(label, score, status, insight = '') {
  return scorecardTile({ label, score, status, insight }).replace('scorecard-card', 'scorecard-card section-score-card');
}

function metricGrid(metrics) {
  return `<div class="metric-grid">${rows(metrics).map((item) => `<div class="metric"><p>${h(item.label)}</p><strong>${h(item.value)}</strong>${badge(item.status)}${item.note ? `<small>${h(item.note)}</small>` : ''}</div>`).join('')}</div>`;
}

function panel(title, content, tone = '') {
  return `<div class="panel ${tone}">${title ? `<h3>${h(title)}</h3>` : ''}${content}</div>`;
}

function bulletList(items) {
  return `<ul class="bullets">${rows(items).map((item) => `<li>${h(item)}</li>`).join('')}</ul>`;
}

function dataTable(columns, values, widths = [], limit = 7) {
  const visibleRows = rows(values).filter((line) => Array.isArray(line) && line.some(Boolean)).slice(0, limit);
  if (!visibleRows.length) return `<p class="empty">Aucune donnée détaillée disponible.</p>`;
  return `<table><thead><tr>${columns.map((column, index) => `<th style="width:${widths[index] || 'auto'}">${h(column)}</th>`).join('')}</tr></thead><tbody>${visibleRows.map((line) => `<tr>${line.map((cell, index) => `<td style="width:${widths[index] || 'auto'}">${index === line.length - 1 && columns[index]?.toLowerCase().includes('statut') ? badge(cell) : h(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function riskCard(risk, index) {
  return `<article class="risk-card ${statusClass(risk.severity)}"><div><span>#${index + 1}</span>${badge(risk.severity)}</div><h3>${h(risk.title)}</h3><dl><dt>Preuve</dt><dd>${h(risk.evidence)}</dd><dt>Impact business</dt><dd>${h(risk.impact)}</dd><dt>Correction recommandée</dt><dd>${h(risk.recommendation)}</dd></dl><footer><strong>${h(risk.priority)}</strong><span>Effort : ${h(risk.effort)}</span></footer></article>`;
}

function actionCard(item) {
  return `<article class="action-card ${statusClass(item.severity)}"><div>${badge(item.severity)}<span>${h(item.timeframe)}</span></div><h3>${h(item.title)}</h3><p>${h(item.action)}</p><small>Impact attendu : ${h(item.impact)}</small><footer><strong>${h(item.webisafe)}</strong><span>Effort : ${h(item.effort)}</span></footer></article>`;
}

function technicalFinding(title, severity, evidence, impact, recommendation, effort = 'Intermédiaire') {
  return `<article class="finding ${statusClass(severity)}"><header><h3>${h(title)}</h3>${badge(severity)}</header><p><strong>Constat :</strong> ${h(evidence)}</p><p><strong>Impact :</strong> ${h(impact)}</p><p><strong>Recommandation :</strong> ${h(recommendation)}</p><small>Priorité opérationnelle · Effort ${h(effort)}</small></article>`;
}

function coverPage(model) {
  const score = scoreValue(model.scores.global);
  const brandName = model.agencyBranding?.enabled ? model.agencyBranding.agency_name : 'Webisafe';
  return `<section class="cover premium-shell"><div class="cover-top">${brand(model)}<p>${h(model.report.confidentiality)}</p></div><div class="cover-grid"><div><p class="eyebrow">Audit cybersécurité exécutif</p><h1>Rapport d’audit ${h(brandName)}</h1><h2>${h(model.domain)}</h2><p class="lead">Analyse premium de la sécurité, de la performance, du SEO technique et de l’expérience mobile. Lecture orientée décision business, preuves observables et plan de correction.</p>${keyValueList(model.cover.metadata)}</div><aside class="cover-score"><span>Score global</span><strong style="color:${h(model.cover.scoreColor)}">${score ?? '—'}</strong><em>/100 · ${h(model.cover.scoreLabel)}</em><div>${badge(model.risk.label)}</div><p>${h(model.risk.summary)}</p></aside></div><div class="cover-scores">${model.cover.categoryScores.map(categoryScorePill).join('')}</div><div class="cover-footer"><p>${h(model.report.scanType)} · ID ${h(model.report.id)}</p><p>Page 1 / ${model.report.totalPages}</p></div></section>`;
}

function executivePage(model) {
  return page(model, 2, 'Verdict exécutif', 'Vue exécutive', 'Verdict exécutif', 'Synthèse décisionnelle des risques, de l’impact business et du niveau de confiance du scan.', `<div class="executive-grid"><div class="verdict"><span>Verdict Webisafe</span><h2>${h(model.executive.verdict)}</h2><p>${h(model.executive.businessSummary)}</p></div><div class="risk-level ${model.risk.tone}"><p>Niveau de risque</p><strong>${h(model.risk.label)}</strong><span>${h(model.executive.potentialImpact)}</span></div></div><div class="three-stats"><div><span>Confiance du scan</span><strong>${h(model.executive.scanConfidence.label)}</strong><p>${h(model.executive.scanConfidence.explanation)}</p></div><div><span>Critiques</span><strong>${model.counts.critical}</strong><p>Statuts critiques ou équivalents détectés.</p></div><div><span>À corriger</span><strong>${model.counts.warning}</strong><p>Points à planifier dans le prochain sprint.</p></div></div>${panel('Principales faiblesses', bulletList(model.executive.mainWeaknesses), 'accent')}<div class="two-cols">${panel('Décision recommandée', '<p class="text">Traiter les risques critiques avant toute communication commerciale forte, puis relancer un scan pour documenter la progression.</p>', 'warning')}${panel('Lecture business', '<p class="text">Ce rapport sert à prioriser les corrections, justifier un sprint technique et rassurer une direction, une agence ou un investisseur.</p>', 'accent')}</div>`);
}

function topRisksPage(model) {
  return page(model, 3, 'Top risques', 'Priorités business', 'Top 5 risques & priorités', 'Les problèmes les plus importants sont remontés avant les détails techniques pour accélérer la décision.', `<div class="risk-grid">${model.topRisks.slice(0, 5).map(riskCard).join('')}</div><div class="three-stats risk-notes"><div><span>Pourquoi ces risques</span><strong>Priorité</strong><p>Ils combinent sévérité technique, preuve observable et impact sur la confiance.</p></div><div><span>Mode de preuve</span><strong>Passif</strong><p>Les constats viennent de signaux publics, sans exploitation ni intrusion.</p></div><div><span>Objectif</span><strong>Réduction</strong><p>Chaque correction doit être suivie d’un rescan pour mesurer l’amélioration.</p></div></div>`, 'compact');
}

function actionPlanPage(model) {
  return page(model, 4, 'Plan d’action', 'Feuille de route', 'Plan d’action 7 / 30 / 90 jours', 'Une feuille de route claire pour transformer le diagnostic en corrections mesurables.', `<div class="timeline"><section><h2>7 jours · Urgent</h2>${model.actionPlan.now.map(actionCard).join('')}</section><section><h2>30 jours · Optimisation</h2>${model.actionPlan.next.map(actionCard).join('')}</section><section><h2>90 jours · Surveillance</h2>${model.actionPlan.later.map(actionCard).join('')}</section></div>`, 'compact');
}

function scorecardPage(model) {
  return page(model, 5, 'Scorecard', 'Vue consolidée', 'Scorecard détaillée', 'Lecture comparative des dimensions auditées avec statut, score et commentaire expert.', `<div class="scorecard-list">${model.scorecard.map(scorecardTile).join('')}</div><div class="status-strip"><span>OK: ${model.counts.ok}</span><span>À corriger: ${model.counts.warning}</span><span>Critique: ${model.counts.critical}</span><span>Non mesuré: ${model.counts.unknown}</span></div><div class="two-cols score-notes">${panel('Seuils de lecture', '<p class="text">0-39 critique, 40-64 à corriger, 65-84 bon, 85-100 excellent. Les scores ne remplacent pas les preuves détaillées.</p>', 'accent')}${panel('Statuts non mesurés', '<p class="text">Un statut non mesuré n’est pas un succès. Il signale une donnée indisponible, à confirmer par rescan ou vérification manuelle.</p>', 'warning')}</div>`);
}

function securityPage(model) {
  const section = model.sections.security;
  const findings = [
    ...section.missingHeaders.map((item) => technicalFinding(`${item.header} manquant`, item.severity, item.message || `${item.header} absent`, item.severity === 'Critique' ? 'Durcissement navigateur insuffisant et risque de confiance technique.' : 'Bonne pratique de sécurité à compléter.', `Configurer ${item.header} avec une politique adaptée au site.`, item.header.toLowerCase().includes('csp') ? 'Technique' : 'Intermédiaire')),
    section.sensitiveFiles.critical ? technicalFinding('Fichiers sensibles exposés', 'Critique', section.sensitiveFiles.exposed_files.join(', ') || section.sensitiveFiles.alert_message, 'Exposition potentielle de secrets ou de configurations internes.', 'Retirer les fichiers exposés, bloquer l’accès public et renouveler les secrets.', 'Urgent') : '',
  ].filter(Boolean).join('');
  return page(model, 6, 'Sécurité', 'Section technique', 'Sécurité & confiance', 'HTTPS, certificat, headers, cookies et fichiers sensibles avec lecture preuve → impact → correction.', `${sectionScoreCard('Score sécurité', section.score, section.status, section.diagnostic)}${metricGrid(section.metrics)}<div class="findings-grid">${findings || technicalFinding('Aucun risque majeur de sécurité web visible', 'OK', 'Aucun fichier sensible exposé ni header critique remonté dans les données analysées.', 'La base visible inspire confiance, sous réserve des limites du scan passif.', 'Maintenir la surveillance et relancer un scan après modification.', 'Faible')}</div><div class="two-cols">${panel('Checklist immédiate', '<p class="text">Ajouter les headers manquants, vérifier les cookies sensibles, contrôler les fichiers publics et relancer un scan Webisafe.</p>', 'accent')}${panel('Preuve attendue après correction', '<p class="text">Les réponses HTTP doivent montrer les headers actifs et aucun fichier sensible ne doit rester publiquement accessible.</p>', 'warning')}</div>`);
}

function advancedSecurityPage(model) {
  const section = model.sections.advancedSecurity;
  const emailRows = [
    section.email.spf ? ['SPF', section.email.spf, section.email.spf === 'Présent' ? 'OK' : 'À corriger'] : null,
    section.email.dmarc ? ['DMARC', section.email.dmarc, section.email.dmarc === 'Présent' ? 'OK' : 'À corriger'] : null,
    section.email.dkim ? ['DKIM', section.email.dkim, section.email.dkim === 'Présent' ? 'OK' : 'À corriger'] : null,
    section.email.missing.length ? ['Manquants', section.email.missing.join(', '), 'À corriger'] : null,
  ].filter(Boolean);
  const criticalChecks = section.checks.filter((item) => item.status !== 'OK').slice(0, 4);
  return page(model, 7, 'Sécurité avancée', 'Contrôles étendus', 'Sécurité avancée', 'Risques moins visibles : CORS, WAF, sécurité email, sous-domaines, security.txt et supply chain.', `${sectionScoreCard('Score sécurité avancée', section.score, section.status, section.diagnostic)}<div class="two-cols"><div>${panel('Checks principaux', dataTable(['Check', 'Résultat', 'Statut'], section.summaryRows, ['32%', '48%', '20%']), 'accent')}</div><div>${panel('Sécurité email', dataTable(['Élément', 'Résultat', 'Statut'], emailRows, ['30%', '50%', '20%']))}</div></div><div class="findings-grid slim">${criticalChecks.map((item) => technicalFinding(item.name, item.status, item.detail || item.name, item.key.includes('email') ? 'Risque accru d’usurpation ou de faible confiance email.' : 'Signal avancé à corriger selon la preuve observée.', item.key.includes('security_txt') ? 'Publier un fichier security.txt avec contact sécurité.' : 'Revoir la configuration et valider avec un rescan.', 'Intermédiaire')).join('')}</div>`, 'compact');
}

function performancePage(model) {
  const section = model.sections.performance;
  const serverRows = [
    section.serverLocation.city ? ['Ville', section.serverLocation.city] : null,
    section.serverLocation.country ? ['Pays', section.serverLocation.country] : null,
    section.serverLocation.isp ? ['Hébergeur', section.serverLocation.isp] : null,
    section.serverLocation.message ? ['Latence', section.serverLocation.message] : null,
    section.serverLocation.recommendation ? ['Recommandation', section.serverLocation.recommendation] : null,
  ].filter(Boolean);
  return page(model, 8, 'Performance', 'Core Web Vitals', 'Performance & conversion mobile', 'Vitesse perçue, stabilité, poids de page, origine serveur et limites de mesure.', `${sectionScoreCard('Score performance', section.score, section.status, section.diagnostic)}${metricGrid(section.metrics)}<div class="two-cols"><div>${panel('Localisation serveur', dataTable(['Signal', 'Valeur'], serverRows, ['35%', '65%']), 'accent')}</div><div>${panel('Optimisations prioritaires', dataTable(['Optimisation', 'Détail', 'Gain'], section.opportunities.map((item) => [item.title, item.description, item.savings]), ['34%', '48%', '18%']))}</div></div><div class="two-cols">${panel('Lecture conversion', '<p class="text">La performance doit être jugée sur mobile, car chaque délai supplémentaire réduit la probabilité de contact ou d’achat.</p>', 'accent')}${panel('Mesure suivante', '<p class="text">Après correction, relancer un scan complet et comparer LCP, TBT, poids de page et score global.</p>', 'warning')}</div>`);
}

function seoUxPage(model) {
  const seo = model.sections.seo;
  const ux = model.sections.ux;
  return page(model, 9, 'SEO & UX', 'Visibilité et expérience', 'SEO technique & UX mobile', 'Compréhension par Google, partage social, accessibilité et obstacles à la conversion mobile.', `<div class="two-cols"><div>${scoreBar('Score SEO', seo.score, seo.diagnostic)}${metricGrid(seo.metrics)}${panel('Signaux complémentaires', dataTable(['Critère', 'Valeur', 'Statut'], [...seo.extraRows, ...seo.advancedRows], ['34%', '44%', '22%'], 16), 'accent')}</div><div>${scoreBar('Score UX Mobile', ux.score, ux.diagnostic)}${metricGrid([...ux.metrics, ux.tapTargets])}${panel('Problèmes UX détectés', dataTable(['Problème', 'Impact', 'Statut'], ux.issues.map((item) => [item.message, item.impact || item.type, item.severity]), ['42%', '40%', '18%']))}</div></div><div class="two-cols">${panel('Priorité SEO', '<p class="text">Corriger d’abord les signaux techniques absents avant de lancer une production de contenu ou une campagne média.</p>', 'accent')}${panel('Priorité UX', '<p class="text">Les irritants mobiles visibles doivent être traités sur les parcours clés : accueil, recherche, fiche produit et contact.</p>', 'warning')}</div>`, 'compact');
}

function aiCompliancePage(model) {
  const seo = model.sections.seo;
  const advanced = model.sections.advancedSecurity;
  const aiRows = seo.aiVisibility.checks.map((item) => [item.label, `${item.evidence} · ${item.impact}`, item.status]);
  const businessRows = seo.businessRecommendations.map((item) => [item.problem, item.impact, `${item.priority} · ${item.effort}`]);
  const complianceRows = advanced.complianceBadges.map((item) => [item.label, item.missingSignals.length ? item.missingSignals.join(', ') : item.explanation || 'Signal prêt', item.status]);
  const securityRows = [
    ['DNSSEC', advanced.dnssec.detail, advanced.dnssec.status],
    ['CMS', advanced.cmsDetection.detected.length ? advanced.cmsDetection.detected.join(', ') : advanced.cmsDetection.primary, advanced.cmsDetection.primary === 'Non détecté' ? 'Non mesuré' : 'OK'],
    ['JavaScript', advanced.jsLibraries.risky.length ? advanced.jsLibraries.risky.join(', ') : advanced.jsLibraries.detected.join(', ') || 'Aucune librairie détectée', advanced.jsLibraries.status],
    ['SRI', `${advanced.sri.missingIntegrity}/${advanced.sri.externalScripts} script(s) sans integrity`, advanced.sri.status],
    ['Méthodes HTTP', advanced.httpMethods.risky.length ? advanced.httpMethods.risky.join(', ') : 'Aucune méthode sensible exposée', advanced.httpMethods.status],
    ['WordPress', advanced.wordpressSecurity.applicable ? advanced.wordpressSecurity.checks.join(', ') || 'Contrôles WordPress disponibles' : 'Non applicable', advanced.wordpressSecurity.status],
  ];
  return page(model, 10, 'Visibilité IA & conformité', 'Signaux émergents', 'Visibilité IA & conformité préparatoire', 'Préparation aux moteurs IA, signaux de crédibilité et maturité conformité sans recalculer les scores affichés.', `<div class="two-cols"><div>${scoreBar('Score visibilité IA', seo.aiVisibility.score, 'Capacité du contenu à être compris et cité par les moteurs et assistants IA.')}${panel('Checks IA', dataTable(['Signal', 'Preuve & impact', 'Statut'], aiRows, ['28%', '52%', '20%'], 12), 'accent')}${panel('Recommandations SEO business', dataTable(['Problème', 'Impact', 'Priorité'], businessRows, ['34%', '46%', '20%'], 10), 'warning')}</div><div>${panel('Préparation conformité', dataTable(['Badge', 'Signal manquant / preuve', 'Statut'], complianceRows, ['32%', '48%', '20%'], 8), 'accent')}${panel('Résumé sécurité enrichie', dataTable(['Signal', 'Résumé', 'Statut'], securityRows, ['28%', '52%', '20%'], 8))}</div></div>`, 'compact');
}

function methodologyClosingPage(model) {
  return page(model, 11, 'Méthodologie', 'Méthode & prochaine étape', 'Méthodologie & limites', 'Portée du scan, données non mesurées et prochaine action commerciale recommandée.', `<div class="two-cols"><div>${panel('Méthodologie du scan', bulletList(model.methodology.scope), 'accent')}${panel('Sources utilisées', bulletList(model.methodology.sources))}${panel('Limites connues', bulletList(model.methodology.limitations), 'warning')}</div><div><div class="cta"><span>Recommandation stratégique</span><h2>Corriger les priorités puis relancer un rescan</h2><p>Webisafe recommande un sprint de correction centré sur les risques critiques, suivi d’un rescan pour mesurer l’évolution du score et documenter les progrès.</p><strong>${h(model.domain)}</strong></div><div class="offer-grid"><article><h3>Correction prioritaire</h3><p>Traitement des headers, sécurité email, performance et points bloquants.</p></article><article><h3>Webisafe Protect</h3><p>Surveillance, rescan régulier et suivi des dérives critiques.</p></article></div>${panel('Contact', `<p class="text"><strong>${h(model.report.contact)}</strong></p><p class="text">Envoyez ce rapport avec l’ID ${h(model.report.id)} pour recevoir une proposition de correction.</p><p class="primary">${h(model.report.brandUrl)}</p>`, 'accent')}</div></div>`);
}

function styles() {
  return `<style>
    @page{size:A4;margin:0}
    *{box-sizing:border-box}
    body{margin:0;background:#020617;font-family:Inter,Arial,sans-serif;color:${COLORS.text};-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page,.cover{position:relative;width:210mm;height:297mm;page-break-after:always;break-after:page;overflow:hidden;background:#020617 linear-gradient(145deg,#081A34 0%,#071426 46%,#020617 100%);color:${COLORS.text};padding:25mm 15mm 18mm}
    .cover{padding:17mm 15mm 15mm}
    .page:before,.cover:before{content:"";position:absolute;inset:0;background:rgba(96,165,250,.04);opacity:.9}
    .page:after,.cover:after{content:"";position:absolute;inset:12mm;border:1px solid rgba(148,163,184,.13);border-radius:24px;pointer-events:none}
    main{position:relative;z-index:2}
    .page-header,.page-footer{position:absolute;left:15mm;right:15mm;display:flex;align-items:center;justify-content:space-between;z-index:5}
    .page-header{top:8mm;padding-bottom:4mm;border-bottom:1px solid rgba(148,163,184,.18)}
    .page-footer{bottom:7mm;padding-top:3mm;border-top:1px solid rgba(148,163,184,.16);color:#94A3B8;font-size:8.5px}
    .brand{display:flex;align-items:center;gap:7px}.brand span{width:10px;height:10px;border-radius:3px;background:${COLORS.primary};box-shadow:0 0 18px rgba(21,102,240,.82)}.brand strong{font-size:10px;letter-spacing:1.5px;color:#F8FAFC}.page-header p{margin:0;color:#94A3B8;font-size:8.5px;text-transform:uppercase;letter-spacing:.7px}
    .cover-top,.cover-footer{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:3}.cover-top{padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.16)}.cover-top p,.cover-footer p{font-size:9px;color:#94A3B8;text-transform:uppercase;letter-spacing:.8px}.cover-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:25px;align-items:center;margin-top:28mm;position:relative;z-index:2}.eyebrow{margin:0 0 10px;color:#60A5FA;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.8px}.cover h1{margin:0 0 12px;font-size:48px;line-height:.96;letter-spacing:-2px;color:#F8FAFC}.cover h2{margin:0 0 12px;font-size:24px;color:#F8FAFC}.lead{max-width:430px;margin:0 0 18px;color:#CBD5E1;font-size:12px;line-height:1.55}.cover-score{border:1px solid rgba(96,165,250,.45);border-radius:24px;background:rgba(15,23,42,.82);padding:22px;text-align:center;box-shadow:0 8px 22px rgba(0,0,0,.18)}.cover-score span{display:block;color:#94A3B8;font-size:9px;text-transform:uppercase;letter-spacing:1px}.cover-score strong{display:block;margin:7px 0 0;font-size:70px;line-height:.9}.cover-score em{display:block;margin-bottom:12px;color:#CBD5E1;font-style:normal;font-weight:800}.cover-score p{color:#CBD5E1;font-size:10px;line-height:1.45}.cover-scores{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:26mm;position:relative;z-index:2}.cover-footer{position:absolute;left:15mm;right:15mm;bottom:10mm;border-top:1px solid rgba(255,255,255,.12);padding-top:9px}
    .section-intro{margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(148,163,184,.17)}.section-intro p{margin:0 0 7px;color:#60A5FA;font-size:9px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase}.section-intro h1{margin:0 0 6px;font-size:31px;line-height:1.03;letter-spacing:-1px;color:#F8FAFC}.section-intro span{display:block;max-width:620px;color:#AAB7CA;font-size:11px;line-height:1.45}
    .kv-list{border-top:1px solid rgba(255,255,255,.12)}.kv-list p{display:flex;justify-content:space-between;gap:12px;margin:0;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.10);font-size:9px}.kv-list span{color:#94A3B8;text-transform:uppercase;font-weight:800;letter-spacing:.5px}.kv-list strong{text-align:right;color:#F8FAFC}.score-pill,.metric,.panel,.risk-card,.action-card,.finding,.cta,.offer-grid article,.verdict,.risk-level,.three-stats>div,.score-bar,.scorecard-card{background:rgba(15,23,42,.82);border:1px solid rgba(148,163,184,.22);border-radius:16px;box-shadow:0 8px 22px rgba(0,0,0,.18)}.score-pill{padding:11px 10px}.score-pill span{display:block;color:#94A3B8;font-size:8px;text-transform:uppercase;font-weight:900}.score-pill strong{display:block;margin:6px 0 2px;font-size:24px}.score-pill em{font-size:8px;color:#CBD5E1;font-style:normal;text-transform:uppercase;font-weight:800}
    .score-bar{padding:13px;margin-bottom:10px}.score-bar>div{display:flex;align-items:flex-end;gap:7px}.score-bar p{margin:0;color:#94A3B8;font-size:9px;text-transform:uppercase;font-weight:900;letter-spacing:.6px}.score-bar strong{font-size:34px;line-height:.9}.score-bar small{font-size:11px;color:#94A3B8}.score-bar span{font-size:9px;color:#CBD5E1;font-weight:900;text-transform:uppercase}.score-bar em{display:block;margin:8px 0;color:#AAB7CA;font-size:9px;line-height:1.35;font-style:normal}.score-bar i{display:block;height:8px;background:rgba(148,163,184,.22);border-radius:999px;overflow:hidden}.score-bar b{display:block;height:100%;border-radius:999px}.badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:7.4px;font-weight:900;text-transform:uppercase;letter-spacing:.35px}.badge.ok{background:rgba(34,197,94,.14);color:#86EFAC}.badge.warning{background:rgba(249,115,22,.16);color:#FDBA74}.badge.critical{background:rgba(239,68,68,.16);color:#FCA5A5}.badge.muted{background:rgba(148,163,184,.18);color:#CBD5E1}
    .executive-grid{display:grid;grid-template-columns:1.35fr .65fr;gap:12px;margin-bottom:12px}.verdict,.risk-level,.three-stats>div{padding:16px}.verdict span,.risk-level p,.three-stats span{color:#60A5FA;font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:900}.verdict h2{margin:8px 0 10px;color:#F8FAFC;font-size:24px;line-height:1.12}.verdict p,.risk-level span,.three-stats p,.text{color:#AAB7CA;font-size:10px;line-height:1.48}.risk-level strong{display:block;margin:14px 0 8px;font-size:34px;color:#FDBA74}.risk-level.critical strong{color:#FCA5A5}.risk-level.ok strong{color:#86EFAC}.three-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.three-stats strong{display:block;margin:8px 0 4px;color:#F8FAFC;font-size:24px}
    .panel{padding:13px;margin-bottom:10px}.panel.accent{border-left:4px solid ${COLORS.primary}}.panel.warning{border-left:4px solid ${COLORS.warning}}.panel h3{margin:0 0 9px;color:#F8FAFC;font-size:13px}.bullets{margin:0;padding-left:16px}.bullets li{margin-bottom:6px;color:#AAB7CA;font-size:10px;line-height:1.4}.risk-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.risk-card{padding:12px;min-height:118px;border-left:5px solid ${COLORS.primary}}.risk-card.critical{border-left-color:${COLORS.danger}}.risk-card.warning{border-left-color:${COLORS.warning}}.risk-card>div,.action-card>div,.finding header{display:flex;justify-content:space-between;align-items:center;gap:8px}.risk-card h3,.action-card h3,.finding h3{margin:8px 0;color:#F8FAFC;font-size:13px;line-height:1.22}.risk-card dl{margin:0;display:grid;grid-template-columns:78px 1fr;gap:4px 8px}.risk-card dt{color:#94A3B8;font-size:8px;font-weight:900;text-transform:uppercase}.risk-card dd{margin:0;color:#E5E7EB;font-size:9px;line-height:1.33}.risk-card footer,.action-card footer{display:flex;justify-content:space-between;margin-top:8px;color:#94A3B8;font-size:8px}.timeline{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.timeline h2{margin:0 0 8px;color:#F8FAFC;font-size:14px}.action-card{padding:11px;margin-bottom:8px;border-left:4px solid ${COLORS.primary}}.action-card.critical{border-left-color:${COLORS.danger}}.action-card.warning{border-left-color:${COLORS.warning}}.action-card p,.action-card small{display:block;margin:0 0 7px;color:#AAB7CA;font-size:9px;line-height:1.35}
    .scorecard-list{display:grid;grid-template-columns:1fr;gap:9px;margin-bottom:10px}.scorecard-card{padding:13px 16px}.scorecard-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.scorecard-head p{margin:0;color:#A8B8CD;font-size:12px;text-transform:uppercase;letter-spacing:.7px}.scorecard-head strong{font-size:34px;line-height:.85}.scorecard-head small{font-size:11px;color:#94A3B8;font-weight:500}.scorecard-status{display:block;text-align:center;margin:3px 0 7px;font-size:11px;text-transform:uppercase;font-weight:900;letter-spacing:.5px}.scorecard-card i{display:block;height:7px;background:rgba(148,163,184,.22);border-radius:999px;overflow:hidden}.scorecard-card b{display:block;height:100%;border-radius:999px}.scorecard-card em{display:block;margin-top:7px;color:#AAB7CA;font-size:8.8px;line-height:1.32;font-style:normal}.status-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.status-strip span{background:rgba(15,23,42,.92);color:#F8FAFC;border:1px solid rgba(148,163,184,.2);border-radius:12px;padding:10px;text-align:center;font-size:10px;font-weight:900}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:10px}.metric{padding:10px}.metric p{margin:0 0 5px;color:#94A3B8;font-size:8px;text-transform:uppercase;font-weight:900}.metric strong{display:block;margin-bottom:5px;color:#F8FAFC;font-size:13px}.metric small{display:block;margin-top:6px;color:#AAB7CA;font-size:8px;line-height:1.3}.findings-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.findings-grid.slim{margin-top:9px}.finding{padding:12px;border-left:4px solid ${COLORS.primary}}.finding.critical{border-left-color:${COLORS.danger}}.finding.warning{border-left-color:${COLORS.warning}}.finding p{margin:0 0 6px;color:#AAB7CA;font-size:9.5px;line-height:1.38}.finding small{color:#94A3B8;font-size:8px}.two-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start}table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid rgba(148,163,184,.20);border-radius:12px;overflow:hidden;background:rgba(2,6,23,.24)}th{background:rgba(148,163,184,.13);color:#CBD5E1;font-size:8px;text-align:left;text-transform:uppercase;letter-spacing:.5px;padding:7px}td{border-top:1px solid rgba(148,163,184,.18);color:#E5E7EB;font-size:8.6px;line-height:1.34;padding:7px;vertical-align:top}.empty{text-align:center;color:#94A3B8;font-size:9px;padding:12px;border:1px dashed rgba(148,163,184,.24);border-radius:12px}.cta{padding:18px;text-align:center;background:rgba(2,6,23,.72);color:#fff}.cta span{font-size:8px;text-transform:uppercase;letter-spacing:1.3px;color:#60A5FA;font-weight:900}.cta h2{font-size:25px;line-height:1.12;margin:10px 0;color:#F8FAFC}.cta p{font-size:10px;line-height:1.45;color:#CBD5E1}.cta strong{display:block;color:#86EFAC;font-size:16px}.offer-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.offer-grid article{padding:12px}.offer-grid h3{margin:0 0 6px;color:#F8FAFC;font-size:12px}.offer-grid p,.primary{margin:0;color:#AAB7CA;font-size:9px;line-height:1.35}.primary{color:#60A5FA;font-size:18px;font-weight:900}.compact .risk-card{min-height:105px}.compact .section-intro{margin-bottom:11px}.score-notes{margin-top:8px}.risk-notes{margin-top:9px}
  </style>`;
}

export function buildTemplate(scanData) {
  const model = buildPdfAuditModel(scanData);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">${styles()}</head><body>${coverPage(model)}${executivePage(model)}${topRisksPage(model)}${actionPlanPage(model)}${scorecardPage(model)}${securityPage(model)}${advancedSecurityPage(model)}${performancePage(model)}${seoUxPage(model)}${aiCompliancePage(model)}${methodologyClosingPage(model)}</body></html>`;
}
