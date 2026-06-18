const PASS = 'pass';
const WARNING = 'warning';
const FAIL = 'fail';
const ERROR = 'error';
const NOT_MEASURED = 'not_measured';

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function normalizeList(values) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function getAttribute($, selector, attribute) {
  return cleanText($(selector).first().attr(attribute));
}

function getMetaContent($, selector) {
  return getAttribute($, selector, 'content');
}

function statusMessage(status) {
  if (status === PASS) return 'Signal conforme.';
  if (status === FAIL) return 'Signal bloquant.';
  if (status === ERROR) return 'Contrôle indisponible.';
  if (status === NOT_MEASURED) return 'Non mesuré.';
  return 'Signal à améliorer.';
}

function makeCheck(status, value, message, extra = {}) {
  return { status: normalizeSeoStatus(status), value, message, ...extra };
}

function findNavigationSignal($, patterns) {
  return $('a').toArray().some((node) => {
    const href = cleanText($(node).attr('href')).toLowerCase();
    const label = cleanText($(node).text()).toLowerCase();
    return patterns.some((pattern) => href.includes(pattern) || label.includes(pattern));
  });
}

function getJsonLdTypes($) {
  const types = [];

  $('script[type="application/ld+json"]').each((_, node) => {
    const raw = cleanText($(node).text());
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const graphItems = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [];
      const items = [...(Array.isArray(parsed) ? parsed : [parsed]), ...graphItems];

      items.forEach((item) => {
        const type = item?.['@type'];
        if (Array.isArray(type)) types.push(...type.map(String));
        else if (type) types.push(String(type));
      });
    } catch {
      types.push('Invalid JSON-LD');
    }
  });

  return normalizeList(types);
}

function tokenize(value) {
  return cleanText(value)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4);
}

function hasReadableInitialContent($) {
  const mainText = cleanText($('main').text() || $('article').text() || $('body').text());
  const appShellPresent = $('#root, #app, [data-reactroot]').length > 0;
  return mainText.length >= 120 && !(appShellPresent && mainText.length < 180);
}

function buildAiCheck(key, label, passed, evidence, businessImpact, recommendation) {
  return {
    key,
    label,
    status: passed ? PASS : WARNING,
    evidence,
    business_impact: businessImpact,
    recommendation,
  };
}

function getTitleBrandCandidate(title, h1Texts, organizationTypes) {
  const titleCandidate = cleanText(title)
    .split(/[|\-–—:]/)
    .map(cleanText)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];

  return titleCandidate || h1Texts[0] || organizationTypes[0] || '';
}

function hasCoherentTitleDescriptionH1(title, description, h1Texts) {
  const titleDescriptionWords = new Set([...tokenize(title), ...tokenize(description)]);
  return tokenize(h1Texts.join(' ')).some((word) => titleDescriptionWords.has(word));
}

export function normalizeSeoStatus(status) {
  if ([PASS, WARNING, FAIL, ERROR, NOT_MEASURED].includes(status)) return status;
  return NOT_MEASURED;
}

export function analyzeSeoSignals($, url, probes = {}) {
  const title = cleanText($('title').first().text());
  const description = getMetaContent($, 'meta[name="description"], meta[property="description"]');
  const h1Texts = $('h1').toArray().map((node) => cleanText($(node).text())).filter(Boolean);
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;
  const images = $('img').toArray();
  const missingAltCount = images.filter((node) => !cleanText($(node).attr('alt'))).length;
  const lang = cleanText($('html').attr('lang'));
  const structuredTypes = getJsonLdTypes($);
  const organizationTypes = structuredTypes.filter((type) => ['organization', 'localbusiness', 'person'].includes(type.toLowerCase()));
  const twitterMissing = [
    ['twitter:title', getMetaContent($, 'meta[name="twitter:title"]')],
    ['twitter:description', getMetaContent($, 'meta[name="twitter:description"]')],
    ['twitter:image', getMetaContent($, 'meta[name="twitter:image"]')],
  ].filter(([, value]) => !value).map(([key]) => key);
  const ogMissing = [
    ['og:title', getMetaContent($, 'meta[property="og:title"]')],
    ['og:description', getMetaContent($, 'meta[property="og:description"]')],
    ['og:image', getMetaContent($, 'meta[property="og:image"]')],
  ].filter(([, value]) => !value).map(([key]) => key);
  const faviconHref = getAttribute($, 'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]', 'href');
  const brandCandidate = getTitleBrandCandidate(title, h1Texts, organizationTypes);
  const metaAuthor = cleanText($('meta[name="author"]').first().attr('content') ?? '');
  const contentReadable = hasReadableInitialContent($);
  const titleDescriptionH1Coherent = hasCoherentTitleDescriptionH1(title, description, h1Texts);

  const titleStatus = title.length === 0 ? FAIL : title.length >= 30 && title.length <= 60 ? PASS : WARNING;
  const descriptionStatus = description.length === 0 ? FAIL : description.length >= 120 && description.length <= 160 ? PASS : WARNING;
  const h1Status = h1Texts.length === 0 ? FAIL : h1Texts.length === 1 ? PASS : WARNING;
  const headingsStatus = h2Count > 0 || h3Count > 0 ? PASS : WARNING;
  const imageAltStatus = missingAltCount === 0 ? PASS : WARNING;
  const langStatus = lang ? PASS : WARNING;
  const structuredDataStatus = structuredTypes.length > 0 && !structuredTypes.includes('Invalid JSON-LD') ? PASS : WARNING;
  const twitterStatus = twitterMissing.length === 0 ? PASS : WARNING;
  const robotsStatus = normalizeSeoStatus(probes.robots?.status || NOT_MEASURED);
  const sitemapStatus = normalizeSeoStatus(probes.sitemap?.status || NOT_MEASURED);
  const faviconStatus = normalizeSeoStatus(probes.favicon?.status || (faviconHref ? PASS : WARNING));

  const technical_checks = {
    title_length: makeCheck(titleStatus, title.length, title ? `Longueur title: ${title.length} caractères.` : 'Balise title absente.', { ideal: '30-60 caractères' }),
    meta_description_length: makeCheck(descriptionStatus, description.length, description ? `Longueur meta description: ${description.length} caractères.` : 'Meta description absente.', { ideal: '120-160 caractères' }),
    h1_unique: makeCheck(h1Status, h1Texts.length, h1Texts.length === 1 ? 'Un H1 principal est présent.' : `Nombre de H1 détectés: ${h1Texts.length}.`),
    headings_structure: makeCheck(headingsStatus, h2Count + h3Count, `H2: ${h2Count}, H3: ${h3Count}.`, { h2_count: h2Count, h3_count: h3Count }),
    images_alt: makeCheck(imageAltStatus, missingAltCount, missingAltCount === 0 ? 'Toutes les images utiles possèdent un alt.' : `${missingAltCount} image(s) sans alt.`, { missing_count: missingAltCount, total: images.length }),
    lang_attribute: makeCheck(langStatus, lang || null, lang ? `Langue déclarée: ${lang}.` : 'Attribut lang absent sur html.'),
    robots_txt: makeCheck(robotsStatus, probes.robots?.url || null, probes.robots?.blocking ? 'robots.txt semble bloquer des crawlers.' : statusMessage(robotsStatus), { url: probes.robots?.url || null, blocking: probes.robots?.blocking ?? null }),
    sitemap_xml: makeCheck(sitemapStatus, probes.sitemap?.url || null, probes.sitemap?.url ? 'Sitemap accessible.' : 'Sitemap non confirmé.', { url: probes.sitemap?.url || null, discovered_from: probes.sitemap?.discovered_from || null }),
    structured_data: makeCheck(structuredDataStatus, structuredTypes.length, structuredTypes.length ? `Types détectés: ${structuredTypes.join(', ')}.` : 'Aucune donnée structurée JSON-LD détectée.', { types: structuredTypes }),
    twitter_cards: makeCheck(twitterStatus, 3 - twitterMissing.length, twitterMissing.length ? `Tags Twitter manquants: ${twitterMissing.join(', ')}.` : 'Twitter Cards complètes.', { missing: twitterMissing }),
    favicon: makeCheck(faviconStatus, probes.favicon?.url || faviconHref || null, probes.favicon?.url || faviconHref ? 'Favicon détecté.' : 'Favicon non confirmé.', { url: probes.favicon?.url || faviconHref || null }),
  };

  const aiChecks = [
    buildAiCheck('organization_schema', 'Données structurées Organization', structuredTypes.some((type) => type.toLowerCase() === 'organization'), structuredTypes.join(', ') || 'Aucun type Organization détecté.', 'Renforce la compréhension de la marque par les moteurs et assistants IA.', 'Ajouter un JSON-LD Organization avec nom, URL, logo et contacts.'),
    buildAiCheck('contact_page', 'Page contact visible', findNavigationSignal($, ['contact']), 'Lien contact analysé dans la navigation.', 'Rassure les prospects et facilite la validation de l’entreprise.', 'Ajouter un lien contact visible depuis le header ou footer.'),
    buildAiCheck('legal_mentions', 'Mentions légales visibles', findNavigationSignal($, ['mentions', 'legal', 'legales', 'privacy', 'confidentialite']), 'Lien légal analysé dans la navigation.', 'Améliore la confiance et la conformité perçue.', 'Ajouter une page mentions légales ou politique de confidentialité accessible.'),
    buildAiCheck('brand_name', 'Nom de marque identifiable', brandCandidate.length >= 3, brandCandidate || 'Marque non identifiée.', 'Facilite l’association entre le site, la marque et ses contenus.', 'Clarifier le nom de marque dans le title, le H1 ou les données structurées.'),
    buildAiCheck('open_graph_complete', 'Open Graph complet', ogMissing.length === 0, ogMissing.length ? `Manquants: ${ogMissing.join(', ')}.` : 'Open Graph complet.', 'Améliore les partages sociaux et les aperçus enrichis.', 'Ajouter og:title, og:description et og:image.'),
    buildAiCheck('sitemap_accessible', 'Sitemap accessible', sitemapStatus === PASS, probes.sitemap?.url || 'Sitemap non confirmé.', 'Aide les robots à découvrir les pages clés.', 'Publier un sitemap XML et le déclarer dans robots.txt.'),
    buildAiCheck('robots_not_blocking', 'Robots non bloquant', probes.robots?.blocking !== true, probes.robots?.blocking ? 'Blocage détecté.' : 'Aucun blocage robots confirmé.', 'Évite d’empêcher les moteurs et assistants d’explorer le site.', 'Corriger robots.txt pour autoriser les pages publiques importantes.'),
    buildAiCheck('readable_without_js', 'Contenu lisible sans JS', contentReadable, 'Analyse du texte visible dans le HTML initial.', 'Permet aux crawlers simples de comprendre l’offre sans rendu JavaScript.', 'Servir le contenu principal dans le HTML initial ou via rendu serveur.'),
    buildAiCheck(‘author_or_org’, ‘Auteur ou organisation identifiable’, organizationTypes.length > 0 || metaAuthor.length >= 2, organizationTypes.join(‘, ‘) || metaAuthor || ‘Aucune attribution structurée détectée (JSON-LD Organization/Person ou meta author absents).’, ‘Renforce l’attribution et la crédibilité des contenus.’, ‘Ajouter une organisation ou un auteur dans les données structurées JSON-LD ou via <meta name="author">.’),
    buildAiCheck('title_description_h1_coherence', 'Cohérence title/description/H1', titleDescriptionH1Coherent, h1Texts.join(' | ') || 'H1 absent.', 'Améliore la compréhension du sujet principal et la qualité du snippet.', 'Aligner le H1 avec le title et la meta description.'),
  ];

  return {
    title,
    description,
    technical_checks,
    ai_visibility: {
      score: clampScore((aiChecks.filter((check) => check.status === PASS).length / aiChecks.length) * 100),
      checks: aiChecks,
    },
  };
}

export function buildSeoBusinessRecommendations(signals) {
  const checks = signals?.technical_checks || {};
  const recommendations = [];
  const push = (problem, impactBusiness, correction, effort = 'Faible', priority = 'P2') => {
    recommendations.push({
      category: 'SEO',
      problem,
      impact_business: impactBusiness,
      correction,
      effort,
      priority,
    });
  };

  if (checks.title_length?.status !== PASS) {
    push('Title absent ou longueur non optimale', 'Google et les prospects comprennent moins vite la promesse de la page.', 'Rédiger un title unique entre 30 et 60 caractères.', 'Faible', checks.title_length?.status === FAIL ? 'P1' : 'P2');
  }

  if (checks.meta_description_length?.status !== PASS) {
    push(checks.meta_description_length?.value ? 'Meta description trop courte' : 'Meta description absente', 'Google peut générer un extrait peu convaincant, ce qui réduit le taux de clic.', 'Ajouter une description unique de 120 à 160 caractères.', 'Faible', 'P2');
  }

  if (checks.h1_unique?.status !== PASS) {
    push('H1 absent ou multiple', 'Le sujet principal de la page est moins clair pour Google et les visiteurs.', 'Conserver un seul H1 descriptif aligné avec le title.', 'Faible', checks.h1_unique?.status === FAIL ? 'P1' : 'P2');
  }

  if (checks.headings_structure?.status !== PASS) {
    push('Structure H2/H3 insuffisante', 'Les moteurs et visiteurs scannent moins bien les arguments et sections clés de la page.', 'Ajouter une structure H2/H3 claire autour des offres, preuves, FAQ et appels à l’action.', 'Faible', 'P3');
  }

  if (checks.images_alt?.missing_count > 0) {
    push('Images sans texte alternatif', 'Les images contribuent moins au SEO image et réduisent l’accessibilité.', 'Ajouter des attributs alt descriptifs aux images utiles.', 'Faible', 'P3');
  }

  if (checks.lang_attribute?.status !== PASS) {
    push('Langue HTML non déclarée', 'Les moteurs et lecteurs d’écran identifient moins bien la langue principale.', 'Ajouter lang="fr" ou la langue correcte sur la balise html.', 'Faible', 'P3');
  }

  if (checks.robots_txt?.status !== PASS) {
    push('Robots.txt non confirmé ou bloquant', 'Les moteurs peuvent mal interpréter les zones explorables ou manquer des pages importantes.', 'Publier un robots.txt clair et vérifier qu’il ne bloque pas les pages business publiques.', 'Faible', checks.robots_txt?.blocking ? 'P1' : 'P2');
  }

  if (checks.sitemap_xml?.status !== PASS) {
    push('Sitemap non confirmé', 'Les pages importantes peuvent être découvertes plus lentement.', 'Publier /sitemap.xml et le référencer dans robots.txt.', 'Intermédiaire', 'P2');
  }

  if (checks.structured_data?.status !== PASS) {
    push('Données structurées absentes', 'La marque est moins lisible par Google, assistants IA et aperçus enrichis.', 'Ajouter un JSON-LD Organization ou LocalBusiness adapté.', 'Intermédiaire', 'P2');
  }

  if (checks.twitter_cards?.status !== PASS) {
    push('Twitter Cards incomplètes', 'Les partages sociaux affichent des aperçus moins convaincants.', 'Ajouter twitter:title, twitter:description et twitter:image.', 'Faible', 'P3');
  }

  if (checks.favicon?.status !== PASS) {
    push('Favicon non confirmé', 'Le site paraît moins professionnel dans les onglets, favoris et résultats enrichis.', 'Ajouter un favicon stable et déclaré dans le head HTML.', 'Faible', 'P3');
  }

  return recommendations;
}
