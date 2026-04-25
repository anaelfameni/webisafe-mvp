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
      priorite: 1,
      categorie: 'Sécurité',
      action: 'Nettoyer le malware détecté sur votre site en urgence',
      explication: "Un logiciel malveillant a été détecté sur votre site. Des pirates ont potentiellement accès à vos données ou à celles de vos visiteurs. Google peut bloquer l'accès à votre site à tout moment.",
      impact: 'Critique : risque de blacklistage Google et perte totale de trafic',
      difficulte: 'Difficile : faites appel à un professionnel',
      temps: '4 à 8 heures',
    });
  }

  if (!sec.https) {
    recs.push({
      priorite: 2,
      categorie: 'Sécurité',
      action: 'Passer votre site en HTTPS (certificat SSL)',
      explication: "Votre site fonctionne encore en HTTP, ce qui signifie que toutes les données échangées entre vos visiteurs et votre site sont visibles par des tiers. Les navigateurs modernes affichent \"Site non sécurisé\" en rouge, ce qui fait fuir les visiteurs.",
      impact: 'Sécurité +20 points, meilleure confiance des visiteurs',
      difficulte: 'Facile : activable chez votre hébergeur en 30 minutes',
      temps: '30 minutes',
    });
  }

  if (missingHeaders.length > 0) {
    recs.push({
      priorite: 3,
      categorie: 'Sécurité',
      action: `Activer les protections de sécurité manquantes : ${missingHeaders.join(', ')}`,
      explication: `Ces protections (appelées "headers HTTP") sont des instructions envoyées aux navigateurs pour défendre votre site contre les attaques courantes : vol de session, injection de code malveillant, détournement de clics. Il en manque ${missingHeaders.length} sur votre site.`,
      impact: 'Sécurité +10 à +25 points selon le nombre activé',
      difficulte: 'Facile à moyenne : modification dans la configuration serveur',
      temps: '30 à 60 minutes',
    });
  }

  if (sec.sensitive_files?.critical) {
    const files = sec.sensitive_files.exposed_files ?? [];
    recs.push({
      priorite: 1,
      categorie: 'Sécurité',
      action: "Bloquer l'accès public aux fichiers sensibles exposés",
      explication: `Des fichiers contenant potentiellement des mots de passe, clés API ou données confidentielles sont accessibles publiquement${files.length ? ` : ${files.slice(0, 3).join(', ')}` : ''}. N'importe qui peut les télécharger.`,
      impact: 'Critique : risque immédiat de fuite de données et de piratage',
      difficulte: 'Moyenne : modification de la configuration serveur (.htaccess ou nginx)',
      temps: '1 à 2 heures',
    });
  }

  // SEO
  if (seo.has_description === false) {
    recs.push({
      priorite: 4,
      categorie: 'SEO',
      action: 'Rédiger une méta description pour chaque page (150 à 160 caractères)',
      explication: "La méta description est le petit texte affiché sous le titre de votre site dans Google. Sans elle, Google choisit lui-même un extrait souvent peu attractif. Un bon texte ici augmente le nombre de personnes qui cliquent sur votre lien.",
      impact: 'SEO +10 à +15 points, meilleur taux de clic dans Google',
      difficulte: 'Facile : à rédiger directement dans votre CMS',
      temps: '15 minutes',
    });
  }

  if (!seo.has_sitemap) {
    recs.push({
      priorite: 5,
      categorie: 'SEO',
      action: 'Créer et soumettre un sitemap XML à Google',
      explication: "Le sitemap est une liste de toutes vos pages, fournie à Google pour qu'il les trouve et les indexe plus rapidement. Sans sitemap, certaines de vos pages peuvent ne jamais apparaître dans les résultats de recherche.",
      impact: 'SEO +10 points, indexation plus rapide et complète de vos pages',
      difficulte: 'Facile : générable automatiquement avec un plugin (ex: Yoast pour WordPress)',
      temps: '20 minutes',
    });
  }

  if (seo.h1_count === 0) {
    recs.push({
      priorite: 5,
      categorie: 'SEO',
      action: 'Ajouter un titre principal (balise H1) sur chaque page',
      explication: "Le H1 est le titre principal de votre page, celui que Google lit en premier pour comprendre le sujet. Son absence est un signal négatif pour le référencement et désoriente vos visiteurs.",
      impact: 'SEO +8 points, meilleure compréhension par Google',
      difficulte: 'Facile : modifiable dans votre éditeur de contenu',
      temps: '10 minutes',
    });
  } else if (seo.h1_count > 1) {
    recs.push({
      priorite: 6,
      categorie: 'SEO',
      action: `Réduire à un seul titre H1 par page (${seo.h1_count} détectés actuellement)`,
      explication: "Google s'attend à trouver un seul titre principal H1 par page. En avoir plusieurs lui envoie un signal contradictoire sur le sujet de la page, ce qui peut nuire à votre positionnement.",
      impact: 'Meilleure structure SEO, évite la dilution du référencement',
      difficulte: 'Facile',
      temps: '15 minutes',
    });
  }

  if (seo.has_open_graph === false) {
    recs.push({
      priorite: 7,
      categorie: 'SEO',
      action: 'Ajouter les balises Open Graph (titre, description, image)',
      explication: "Ces balises contrôlent l'apparence de votre site quand quelqu'un partage un lien sur WhatsApp, Facebook ou LinkedIn. Sans elles, le partage affiche un aperçu vide ou peu attractif.",
      impact: 'Meilleur affichage sur les réseaux sociaux, plus de clics sur les partages',
      difficulte: 'Facile : plugin SEO ou ajout manuel dans le head',
      temps: '20 minutes',
    });
  }

  if (!seo.has_canonical) {
    recs.push({
      priorite: 7,
      categorie: 'SEO',
      action: 'Ajouter des balises canoniques sur vos pages',
      explication: "La balise canonique indique à Google quelle est la version officielle d'une page, évitant que le même contenu accessible via plusieurs URLs ne se pénalise mutuellement dans les classements.",
      impact: 'Évite la pénalité de contenu dupliqué',
      difficulte: 'Facile : activable via plugin SEO',
      temps: '15 minutes',
    });
  }

  // PERFORMANCE
  if (perf.lcp != null && perf.lcp > 2500) {
    const lcpSec = (perf.lcp / 1000).toFixed(1);
    recs.push({
      priorite: 3,
      categorie: 'Performance',
      action: `Accélérer l'affichage du contenu principal (actuellement ${lcpSec}s, objectif sous 2,5s)`,
      explication: `Le LCP mesure le temps avant que le contenu principal de votre page s'affiche. À ${lcpSec} secondes, vos visiteurs attendent trop longtemps. Google le sait et vous pénalise dans ses résultats. Plus de 40% des visiteurs quittent un site qui met plus de 3 secondes à charger.`,
      impact: "Performance +10 à +20 points, moins d'abandons de visite",
      difficulte: 'Moyenne : optimisation des images et du code',
      temps: '2 à 4 heures',
    });
  }

  if (perf.cls != null && perf.cls > 0.1) {
    recs.push({
      priorite: 4,
      categorie: 'Performance',
      action: `Stabiliser la mise en page (score CLS actuellement ${perf.cls.toFixed(3)}, objectif sous 0,1)`,
      explication: "Le CLS mesure les sauts visuels : quand des éléments de la page se déplacent soudainement pendant le chargement. C'est ce qui arrive quand vous allez cliquer sur un bouton et que la page bouge juste avant. Très frustrant pour les visiteurs, et pénalisé par Google.",
      impact: 'Meilleure stabilité visuelle, moins de clics accidentels',
      difficulte: 'Moyenne : définir des dimensions fixes pour images et publicités',
      temps: '1 à 2 heures',
    });
  }

  if (perf.page_weight_mb != null && perf.page_weight_mb > 3) {
    recs.push({
      priorite: 4,
      categorie: 'Performance',
      action: `Réduire le poids de la page (actuellement ${perf.page_weight_mb} MB, objectif sous 2 MB)`,
      explication: `Votre page pèse ${perf.page_weight_mb} MB. Sur une connexion mobile 3G courante en Afrique, cela représente ${Math.round(perf.page_weight_mb * 8)} secondes de téléchargement. Compresser vos images et votre code réduirait ce temps de moitié.`,
      impact: 'Temps de chargement réduit de 30 à 50%',
      difficulte: "Moyenne : compression d'images et minification du code",
      temps: '2 à 3 heures',
    });
  }

  // UX MOBILE
  if (ux.issues_count > 0) {
    (ux.issues ?? [])
      .filter(i => i.severity === 'high')
      .forEach(issue => {
        recs.push({
          priorite: 3,
          categorie: 'UX Mobile',
          action: `Corriger : ${issue.message}`,
          explication: issue.impact,
          impact: 'UX Mobile +10 à +20 points',
          difficulte: 'Variable',
          temps: '1 à 3 heures',
        });
      });
  }

  return recs.sort((a, b) => (a.priorite ?? 9) - (b.priorite ?? 9));
}

// ── Résumé exécutif — texte propre, sans markdown, sans tirets longs ──────────
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
  try { domain = new URL(data.url).hostname; } catch { /* conserve fallback */ }

  // Introduction selon le score global — pas de ** ni de —
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
export async function runFullAnalysis(url, onProgress) {
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
      body: JSON.stringify({ url }),
    });

    clearInterval(progressInterval);
    onProgress?.({ step: TOTAL_STEPS });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Échec de l'analyse");
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