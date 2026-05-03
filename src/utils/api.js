/**
 * API Wrapper — Webisafe
 * Transforme la réponse backend en format attendu par l'UI
 * + génère recommandations et résumé exécutif professionnels
 * + plafonnement des scores côté frontend (sécurité double)
 */

// ── Helpers ratings Core Web Vitals ──────────────────────────────────────────
function getLcpRating(ms) {
  if (ms === null || ms === undefined) return 'unknown';
  if (ms < 2500) return 'good';
  if (ms < 4000) return 'needs_improvement';
  return 'poor';
}

function getClsRating(val) {
  if (val === null || val === undefined) return 'unknown';
  if (val < 0.1) return 'good';
  if (val < 0.25) return 'needs_improvement';
  return 'poor';
}

function getFcpRating(ms) {
  if (ms === null || ms === undefined) return 'unknown';
  if (ms < 1800) return 'good';
  if (ms < 3000) return 'needs_improvement';
  return 'poor';
}

// ── Helpers null-safe ─────────────────────────────────────────────────────────
function safeScore(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function safeRound(val) {
  const n = safeScore(val);
  return n === null ? null : Math.round(n);
}

// ── Normalisation headers manquants ──────────────────────────────────────────
function normalizeMissingHeaders(headersManquants) {
  if (!Array.isArray(headersManquants)) return [];
  return headersManquants.map((h) => {
    if (typeof h === 'string') return h;
    if (h?.header) return h.header;
    if (h?.label) return h.label;
    return 'Header';
  });
}

// ── Nettoyage texte : supprime les ** et les — ────────────────────────────────
function cleanText(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/ — /g, ' : ')
    .replace(/—/g, ':')
    .trim();
}

// ── Plafonnement des scores côté frontend ─────────────────────────────────────
// Sécurité double : même si le backend renvoie 100, on corrige ici.
// Règle : 0 critère échoué → max 97, 1 → max 89, 2 → max 81, etc.
function capScore(score, failedCount) {
  const n = safeScore(score);
  if (n === null) return 0;
  if (failedCount <= 0) return Math.min(n, 97);
  const cap = Math.max(15, 89 - (failedCount - 1) * 8);
  return Math.min(n, cap);
}

function getSeoFailedCount(seo) {
  let count = 0;
  if (seo.has_title === false) count++;
  if (seo.has_description === false) count++;
  if (seo.has_sitemap === false || seo.has_sitemap === undefined) count++;
  if (seo.has_canonical === false) count++;
  if (seo.has_open_graph === false) count++;
  if (seo.is_indexable === false) count++;
  if (seo.h1_count === 0) count++;
  else if (seo.h1_count > 1) count++;
  return count;
}

function getSecurityFailedCount(sec) {
  let count = 0;
  if (sec.https === false) count++;
  if (sec.malware_detected === true) count++;
  if (sec.malware_detected === null || sec.malware_detected === undefined) count++;
  const missing = normalizeMissingHeaders(sec.headers_manquants);
  count += missing.length;
  return count;
}

function getPerformanceFailedCount(perf) {
  let count = 0;
  if (perf.lcp == null) count++;
  else if (perf.lcp > 2500) count++;
  if (perf.cls == null) count++;
  else if (perf.cls > 0.1) count++;
  if (perf.fcp == null) count++;
  else if (perf.fcp > 3000) count++;
  if (perf.page_weight_mb == null) count++;
  else if (perf.page_weight_mb > 3) count++;
  return count;
}

function getUxFailedCount(ux, seo) {
  let count = 0;
  if (seo.has_viewport === false) count++;
  if (Array.isArray(ux.issues)) {
    count += ux.issues.filter(i => i.severity === 'high' || i.severity === 'medium').length;
  }
  return count;
}

function normalizeAllScores(rawData) {
  const perf = rawData.metrics?.performance ?? {};
  const sec = rawData.metrics?.security ?? {};
  const seo = rawData.metrics?.seo ?? {};
  const ux = rawData.metrics?.ux ?? {};

  const seoFailed = getSeoFailedCount(seo);
  const secFailed = getSecurityFailedCount(sec);
  const perfFailed = getPerformanceFailedCount(perf);
  const uxFailed = getUxFailedCount(ux, seo);

  const cappedPerf = capScore(rawData.scores?.performance, perfFailed);
  const cappedSec = capScore(rawData.scores?.security, secFailed);
  const cappedSeo = capScore(rawData.scores?.seo, seoFailed);
  const cappedUx = capScore(rawData.scores?.ux, uxFailed);

  // Recalcul score global pondéré
  const weights = { perf: 0.30, sec: 0.30, seo: 0.25, ux: 0.15 };
  let total = 0, totalW = 0;
  if (cappedPerf != null) { total += cappedPerf * weights.perf; totalW += weights.perf; }
  if (cappedSec != null) { total += cappedSec * weights.sec; totalW += weights.sec; }
  if (cappedSeo != null) { total += cappedSeo * weights.seo; totalW += weights.seo; }
  if (cappedUx != null) { total += cappedUx * weights.ux; totalW += weights.ux; }

  const globalCapped = totalW > 0 ? Math.min(Math.round(total / totalW), 97) : 0;

  return {
    performance: cappedPerf,
    security: cappedSec,
    seo: cappedSeo,
    ux: cappedUx,
    global: globalCapped,
  };
}

// ── Table temps estimé par type de faille (T5) ───────────────────────────────
const FAULT_TIME_MAP = {
  ssl_expired: '10 minutes',
  ssl_misconfigured: '20 minutes',
  hsts_missing: '15 minutes',
  csp_missing: '30 minutes',
  xframe_missing: '10 minutes',
  xcontent_missing: '10 minutes',
  mixed_content: '45 minutes',
  images_unoptimized: '20 minutes',
  cache_missing: '15 minutes',
  gzip_disabled: '10 minutes',
  js_render_blocking: '1 heure',
  css_render_blocking: '45 minutes',
  meta_title_missing: '5 minutes',
  meta_description_missing: '5 minutes',
  h1_missing: '5 minutes',
  alt_missing: '15 minutes',
  sitemap_missing: '20 minutes',
  robots_missing: '10 minutes',
  xss_vulnerability: '2 à 4 heures',
  sql_injection: '3 à 6 heures',
  wordpress_outdated: '15 minutes',
  plugin_outdated: '10 minutes',
  no_https_redirect: '15 minutes',
  mobile_not_responsive: '2 à 8 heures',
  malware: '4 à 8 heures',
  https_missing: '30 minutes',
  headers_missing: '30 à 60 minutes',
  sensitive_files: '1 à 2 heures',
  lcp_slow: '2 à 4 heures',
  cls_unstable: '1 à 2 heures',
  page_weight_heavy: '2 à 3 heures',
  open_graph_missing: '20 minutes',
  canonical_missing: '15 minutes',
  h1_multiple: '15 minutes',
  default: '30 minutes',
};

// ── Table difficulté par type de faille (T6) ─────────────────────────────────
const FAULT_DIFFICULTY_MAP = {
  ssl_expired: '⭐ Facile — Faisable sans développeur',
  ssl_misconfigured: '⭐⭐ Intermédiaire — Accès hébergeur requis',
  hsts_missing: '⭐⭐⭐ Technique — Modification fichier serveur',
  csp_missing: '⭐⭐⭐ Technique — Connaissance HTTP requise',
  xframe_missing: '⭐⭐ Intermédiaire — Accès hébergeur requis',
  xcontent_missing: '⭐⭐ Intermédiaire — Accès hébergeur requis',
  mixed_content: '⭐⭐ Intermédiaire — Inspection du code requise',
  images_unoptimized: '⭐ Facile — Faisable sans développeur',
  cache_missing: '⭐⭐ Intermédiaire — Plugin ou config serveur',
  gzip_disabled: '⭐⭐ Intermédiaire — Accès hébergeur requis',
  js_render_blocking: '⭐⭐⭐ Technique — Connaissance JavaScript',
  css_render_blocking: '⭐⭐⭐ Technique — Connaissance CSS',
  meta_title_missing: '⭐ Facile — Faisable sans développeur',
  meta_description_missing: '⭐ Facile — Faisable sans développeur',
  h1_missing: '⭐ Facile — Faisable sans développeur',
  alt_missing: '⭐ Facile — Faisable sans développeur',
  sitemap_missing: '⭐ Facile — Plugin WordPress ou outil en ligne',
  robots_missing: '⭐⭐ Intermédiaire — Accès FTP requis',
  xss_vulnerability: '⭐⭐⭐⭐ Expert — Développeur senior requis',
  sql_injection: '⭐⭐⭐⭐ Expert — Développeur senior requis',
  wordpress_outdated: '⭐ Facile — Faisable sans développeur',
  plugin_outdated: '⭐ Facile — Faisable sans développeur',
  no_https_redirect: '⭐⭐ Intermédiaire — Accès hébergeur requis',
  mobile_not_responsive: '⭐⭐⭐⭐ Expert — Développeur requis',
  malware: '⭐⭐⭐⭐ Expert — Professionnel requis',
  https_missing: '⭐⭐ Intermédiaire — Accès hébergeur requis',
  headers_missing: '⭐⭐ Intermédiaire — Modification config serveur',
  sensitive_files: '⭐⭐ Intermédiaire — Modification config serveur',
  lcp_slow: '⭐⭐⭐ Technique — Optimisation images et code',
  cls_unstable: '⭐⭐ Intermédiaire — Définir dimensions fixes',
  page_weight_heavy: '⭐⭐ Intermédiaire — Compression images et code',
  open_graph_missing: '⭐ Facile — Plugin SEO ou ajout manuel',
  canonical_missing: '⭐ Facile — Activable via plugin SEO',
  h1_multiple: '⭐ Facile — Faisable sans développeur',
  default: '⭐⭐ Intermédiaire',
};

function getFaultTime(faultType) {
  return FAULT_TIME_MAP[faultType] ?? FAULT_TIME_MAP.default;
}

function getFaultDifficulty(faultType) {
  return FAULT_DIFFICULTY_MAP[faultType] ?? FAULT_DIFFICULTY_MAP.default;
}

// ── Génération recommandations professionnelles ───────────────────────────────
function generateRecommendations(data) {
  const recs = [];
  const seo = data.metrics?.seo ?? {};
  const sec = data.metrics?.security ?? {};
  const perf = data.metrics?.performance ?? {};
  const ux = data.metrics?.ux ?? {};
  const missingHeaders = normalizeMissingHeaders(sec.headers_manquants);

  // SECURITE
  if (sec.malware_detected === true) {
    recs.push({
      priorite: 1, faultType: 'malware',
      categorie: 'Sécurité',
      action: 'Nettoyer le malware détecté sur votre site en urgence',
      explication: "Un logiciel malveillant a été détecté sur votre site. Des pirates ont potentiellement accès à vos données ou à celles de vos visiteurs. Google peut bloquer l'accès à votre site à tout moment.",
      impact: 'Critique : risque de blacklistage Google et perte totale de trafic',
      impactBusiness: 'Vos visiteurs peuvent être infectés, Google peut vous blacklister et afficher une alerte rouge sur votre site.',
      comment_implémenter: "1. Identifiez le malware via Sucuri ou VirusTotal. 2. Nettoyez les fichiers infectés. 3. Changez tous les mots de passe. 4. Activez un pare-feu applicatif.",
      difficulte: getFaultDifficulty('malware'),
      temps: getFaultTime('malware'),
    });
  }

  if (!sec.https) {
    recs.push({
      priorite: 2, faultType: 'https_missing',
      categorie: 'Sécurité',
      action: 'Passer votre site en HTTPS (certificat SSL)',
      explication: "Votre site fonctionne encore en HTTP, ce qui signifie que toutes les données échangées entre vos visiteurs et votre site sont visibles par des tiers. Les navigateurs modernes affichent \"Site non sécurisé\" en rouge, ce qui fait fuir les visiteurs.",
      impact: 'Sécurité +20 points, meilleure confiance des visiteurs',
      impactBusiness: "Sans HTTPS, Chrome affiche 'Site non sécurisé' et 85% des visiteurs quittent immédiatement la page.",
      comment_implémenter: "1. Commandez un certificat SSL gratuit (Let's Encrypt) via votre hébergeur (cPanel → SSL/TLS). 2. Activez la redirection HTTP → HTTPS. 3. Vérifiez les URLs internes.",
      difficulte: getFaultDifficulty('https_missing'),
      temps: getFaultTime('https_missing'),
    });
  }

  if (missingHeaders.length > 0) {
    const hasCsp = missingHeaders.some(h => h.toLowerCase().includes('content-security'));
    const hasHsts = missingHeaders.some(h => h.toLowerCase().includes('strict-transport'));
    const primaryFault = hasCsp ? 'csp_missing' : hasHsts ? 'hsts_missing' : 'headers_missing';
    recs.push({
      priorite: 3, faultType: primaryFault,
      categorie: 'Sécurité',
      action: `Activer les protections de sécurité manquantes : ${missingHeaders.join(', ')}`,
      explication: `Ces protections (appelées "headers HTTP") sont des instructions envoyées aux navigateurs pour défendre votre site contre les attaques courantes : vol de session, injection de code malveillant, détournement de clics. Il en manque ${missingHeaders.length} sur votre site.`,
      impact: 'Sécurité +10 à +25 points selon le nombre activé',
      impactBusiness: "Ces headers protègent vos visiteurs contre le clickjacking, les injections XSS et le vol de cookies de session.",
      comment_implémenter: "Ajoutez ces headers dans la config nginx (.conf) ou Apache (.htaccess). Exemple nginx : add_header X-Frame-Options \"SAMEORIGIN\"; add_header Content-Security-Policy \"default-src 'self';\";",
      difficulte: getFaultDifficulty(primaryFault),
      temps: getFaultTime(primaryFault),
    });
  }

  if (sec.sensitive_files?.critical) {
    const files = sec.sensitive_files.exposed_files ?? [];
    recs.push({
      priorite: 1, faultType: 'sensitive_files',
      categorie: 'Sécurité',
      action: "Bloquer l'accès public aux fichiers sensibles exposés",
      explication: `Des fichiers contenant potentiellement des mots de passe, clés API ou données confidentielles sont accessibles publiquement${files.length ? ` : ${files.slice(0, 3).join(', ')}` : ''}. N'importe qui peut les télécharger.`,
      impact: 'Critique : risque immédiat de fuite de données et de piratage',
      impactBusiness: "Un pirate peut accéder à vos credentials, base de données ou code source et compromettre l'ensemble de votre infrastructure.",
      comment_implémenter: "Dans .htaccess Apache : <FilesMatch \"\\.(env|log|sql|bak)$\"> deny from all </FilesMatch>. Ou dans nginx : location ~* \\.(env|log|sql) { deny all; }",
      difficulte: getFaultDifficulty('sensitive_files'),
      temps: getFaultTime('sensitive_files'),
    });
  }

  // SEO
  if (seo.has_description === false) {
    recs.push({
      priorite: 4, faultType: 'meta_description_missing',
      categorie: 'SEO',
      action: 'Rédiger une méta description optimisée pour chaque page (150 à 160 caractères)',
      explication: "La méta description est le petit texte affiché sous le titre de votre site dans Google. Sans elle, Google choisit lui-même un extrait souvent peu attractif. Un bon texte ici augmente le nombre de personnes qui cliquent sur votre lien.",
      impact: 'SEO +10 à +15 points, meilleur taux de clic dans Google',
      impactBusiness: "Une méta description bien rédigée augmente le CTR (taux de clic) de 5 à 30%, soit plus de visiteurs sans changer votre classement.",
      comment_implémenter: "Dans WordPress : Yoast SEO → modifier chaque page → remplir 'Meta description' (150-160 caractères). Commencez par votre verbe d'action et votre proposition de valeur unique.",
      difficulte: getFaultDifficulty('meta_description_missing'),
      temps: getFaultTime('meta_description_missing'),
    });
  }

  if (!seo.has_sitemap) {
    recs.push({
      priorite: 5, faultType: 'sitemap_missing',
      categorie: 'SEO',
      action: 'Créer et soumettre un sitemap XML à Google Search Console',
      explication: "Le sitemap est une liste de toutes vos pages, fournie à Google pour qu'il les trouve et les indexe plus rapidement. Sans sitemap, certaines de vos pages peuvent ne jamais apparaître dans les résultats de recherche.",
      impact: 'SEO +10 points, indexation plus rapide et complète de vos pages',
      impactBusiness: "Avec un sitemap, Google indexe vos nouvelles pages en 24-48h au lieu de plusieurs semaines. Impact direct sur la visibilité de vos produits et services.",
      comment_implémenter: "WordPress : Yoast SEO génère automatiquement votre sitemap à votresite.com/sitemap_index.xml. Soumettez ensuite dans Google Search Console → Sitemaps.",
      difficulte: getFaultDifficulty('sitemap_missing'),
      temps: getFaultTime('sitemap_missing'),
    });
  }

  if (seo.h1_count === 0) {
    recs.push({
      priorite: 5, faultType: 'h1_missing',
      categorie: 'SEO',
      action: 'Ajouter un titre principal (balise H1) sur chaque page',
      explication: "Le H1 est le titre principal de votre page, celui que Google lit en premier pour comprendre le sujet. Son absence est un signal négatif pour le référencement et désoriente vos visiteurs.",
      impact: 'SEO +8 points, meilleure compréhension par Google',
      impactBusiness: "Votre H1 est le premier signal textuel que Google utilise pour indexer votre page. Sans lui, votre page peut être classée sur des requêtes non ciblées.",
      comment_implémenter: "Chaque page doit avoir exactement un <h1>Votre titre principal</h1>. Dans WordPress, il correspond au titre de la page ou de l'article. Assurez-vous qu'il contient votre mot-clé principal.",
      difficulte: getFaultDifficulty('h1_missing'),
      temps: getFaultTime('h1_missing'),
    });
  } else if (seo.h1_count > 1) {
    recs.push({
      priorite: 6, faultType: 'h1_multiple',
      categorie: 'SEO',
      action: `Réduire à un seul titre H1 par page (${seo.h1_count} détectés actuellement)`,
      explication: "Google s'attend à trouver un seul titre principal H1 par page. En avoir plusieurs lui envoie un signal contradictoire sur le sujet de la page, ce qui peut nuire à votre positionnement.",
      impact: 'Meilleure structure SEO, évite la dilution du référencement',
      impactBusiness: "Plusieurs H1 créent une ambiguïté pour les moteurs de recherche qui ne savent plus quel sujet principal indexer.",
      comment_implémenter: "Inspectez votre HTML : gardez un seul <h1>, transformez les autres en <h2> ou <h3>. Vérifiez aussi dans votre thème que le logo ou header n'utilise pas un <h1>.",
      difficulte: getFaultDifficulty('h1_multiple'),
      temps: getFaultTime('h1_multiple'),
    });
  }

  if (seo.has_open_graph === false) {
    recs.push({
      priorite: 7, faultType: 'open_graph_missing',
      categorie: 'SEO',
      action: 'Ajouter les balises Open Graph (titre, description, image)',
      explication: "Ces balises contrôlent l'apparence de votre site quand quelqu'un partage un lien sur WhatsApp, Facebook ou LinkedIn. Sans elles, le partage affiche un aperçu vide ou peu attractif.",
      impact: 'Meilleur affichage sur les réseaux sociaux, plus de clics sur les partages',
      impactBusiness: "Un lien partagé sans Open Graph affiche un aperçu vide. Avec des balises OG, vous contrôlez l'image et le texte affiché, augmentant les clics de 40% en moyenne.",
      comment_implémenter: "Ajoutez dans le <head> : <meta property=\"og:title\" content=\"Votre titre\"> <meta property=\"og:description\" content=\"Description\"> <meta property=\"og:image\" content=\"URL image 1200x630\">",
      difficulte: getFaultDifficulty('open_graph_missing'),
      temps: getFaultTime('open_graph_missing'),
    });
  }

  if (!seo.has_canonical) {
    recs.push({
      priorite: 7, faultType: 'canonical_missing',
      categorie: 'SEO',
      action: 'Ajouter des balises canoniques sur vos pages',
      explication: "La balise canonique indique à Google quelle est la version officielle d'une page, évitant que le même contenu accessible via plusieurs URLs ne se pénalise mutuellement dans les classements.",
      impact: 'Évite la pénalité de contenu dupliqué',
      impactBusiness: "Sans canonique, si votre page est accessible en HTTP et HTTPS, ou avec/sans www, Google peut les indexer comme 2 pages distinctes et vous pénaliser pour contenu dupliqué.",
      comment_implémenter: "Ajoutez dans le <head> : <link rel=\"canonical\" href=\"https://votresite.com/votre-page/\">. Yoast SEO le fait automatiquement si bien configuré.",
      difficulte: getFaultDifficulty('canonical_missing'),
      temps: getFaultTime('canonical_missing'),
    });
  }

  // PERFORMANCE
  if (perf.lcp != null && perf.lcp > 2500) {
    const lcpSec = (perf.lcp / 1000).toFixed(1);
    recs.push({
      priorite: 3, faultType: 'lcp_slow',
      categorie: 'Performance',
      action: `Accélérer l'affichage du contenu principal (LCP actuel : ${lcpSec}s → objectif : sous 2,5s)`,
      explication: `Le LCP mesure le temps avant que le contenu principal de votre page s'affiche. À ${lcpSec} secondes, vos visiteurs attendent trop longtemps. Google le sait et vous pénalise dans ses résultats. Plus de 40% des visiteurs quittent un site qui met plus de 3 secondes à charger.`,
      impact: "Performance +10 à +20 points, moins d'abandons de visite",
      impactBusiness: `Réduire votre LCP de ${lcpSec}s à 2s peut augmenter votre taux de conversion de 15 à 25% selon les études Google.`,
      comment_implémenter: "1. Compressez votre image hero avec TinyPNG. 2. Activez le cache navigateur. 3. Ajoutez l'attribut fetchpriority=\"high\" sur votre image principale. 4. Activez la compression Gzip/Brotli sur le serveur.",
      difficulte: getFaultDifficulty('lcp_slow'),
      temps: getFaultTime('lcp_slow'),
    });
  }

  if (perf.cls != null && perf.cls > 0.1) {
    recs.push({
      priorite: 4, faultType: 'cls_unstable',
      categorie: 'Performance',
      action: `Stabiliser la mise en page (CLS : ${perf.cls.toFixed(3)} → objectif : sous 0,1)`,
      explication: "Le CLS mesure les sauts visuels : quand des éléments de la page se déplacent soudainement pendant le chargement. C'est ce qui arrive quand vous allez cliquer sur un bouton et que la page bouge juste avant. Très frustrant pour les visiteurs, et pénalisé par Google.",
      impact: 'Meilleure stabilité visuelle, moins de clics accidentels',
      impactBusiness: "Un CLS élevé génère des clics accidentels, augmente le taux de rebond et dégrade votre score Core Web Vitals qui influence directement votre classement Google.",
      comment_implémenter: "1. Définissez width et height sur toutes vos balises <img>. 2. Réservez de l'espace pour les publicités avec min-height CSS. 3. Évitez d'injecter du contenu au-dessus du contenu visible.",
      difficulte: getFaultDifficulty('cls_unstable'),
      temps: getFaultTime('cls_unstable'),
    });
  }

  if (perf.page_weight_mb != null && perf.page_weight_mb > 3) {
    recs.push({
      priorite: 4, faultType: 'page_weight_heavy',
      categorie: 'Performance',
      action: `Réduire le poids de la page (${perf.page_weight_mb} MB actuel → objectif : sous 2 MB)`,
      explication: `Votre page pèse ${perf.page_weight_mb} MB. Sur une connexion mobile 3G courante en Afrique, cela représente ${Math.round(perf.page_weight_mb * 8)} secondes de téléchargement. Compresser vos images et votre code réduirait ce temps de moitié.`,
      impact: 'Temps de chargement réduit de 30 à 50%',
      impactBusiness: "Chaque 500Ko économisé = ~1 seconde de moins sur 3G. En Afrique de l'Ouest, 70% du trafic se fait sur mobile avec des connexions limitées.",
      comment_implémenter: "1. Compressez toutes les images avec TinyPNG (images) ou Squoosh (WebP). 2. Minifiez CSS/JS dans WordPress avec WP Rocket. 3. Activez le lazy loading sur les images : <img loading=\"lazy\">.",
      difficulte: getFaultDifficulty('page_weight_heavy'),
      temps: getFaultTime('page_weight_heavy'),
    });
  }

  // UX MOBILE
  if (ux.issues_count > 0) {
    (ux.issues ?? [])
      .filter(i => i.severity === 'high')
      .forEach(issue => {
        recs.push({
          priorite: 3, faultType: 'mobile_not_responsive',
          categorie: 'UX Mobile',
          action: `Corriger le problème UX : ${issue.message}`,
          explication: issue.impact || issue.message,
          impact: 'UX Mobile +10 à +20 points',
          impactBusiness: "Un site difficile à utiliser sur mobile perd en moyenne 50% de ses visiteurs dans les 3 premières secondes.",
          comment_implémenter: "Testez votre site sur Google Mobile-Friendly Test. Corrigez chaque problème signalé : taille des boutons (min 48x48px), texte lisible (min 16px), pas de scroll horizontal.",
          difficulte: getFaultDifficulty('mobile_not_responsive'),
          temps: getFaultTime('mobile_not_responsive'),
        });
      });
  }

  // ── Recommandations avancées (3 minimum par scan) ──────────────────────────
  const advancedRecs = [];

  advancedRecs.push({
    priorite: 8, faultType: 'images_unoptimized',
    categorie: 'Performance',
    action: "Convertir toutes vos images en format WebP ou AVIF",
    explication: "Le format WebP est 25 à 35% plus léger que le JPEG à qualité équivalente. L'AVIF est encore plus efficace. La majorité des navigateurs modernes supportent ces formats, y compris sur mobile Afrique.",
    impact: "Réduction du poids de la page de 20 à 40%, amélioration du LCP",
    impactBusiness: "Des images plus légères = pages qui chargent 30 à 50% plus vite = moins d'abandons, meilleur classement Google et meilleure expérience mobile.",
    comment_implémenter: "WordPress : installez le plugin ShortPixel ou Imagify pour conversion automatique. En manuel : utilisez squoosh.app pour convertir image par image. Ajoutez l'attribut <img loading=\"lazy\"> sur toutes les images hors viewport.",
    difficulte: getFaultDifficulty('images_unoptimized'),
    temps: getFaultTime('images_unoptimized'),
  });

  advancedRecs.push({
    priorite: 8, faultType: 'cache_missing',
    categorie: 'Performance',
    action: "Mettre en place une stratégie de cache navigateur et serveur",
    explication: "Sans cache, chaque visiteur re-télécharge 100% des ressources de votre site à chaque visite. Un cache bien configuré permet aux visiteurs récurrents de charger votre site en moins d'une seconde.",
    impact: "Vitesse x3 pour les visiteurs récurrents, réduction de la bande passante serveur",
    impactBusiness: "60% de votre trafic vient de visiteurs récurrents. Un cache bien configuré leur offre une expérience instantanée et réduit votre coût d'hébergement.",
    comment_implémenter: "Apache .htaccess : <IfModule mod_expires.c> ExpiresActive On ExpiresByType image/webp \"access 1 year\" ExpiresByType text/css \"access 1 month\" </IfModule>. WordPress : WP Rocket ou W3 Total Cache.",
    difficulte: getFaultDifficulty('cache_missing'),
    temps: getFaultTime('cache_missing'),
  });

  advancedRecs.push({
    priorite: 9, faultType: 'default',
    categorie: 'SEO',
    action: "Implémenter le balisage Schema.org (données structurées) pour enrichir votre présence Google",
    explication: "Les données structurées Schema.org permettent à Google d'afficher des Rich Snippets : étoiles d'avis, prix, horaires, FAQ directement dans les résultats de recherche. Résultat : votre lien occupe plus d'espace et attire davantage de clics.",
    impact: "Augmentation du CTR de 20 à 40%, meilleure visibilité dans les SERP",
    impactBusiness: "Vos concurrents avec des rich snippets reçoivent 2x plus de clics que des résultats classiques, même s'ils sont positionnés en dessous.",
    comment_implémenter: "Choisissez le type Schema adapté (LocalBusiness, Product, Article, FAQPage). Générez le JSON-LD sur schema.org/generator. Injectez-le dans le <head> de vos pages. Validez avec l'outil de test Google.",
    difficulte: '⭐⭐ Intermédiaire — Connaissance JSON/HTML recommandée',
    temps: '1 à 3 heures',
  });

  if (perf.lcp == null || (perf.lcp != null && perf.lcp > 1500)) {
    advancedRecs.push({
      priorite: 9, faultType: 'js_render_blocking',
      categorie: 'Performance',
      action: "Éliminer les ressources JavaScript et CSS bloquant le rendu de la page",
      explication: "Les fichiers JS et CSS chargés dans le <head> sans async/defer bloquent l'affichage de la page jusqu'à leur téléchargement complet. C'est l'une des causes les plus fréquentes de LCP élevé et de mauvais score PageSpeed.",
      impact: "Performance +10 à +25 points, LCP amélioré de 0,5 à 2 secondes",
      impactBusiness: "Éliminer les render-blocking resources peut réduire votre temps de chargement perçu de moitié, directement mesurable par Google Lighthouse.",
      comment_implémenter: "1. Ajoutez defer sur vos balises script : <script src=\"app.js\" defer>. 2. Chargez les CSS critiques inline et les autres en asynchrone. 3. Utilisez la section 'Eliminate render-blocking resources' de PageSpeed pour identifier les fichiers à corriger.",
      difficulte: getFaultDifficulty('js_render_blocking'),
      temps: getFaultTime('js_render_blocking'),
    });
  }
  advancedRecs.slice(0, 5).forEach(rec => recs.push(rec));

  // Recommandations issues des nouveaux checks de sécurité avancés
  // (DNS, SPF/DMARC, fichiers sensibles, panneaux admin, Safe Browsing, HIBP, mixed content)
  const advancedChecks = Array.isArray(sec.advanced_checks) ? sec.advanced_checks : [];
  const CRITICALITY_TO_PRIORITY = { critical: 1, major: 3, minor: 6 };
  advancedChecks
    .filter((c) => c.status === 'fail' || c.status === 'warning')
    .forEach((c) => {
      const isWarning = c.status === 'warning';
      recs.push({
        priorite: (CRITICALITY_TO_PRIORITY[c.criticality] ?? 5) + (isWarning ? 1 : 0),
        faultType: c.check_name,
        categorie: 'Sécurité',
        action: c.title,
        explication: c.description,
        impact: isWarning ? `Sécurité - ${c.score_impact} points (avertissement)` : `Sécurité - ${c.score_impact} points`,
        impactBusiness: c.description,
        comment_implémenter: c.recommendation,
        difficulte: c.difficulty,
        temps: c.time_estimate,
        technical_detail: c.technical_detail,
        criticality: c.criticality,
        check_status: c.status,
      });
    });

  return recs.sort((a, b) => (a.priorite ?? 9) - (b.priorite ?? 9));
}

function generateResume(data) {
  const score = safeScore(data.global_score) ?? 0;
  const scores = data.scores ?? {};
  const sec = data.metrics?.security ?? {};
  const seo = data.metrics?.seo ?? {};
  const perf = data.metrics?.performance ?? {};
  const ux = data.metrics?.ux ?? {};
  const missingHeaders = normalizeMissingHeaders(sec.headers_manquants);
  const uxScore = safeScore(scores.ux_mobile ?? scores.ux);

  let domain = 'Votre site';
  try { domain = new URL(data.url).hostname; } catch {}

  let intro = '';
  if (score >= 85) {
    intro = `Bonne nouvelle : ${domain} affiche un score global de ${score}/100, ce qui place votre site dans la catégorie des sites bien optimisés. Quelques ajustements ciblés vous permettront d'atteindre l'excellence.`;
  } else if (score >= 70) {
    intro = `${domain} obtient un score de ${score}/100. Votre site est fonctionnel et visible, mais il présente plusieurs points d'amélioration qui freinent sa performance et sa sécurité au quotidien.`;
  } else if (score >= 50) {
    intro = `${domain} obtient un score de ${score}/100. Votre site fonctionne, mais souffre de lacunes importantes qui pénalisent son référencement Google, la sécurité de vos visiteurs et la vitesse de chargement sur mobile.`;
  } else if (score >= 30) {
    intro = `${domain} obtient un score de ${score}/100. Votre site présente des faiblesses sérieuses qui nuisent directement à votre activité : visiteurs qui partent, mauvais classement Google, données potentiellement exposées.`;
  } else {
    intro = `${domain} obtient un score critique de ${score}/100. Votre site nécessite une intervention urgente : plusieurs problèmes majeurs affectent sa sécurité, sa visibilité sur Google et l'expérience de vos visiteurs.`;
  }

  const details = [];

  // Performance
  if (scores.performance != null) {
    const s = scores.performance;
    if (s >= 85) {
      details.push(
        `Performance (${s}/100) : Votre site se charge rapidement. Vos visiteurs arrivent sur une page réactive, ce qui réduit les abandons et améliore votre positionnement Google.`
      );
    } else if (s >= 65) {
      const lcpInfo = perf.lcp
        ? ` Le contenu principal s'affiche en ${(perf.lcp / 1000).toFixed(1)}s, l'objectif recommandé par Google est 2,5s.`
        : '';
      details.push(
        `Performance (${s}/100) : Votre site se charge en dessous des standards de Google.${lcpInfo} Sur mobile ou en 3G, vos visiteurs peuvent patienter plusieurs secondes avant de voir la page.`
      );
    } else {
      const lcpInfo = perf.lcp
        ? ` Le contenu principal s'affiche après ${(perf.lcp / 1000).toFixed(1)} secondes.`
        : '';
      details.push(
        `Performance (${s}/100) : Votre site est lent.${lcpInfo} Au-delà de 3 secondes, 40% des visiteurs abandonnent. C'est une perte directe de clients potentiels.`
      );
    }
  }

  // Sécurité
  if (scores.security != null) {
    const s = scores.security;
    if (sec.malware_detected === true) {
      details.push(
        `Sécurité (${s}/100) - URGENT : Un malware a été détecté sur votre site. Votre site pourrait être utilisé pour attaquer vos visiteurs. Google peut le bloquer complètement. Agissez immédiatement.`
      );
    } else if (s >= 80) {
      const note = missingHeaders.length
        ? ` Pour aller plus loin, activez : ${missingHeaders.join(', ')}.`
        : '';
      details.push(
        `Sécurité (${s}/100) : Votre site dispose d'un bon niveau de protection.${note}`
      );
    } else if (s >= 55) {
      const hdrs = missingHeaders.length
        ? ` Il manque ${missingHeaders.length} protection(s) clé(s) : ${missingHeaders.slice(0, 3).join(', ')}${missingHeaders.length > 3 ? '...' : ''}.`
        : '';
      details.push(
        `Sécurité (${s}/100) : La sécurité de votre site est partielle.${hdrs} Ces protections manquantes peuvent exposer vos visiteurs à des risques d'attaques invisibles.`
      );
    } else {
      const httpsNote = !sec.https
        ? " Votre site n'utilise pas HTTPS, les données de vos visiteurs ne sont pas chiffrées."
        : '';
      const hdrsNote = missingHeaders.length > 0
        ? ` Il manque ${missingHeaders.length} protection(s) de sécurité essentielles.`
        : '';
      details.push(
        `Sécurité (${s}/100) : Votre site est vulnérable.${httpsNote}${hdrsNote} Des pirates pourraient exploiter ces failles pour accéder à vos données ou piéger vos visiteurs.`
      );
    }
  }

  // SEO
  if (scores.seo != null) {
    const s = scores.seo;
    const sitemapNote = !seo.has_sitemap
      ? ' Le sitemap (carte de votre site pour Google) est absent.'
      : '';
    const descNote = seo.has_description === false
      ? ' La description dans Google est vide.'
      : '';
    const canonicalNote = !seo.has_canonical
      ? ' La balise canonique est manquante.'
      : '';

    if (s >= 85) {
      details.push(
        `SEO (${s}/100) : Votre site est bien structuré pour Google. Les éléments essentiels sont en place pour une bonne visibilité dans les résultats de recherche.`
      );
    } else if (s >= 65) {
      details.push(
        `SEO (${s}/100) : Votre référencement est correct mais perfectible.${sitemapNote}${descNote}${canonicalNote} Ces manques limitent votre visibilité et réduisent le nombre de personnes qui trouvent votre site sur Google.`
      );
    } else {
      details.push(
        `SEO (${s}/100) : Votre site est peu visible sur Google.${descNote}${sitemapNote} Sans les bases du SEO, votre site peut être ignoré par les moteurs de recherche, même si votre contenu est excellent.`
      );
    }
  }

  // UX Mobile
  if (uxScore != null) {
    const issuesCount = ux.issues_count ?? 0;
    const noViewport = !seo.has_viewport;

    if (uxScore >= 85) {
      details.push(
        `UX Mobile (${uxScore}/100) : Votre site offre une bonne expérience sur smartphone. Les visiteurs naviguent facilement, que ce soit sur iPhone, Android ou tablette.`
      );
    } else if (uxScore >= 60) {
      const note = noViewport
        ? " La balise viewport est absente : certains smartphones n'adaptent pas correctement l'affichage."
        : issuesCount > 0
          ? ` ${issuesCount} problème(s) d'affichage détecté(s).`
          : '';
      details.push(
        `UX Mobile (${uxScore}/100) : L'expérience sur mobile est perfectible.${note} En Afrique où plus de 80% des internautes naviguent depuis un téléphone, c'est un point crucial.`
      );
    } else {
      details.push(
        `UX Mobile (${uxScore}/100) : Votre site est difficile à utiliser sur smartphone.${issuesCount > 0 ? ` ${issuesCount} problème(s) identifié(s).` : ''} En Afrique de l'Ouest, la majorité de vos visiteurs naviguent sur mobile : une mauvaise expérience les fait partir immédiatement.`
      );
    }
  }

  // Conclusion
  const problemCount = [scores.performance, scores.security, scores.seo, uxScore]
    .filter(s => s != null && s < 65).length;

  let conclusion = '';
  if (problemCount === 0) {
    conclusion = `En résumé : Votre site est en bon état. Appliquez les recommandations ci-dessous pour atteindre l'excellence et prendre de l'avance sur vos concurrents.`;
  } else if (problemCount === 1) {
    conclusion = `En résumé : Votre site a une base solide. Un point majeur nécessite votre attention. Une fois corrigé, vous gagnerez significativement en visibilité et en confiance client.`;
  } else if (problemCount === 2) {
    conclusion = `En résumé : Votre site a du potentiel mais souffre de ${problemCount} axes faibles. En corrigeant ces points selon les recommandations, vous améliorerez rapidement votre position sur Google et la confiance de vos visiteurs.`;
  } else {
    conclusion = `En résumé : Plusieurs axes critiques requièrent votre attention. Chaque correction apportera un gain mesurable en trafic, en sécurité et en satisfaction client. Commencez par les priorités 1 et 2 du plan d'action.`;
  }

  // Nettoyage final de sécurité : supprime tout ** ou — résiduel
  return cleanText([intro, ...details, conclusion].join('\n\n'));
}

// ── Fonction principale ───────────────────────────────────────────────────────
export async function runFullAnalysis(url, onProgress, email) {
  const TOTAL_STEPS = 6;
  onProgress?.({ step: 0 });

  let currentStep = 0;
  const progressInterval = setInterval(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      currentStep++;
      onProgress?.({ step: currentStep });
    }
  }, 3000);

  try {
    const storedAuth = (() => {
      try {
        return JSON.parse(localStorage.getItem('webisafe_auth') || '{}');
      } catch {
        return {};
      }
    })();

    const effectiveEmail = email || storedAuth?.email || '';

    const payload = { url, force_refresh: true };
    if (effectiveEmail) payload.email = effectiveEmail;

    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Envoie l'id utilisateur au backend pour associer le scan au compte
        'x-user-id': (() => {
          try {
            return JSON.parse(localStorage.getItem('webisafe_auth') || '{}')?.id || '';
          } catch {
            return '';
          }
        })(),
      },
      body: JSON.stringify(payload),
    });

    clearInterval(progressInterval);
    onProgress?.({ step: TOTAL_STEPS });

    if (!response.ok) {
      // Try to extract helpful error information (JSON or plain text)
      let bodyText = '';
      try { bodyText = await response.text(); } catch (e) { bodyText = ''; }

      // Attempt to parse JSON error
      let parsedError = null;
      try {
        const parsed = JSON.parse(bodyText || '{}');
        if (parsed && parsed.error) parsedError = parsed.error;
      } catch (_) {
        // not JSON, fall through
      }

      if (parsedError) {
        throw new Error(parsedError);
      }
      const truncated = (bodyText || '').toString().slice(0, 800).replace(/\n/g, ' ');
      throw new Error(`HTTP ${response.status} ${response.statusText}${truncated ? ' - ' + truncated : ''}`);
    }

    const rawData = await response.json();
    if (!rawData.success) throw new Error(rawData.error || 'Analyse échouée');

    /**
     * Sécurité frontend :
     * Même si le backend ou le cache Supabase renvoie SEO = 100 avec sitemap absent,
     * on recalcule des scores cohérents depuis les métriques réelles.
     * Un score de 100/100 est impossible ici.
     */
    const normalizedScores = normalizeAllScores(rawData);

    // On fusionne les données brutes avec les scores corrigés
    const data = {
      ...rawData,
      global_score: normalizedScores.global,
      scores: {
        ...rawData.scores,
        performance: normalizedScores.performance,
        security: normalizedScores.security,
        seo: normalizedScores.seo,
        ux: normalizedScores.ux,
      },
    };

    // Extraction sécurisée depuis les données corrigées
    const perf = data.metrics?.performance ?? {};
    const sec = data.metrics?.security ?? {};
    const seo = data.metrics?.seo ?? {};
    const ux = data.metrics?.ux ?? {};

    const lcpValue = safeRound(perf.lcp);
    const clsValue = perf.cls ?? null;
    const fcpValue = safeRound(perf.fcp);
    const uxScore = normalizedScores.ux;

    // Recommandations + résumé basés sur les données corrigées
    const allRecommendations = generateRecommendations(data);
    const resume = generateResume({
      ...data,
      scores: {
        ...data.scores,
        ux_mobile: uxScore,
        global: normalizedScores.global,
      },
    });

    return {
      // Données backend brutes conservées
      ...data,

      // Champs corrigés explicitement
      url: data.url ?? url,
      global_score: normalizedScores.global,
      grade: data.grade ?? null,
      metrics: data.metrics ?? {},
      critical_alerts: Array.isArray(data.critical_alerts) ? data.critical_alerts : [],

      // Format UI — scores plafonnés, jamais 100
      success: true,
      scores: {
        global: normalizedScores.global,
        performance: normalizedScores.performance ?? 0,
        security: normalizedScores.security ?? 0,
        seo: normalizedScores.seo ?? 0,
        ux_mobile: uxScore ?? 0,
        ux: uxScore ?? 0,
      },

      // Résumé UI : utiliser la valeur fournie par le backend si présente
      summary: {
        https_enabled: rawData?.summary?.https_enabled ?? String(data.url || '').startsWith('https'),
      },

      performance: {
        core_web_vitals: {
          lcp: { value: lcpValue, rating: getLcpRating(lcpValue) },
          cls: { value: clsValue, rating: getClsRating(clsValue) },
          fcp: { value: fcpValue, rating: getFcpRating(fcpValue) },
        },
        poids_page_mb: perf.page_weight_mb ?? null,
        nb_requetes: perf.nb_requetes ?? null,
        partial: perf.partial ?? false,
        server_location: perf.server_location ?? null,
        opportunities: perf.opportunities ?? [],
      },

      security: {
        ssl_grade: sec.ssl_grade ?? (String(data.url || '').startsWith('https') ? 'OK' : 'Absent'),
        headers_manquants: normalizeMissingHeaders(sec.headers_manquants),
        malware: sec.malware_detected ?? false,
        failles_owasp_count: sec.failles_owasp_count ?? 0,
        sensitive_files: sec.sensitive_files ?? null,
        advanced_checks: Array.isArray(sec.advanced_checks) ? sec.advanced_checks : [],
        advanced_security_score: sec.advanced_security_score ?? null,
        advanced_counts: sec.advanced_counts ?? null,
      },

      seo: {
        indexed: true,
        sitemap_present: seo.has_sitemap ?? false,
        meta_tags_ok: Boolean(seo.has_title && seo.has_description),
        open_graph: seo.has_open_graph ?? false,
      },

      ux: {
        responsive: seo.has_viewport ?? null,
        taille_texte_px: 16,
        elements_tactiles_ok: ux.tap_targets_ok ?? null,
        vitesse_mobile: uxScore ?? 0,
        partial: ux.partial ?? false,
        issues: ux.issues ?? [],
        grade: ux.grade ?? null,
      },

      summary: {
        https_enabled: String(data.url || '').startsWith('https'),
        resume_executif: resume,
      },

      recommendations: allRecommendations,
      recommendations_preview: allRecommendations.slice(0, 3),
      ai_analysis: {
        recommandations_prioritaires: allRecommendations,
      },
    };
  } catch (error) {
    clearInterval(progressInterval);
    console.error('API Error:', error);
    throw error;
  }
}