/**
 * API Wrapper pour Webisafe
 * Objectif :
 * - Conserver la réponse backend (global_score, grade, metrics, critical_alerts, etc.)
 * - Fournir aussi le format historique attendu par l'UI (scores, performance.core_web_vitals, summary, etc.)
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

// ── Normalisation headers manquants (backend = objets {header,message}) ───────
function normalizeMissingHeaders(headersManquants) {
  if (!Array.isArray(headersManquants)) return [];
  return headersManquants.map((h) => {
    if (typeof h === 'string') return h;
    if (h?.header) return h.header;
    if (h?.label) return h.label;
    return 'Header';
  });
}

// ── Génération recommandations basées sur les données réelles ─────────────────
function generateRecommendations(data) {
  const recs = [];

  const seo = data.metrics?.seo || {};
  const sec = data.metrics?.security || {};
  const perf = data.metrics?.performance || {};
  const ux = data.metrics?.ux || {};

  const missingHeadersLabels = normalizeMissingHeaders(sec.headers_manquants);

  // Malware
  if (sec.malware_detected === true) {
    recs.push({
      action: '⚠️ URGENT : Malware détecté ! Nettoyer le site immédiatement',
      impact: 'Sécurité CRITIQUE - Risque de blacklist / vol de données',
      difficulte: 'Difficile',
      temps: '4-8 heures',
    });
  }

  // HTTPS
  if (!String(data.url || '').startsWith('https://')) {
    recs.push({
      action: 'Activer HTTPS avec un certificat SSL',
      impact: 'Sécurité +20 points',
      difficulte: 'Facile',
      temps: '30 minutes',
    });
  }

  // Fichiers sensibles
  if (sec.sensitive_files?.critical) {
    const files = sec.sensitive_files.exposed_files || [];
    recs.push({
      action: `🚨 Bloquer l'accès aux fichiers sensibles exposés (${files.slice(0, 3).join(', ')}${files.length > 3 ? '…' : ''})`,
      impact: 'Risque immédiat de fuite de secrets (mots de passe / clés API)',
      difficulte: 'Moyenne',
      temps: '1-2 heures',
    });
  }

  // Headers manquants
  if (missingHeadersLabels.length > 0) {
    recs.push({
      action: `Ajouter les headers de sécurité manquants : ${missingHeadersLabels.join(', ')}`,
      impact: 'Sécurité +10-25 points',
      difficulte: 'Facile',
      temps: '30-60 minutes',
    });
  }

  // SEO
  if (seo.has_description === false) {
    recs.push({
      action: 'Ajouter une balise meta description optimisée (150-160 caractères)',
      impact: 'SEO +10-15 points, meilleur CTR',
      difficulte: 'Facile',
      temps: '15 minutes',
    });
  }

  if (seo.h1_count === 0) {
    recs.push({
      action: 'Ajouter une balise H1 unique et descriptive',
      impact: 'SEO +10 points',
      difficulte: 'Facile',
      temps: '10 minutes',
    });
  } else if (seo.h1_count > 1) {
    recs.push({
      action: `Réduire les balises H1 à une seule (${seo.h1_count} détectées)`,
      impact: 'Structure SEO améliorée',
      difficulte: 'Facile',
      temps: '15 minutes',
    });
  }

  if (seo.has_viewport === false) {
    recs.push({
      action: 'Ajouter la balise meta viewport pour la compatibilité mobile',
      impact: 'UX Mobile +15 points',
      difficulte: 'Facile',
      temps: '5 minutes',
    });
  }

  if (seo.has_open_graph === false) {
    recs.push({
      action: 'Ajouter les balises Open Graph (og:title, og:description, og:image)',
      impact: 'Meilleur affichage sur les réseaux sociaux',
      difficulte: 'Facile',
      temps: '20 minutes',
    });
  }

  // Performance
  if (perf.lcp != null && perf.lcp > 2500) {
    recs.push({
      action: `Optimiser le LCP (actuellement ${Math.round(perf.lcp)}ms, objectif < 2500ms)`,
      impact: 'Performance +10-20 points',
      difficulte: 'Moyenne',
      temps: '2-4 heures',
    });
  }

  if (perf.cls != null && perf.cls > 0.1) {
    recs.push({
      action: `Réduire le CLS (actuellement ${perf.cls.toFixed(3)}, objectif < 0.1)`,
      impact: 'Stabilité visuelle améliorée',
      difficulte: 'Moyenne',
      temps: '1-2 heures',
    });
  }

  if (perf.page_weight_mb != null && perf.page_weight_mb > 3) {
    recs.push({
      action: `Réduire le poids de la page (actuellement ${perf.page_weight_mb} MB, objectif < 2 MB)`,
      impact: 'Temps de chargement réduit de 30-50%',
      difficulte: 'Moyenne',
      temps: '2-3 heures',
    });
  }

  // UX (score)
  if (ux.accessibility_score != null && ux.accessibility_score < 70) {
    recs.push({
      action: "Améliorer l'accessibilité (contraste, labels, attributs ARIA)",
      impact: 'UX +15-25 points',
      difficulte: 'Moyenne',
      temps: '3-5 heures',
    });
  }

  return recs;
}

// ── Résumé exécutif ───────────────────────────────────────────────────────────
function generateResume(data) {
  const score = safeScore(data.global_score) ?? 0;
  const scores = data.scores ?? {};
  const sec = data.metrics?.security ?? {};
  const seo = data.metrics?.seo ?? {};
  const perf = data.metrics?.performance ?? {};
  const ux = data.metrics?.ux ?? {};

  const missingHeadersLabels = normalizeMissingHeaders(sec.headers_manquants);

  let intro = '';
  if (score >= 80) intro = `Avec un score global de ${score}/100, votre site est dans un bon état général.`;
  else if (score >= 60) intro = `Avec un score global de ${score}/100, votre site fonctionne mais présente des lacunes importantes.`;
  else if (score >= 40) intro = `Avec un score global de ${score}/100, votre site présente des faiblesses sérieuses.`;
  else intro = `Avec un score global de ${score}/100, votre site est dans un état critique.`;

  const details = [];

  if (scores.performance != null) {
    if (scores.performance >= 80) details.push(`✅ Performance (${scores.performance}/100) : bon niveau.`);
    else if (scores.performance >= 50) details.push(`⚠️ Performance (${scores.performance}/100) : à optimiser${perf.lcp ? ` (LCP: ${Math.round(perf.lcp)}ms)` : ''}.`);
    else details.push(`🔴 Performance (${scores.performance}/100) : très lent${perf.lcp ? ` (LCP: ${Math.round(perf.lcp)}ms)` : ''}.`);
  }

  if (scores.security != null) {
    if (sec.malware_detected) {
      details.push(`🚨 Sécurité (${scores.security}/100) : Malware détecté. Risque de blacklistage.`);
    } else if (scores.security >= 75) {
      details.push(`✅ Sécurité (${scores.security}/100) : bon niveau${missingHeadersLabels.length ? ` (à compléter: ${missingHeadersLabels.join(', ')})` : ''}.`);
    } else if (scores.security >= 50) {
      details.push(`⚠️ Sécurité (${scores.security}/100) : protections incomplètes${missingHeadersLabels.length ? ` (${missingHeadersLabels.slice(0, 2).join(', ')}${missingHeadersLabels.length > 2 ? '…' : ''})` : ''}.`);
    } else {
      details.push(`🔴 Sécurité (${scores.security}/100) : vulnérable${missingHeadersLabels.length ? ` (${missingHeadersLabels.length} headers manquants)` : ''}.`);
    }
  }

  if (scores.seo != null) {
    if (scores.seo >= 75) details.push(`✅ SEO (${scores.seo}/100) : bon niveau.`);
    else if (scores.seo >= 50) details.push(`⚠️ SEO (${scores.seo}/100) : à améliorer${seo.has_description === false ? ' (meta description absente)' : ''}.`);
    else details.push(`🔴 SEO (${scores.seo}/100) : visibilité faible (corriger title/description/structure).`);
  }

  // UX : on accepte ux_mobile ou ux
  const uxScore = safeScore(scores.ux_mobile ?? scores.ux);
  if (uxScore != null) {
    if (uxScore >= 75) details.push(`✅ UX Mobile (${uxScore}/100) : bonne expérience mobile.`);
    else if (uxScore >= 50) details.push(`⚠️ UX Mobile (${uxScore}/100) : expérience mobile perfectible.`);
    else details.push(`🔴 UX Mobile (${uxScore}/100) : difficile à utiliser sur smartphone.`);
  }

  return details.length ? `${intro}\n\n${details.join('\n\n')}` : intro;
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

    const lcpValue = safeRound(perf.lcp);
    const clsValue = perf.cls ?? null;
    const fcpValue = safeRound(perf.fcp);

    // ── Recos + résumé ─────────────────────────────────────────────────────
    const allRecommendations = generateRecommendations(data);
    const resume = generateResume({
      ...data,
      scores: {
        ...data.scores,
        // UX score dans backend = data.scores.ux
        ux_mobile: safeScore(data.scores?.ux),
      },
    });

    // ── Retour : on conserve data + on ajoute format historique ────────────
    const uxScore = safeScore(data.scores?.ux);

    return {
      // Backend conservé
      ...data,

      // Champs clés backend qu'on veut garder explicitement
      url: data.url ?? url,
      global_score: safeScore(data.global_score) ?? 0,
      grade: data.grade ?? null,
      metrics: data.metrics ?? {},
      critical_alerts: Array.isArray(data.critical_alerts) ? data.critical_alerts : [],

      // Format historique attendu par l’UI (Analyse.jsx / Rapport.jsx actuels)
      success: true,
      scores: {
        global: safeScore(data.global_score) ?? 0,
        performance: safeScore(data.scores?.performance) ?? 0,
        security: safeScore(data.scores?.security) ?? 0,
        seo: safeScore(data.scores?.seo) ?? 0,
        ux_mobile: uxScore ?? 0, // IMPORTANT : évite N/A
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
      ai_analysis: { recommandations_prioritaires: allRecommendations },
    };
  } catch (error) {
    clearInterval(progressInterval);
    console.error('API Error:', error);
    throw error;
  }
}