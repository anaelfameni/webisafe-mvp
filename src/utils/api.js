/**
 * API Wrapper pour Webisafe
 * Transforme la réponse du backend Express vers le format attendu par Analyse.jsx
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

// ── Génération de recommandations basées sur les données réelles ──────────────
function generateRecommendations(data) {
  const recs = [];
  const seo = data.metrics?.seo || {};
  const sec = data.metrics?.security || {};
  const perf = data.metrics?.performance || {};
  const ux = data.metrics?.ux || {};

  if (sec.malware_detected) {
    recs.push({
      action: '⚠️ URGENT : Malware détecté ! Nettoyer le site immédiatement',
      impact: 'Sécurité CRITIQUE - Risque de perte de données',
      difficulte: 'Difficile',
      temps: '4-8 heures',
    });
  }

  if (!data.url?.startsWith('https')) {
    recs.push({
      action: 'Activer HTTPS avec un certificat SSL',
      impact: 'Sécurité +25 points',
      difficulte: 'Facile',
      temps: '30 minutes',
    });
  }

  if (sec.headers_manquants?.length > 0) {
    recs.push({
      action: `Ajouter les headers de sécurité manquants : ${sec.headers_manquants.join(', ')}`,
      impact: 'Sécurité +15-20 points',
      difficulte: 'Facile',
      temps: '1 heure',
    });
  }

  if (!seo.has_description) {
    recs.push({
      action: 'Ajouter une balise meta description optimisée (150-160 caractères)',
      impact: 'SEO +15 points, meilleur affichage Google',
      difficulte: 'Facile',
      temps: '15 minutes',
    });
  }

  if (seo.h1_count === 0) {
    recs.push({
      action: 'Ajouter une balise H1 unique et descriptive',
      impact: 'SEO +10 points, meilleur référencement',
      difficulte: 'Facile',
      temps: '10 minutes',
    });
  }

  if (seo.h1_count > 1) {
    recs.push({
      action: `Réduire les balises H1 à une seule (${seo.h1_count} détectées)`,
      impact: 'Structure SEO améliorée',
      difficulte: 'Facile',
      temps: '15 minutes',
    });
  }

  if (!seo.has_viewport) {
    recs.push({
      action: 'Ajouter la balise meta viewport pour la compatibilité mobile',
      impact: 'UX Mobile +15 points',
      difficulte: 'Facile',
      temps: '5 minutes',
    });
  }

  if (!seo.has_open_graph) {
    recs.push({
      action: 'Ajouter les balises Open Graph (og:title, og:description, og:image)',
      impact: 'Meilleur affichage sur les réseaux sociaux',
      difficulte: 'Facile',
      temps: '20 minutes',
    });
  }

  if (perf.lcp !== null && perf.lcp > 2500) {
    recs.push({
      action: `Optimiser le LCP (actuellement ${Math.round(perf.lcp)}ms, objectif < 2500ms)`,
      impact: 'Performance +15-20 points',
      difficulte: 'Moyenne',
      temps: '2-4 heures',
    });
  }

  if (perf.cls !== null && perf.cls > 0.1) {
    recs.push({
      action: `Réduire le CLS (actuellement ${perf.cls.toFixed(3)}, objectif < 0.1)`,
      impact: 'Stabilité visuelle améliorée',
      difficulte: 'Moyenne',
      temps: '1-2 heures',
    });
  }

  if (perf.page_weight_mb !== null && perf.page_weight_mb > 3) {
    recs.push({
      action: `Réduire le poids de la page (actuellement ${perf.page_weight_mb} MB, objectif < 2 MB)`,
      impact: 'Temps de chargement réduit de 30-50%',
      difficulte: 'Moyenne',
      temps: '2-3 heures',
    });
  }

  if (ux.accessibility_score !== null && ux.accessibility_score < 70) {
    recs.push({
      action: "Améliorer l'accessibilité (contraste, labels, attributs ARIA)",
      impact: 'Accessibilité +20 points',
      difficulte: 'Moyenne',
      temps: '3-5 heures',
    });
  }

  return recs;
}

// ── Génération du résumé exécutif ─────────────────────────────────────────────
function generateResume(data) {
  const score = data.global_score ?? 0;
  const scores = data.scores ?? {};
  const sec = data.metrics?.security ?? {};
  const seo = data.metrics?.seo ?? {};

  let intro = '';
  if (score >= 80) intro = `Avec un score global de ${score}/100, votre site présente un bon niveau général. Quelques optimisations ciblées permettront d'atteindre l'excellence.`;
  else if (score >= 60) intro = `Avec un score global de ${score}/100, votre site nécessite des améliorations significatives pour rester compétitif et sécurisé.`;
  else if (score >= 40) intro = `Avec un score global de ${score}/100, votre site présente des faiblesses importantes qui impactent directement votre activité en ligne.`;
  else intro = `Avec un score global de ${score}/100, votre site est dans un état critique qui nécessite une intervention immédiate pour éviter des pertes de clients et de revenus.`;

  const details = [];

  if (scores.performance != null && scores.performance >= 80) {
    details.push(`La performance est un point fort (${scores.performance}/100) avec des temps de chargement acceptables`);
  } else if (scores.performance != null && scores.performance < 50) {
    details.push(`La performance est critique (${scores.performance}/100) — vos visiteurs quittent le site avant même qu'il ne se charge`);
  }

  if (scores.security != null && scores.security < 50) {
    details.push(`La sécurité est préoccupante (${scores.security}/100) et expose votre site à des risques de piratage`);
  }

  if (scores.seo != null && scores.seo < 40) {
    details.push(`Le SEO est très faible (${scores.seo}/100) — votre site est quasiment invisible sur Google`);
  } else if (scores.seo != null && scores.seo < 60) {
    details.push(`Le SEO est insuffisant (${scores.seo}/100) — vous perdez des visiteurs potentiels chaque jour`);
  }

  if (sec.malware_detected) {
    details.push('⚠️ ALERTE : Un malware a été détecté sur votre site. Cela peut entraîner un blocage par Google et une perte totale de trafic');
  }

  if (!seo.has_description && !seo.has_open_graph) {
    details.push('Les balises meta essentielles sont absentes, ce qui nuit à votre visibilité sur Google et les réseaux sociaux');
  }

  return details.length > 0 ? `${intro}\n\n${details.join('. ')}.` : intro;
}

// ── Helpers null-safe ─────────────────────────────────────────────────────────
// Différencie "score inconnu" (null) de "score zéro" (0)
function safeScore(val) {
  if (val === null || val === undefined) return null;
  return Number(val);
}

function safeRound(val) {
  if (val === null || val === undefined) return null;
  return Math.round(val);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    clearInterval(progressInterval);
    onProgress?.({ step: TOTAL_STEPS });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Échec de l'analyse");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Analyse échouée');
    }

    // ── Extraction sécurisée ──────────────────────────────────────────────
    const perf = data.metrics?.performance ?? {};
    const sec = data.metrics?.security ?? {};
    const seo = data.metrics?.seo ?? {};
    const ux = data.metrics?.ux ?? {};

    // Valeurs null conservées (ne pas les remplacer par 0)
    const lcpValue = perf.lcp !== null && perf.lcp !== undefined ? Math.round(perf.lcp) : null;
    const clsValue = perf.cls ?? null;
    const fcpValue = perf.fcp !== null && perf.fcp !== undefined ? Math.round(perf.fcp) : null;

    const allRecommendations = generateRecommendations(data);
    const resume = generateResume(data);

    return {
      scores: {
        global: safeScore(data.global_score) ?? 0,
        performance: safeScore(data.scores?.performance) ?? 0, // ✅ 0 si non mesuré
        security: safeScore(data.scores?.security) ?? 0,
        seo: safeScore(data.scores?.seo) ?? 0,
        ux_mobile: safeScore(data.scores?.ux) ?? 0,
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
      },

      security: {
        ssl_grade: sec.ssl_grade ?? (data.url?.startsWith('https') ? 'OK' : 'Absent'),
        headers_manquants: sec.headers_manquants ?? [],
        malware: sec.malware_detected ?? false,
        failles_owasp_count: sec.failles_owasp_count ?? 0,
      },

      seo: {
        indexed: true, // pas encore vérifiable sans API dédiée
        sitemap_present: seo.has_sitemap ?? false,
        meta_tags_ok: (seo.has_title && seo.has_description) ?? false,
        open_graph: seo.has_open_graph ?? false,
      },

      ux: {
        responsive: ux.tap_targets_ok !== false,
        taille_texte_px: ux.font_size ?? 16,
        elements_tactiles_ok: ux.tap_targets_ok ?? null,
        vitesse_mobile: safeScore(data.scores?.ux), // peut être null
        partial: ux.partial ?? false,
      },

      summary: {
        https_enabled: data.url?.startsWith('https') ?? false,
        resume_executif: resume,
      },

      recommendations: allRecommendations,
      recommendations_preview: allRecommendations.slice(0, 3),
      ai_analysis: { recommandations_prioritaires: allRecommendations },
      scan_id: data.scan_id,
      scan_duration_ms: data.scan_duration_ms,
    };

  } catch (error) {
    clearInterval(progressInterval);
    console.error('API Error:', error);
    throw error;
  }
}