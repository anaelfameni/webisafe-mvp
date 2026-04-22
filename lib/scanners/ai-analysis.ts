import type { AiAnalysis, CombinedScores, ScanContext, ScanFinding, ScanRecommendation } from '../types.ts';
import { fetchJsonWithTimeout } from '../utils/http.ts';

function detectSector(url: string, html: string) {
  const haystack = `${url} ${html}`.toLowerCase();
  if (/(shop|boutique|store|cart|checkout|produit|panier)/i.test(haystack)) return 'e-commerce';
  if (/(hotel|restaurant|booking|reservation|voyage|tourisme)/i.test(haystack)) return 'tourisme & hospitality';
  if (/(clinic|medical|pharma|sante|doctor|hopital)/i.test(haystack)) return 'santé';
  if (/(school|ecole|academy|formation|university|cours)/i.test(haystack)) return 'éducation';
  if (/(bank|finance|loan|assurance|microfinance)/i.test(haystack)) return 'finance';
  return 'services numériques';
}

function estimateCompanySize(html: string) {
  const size = html.length;
  if (size > 500_000) return 'ETI';
  if (size > 150_000) return 'PME structurée';
  return 'TPE / PME';
}

function determineUrgency(findings: ScanFinding[], scores: CombinedScores) {
  if (findings.some((item) => item.severite === 'critique')) return 'critique';
  if (scores.global < 60 || scores.security < 55) return 'urgent';
  if (scores.global < 75) return 'modéré';
  return 'satisfaisant';
}

function fallbackRoadmap(recommendations: ScanRecommendation[]) {
  const actions = recommendations.map((item) => item.action);
  return {
    immediat_24h: actions.slice(0, 2),
    semaine_1: actions.slice(2, 5),
    mois_1: actions.slice(5, 8),
    trimestre_1: actions.slice(8, 10),
  };
}

function buildFallbackAiAnalysis(args: {
  context: ScanContext;
  scores: CombinedScores;
  findings: ScanFinding[];
  recommendations: ScanRecommendation[];
  metrics: Record<string, unknown>;
}): AiAnalysis {
  return {
    resume_executif: "L'analyse détaillée par IA n'a pas pu être générée pour ce rapport.",
    statut_urgence: determineUrgency(args.findings, args.scores),
    failles_critiques: args.findings.filter(f => f.severite === 'critique'),
    failles_majeures: args.findings.filter(f => f.severite === 'majeure'),
    failles_mineures: args.findings.filter(f => f.severite === 'mineure'),
    points_forts: [],
    impact_total: {
      financier_annuel_fcfa: 0,
      utilisateurs_potentiellement_affectes: "N/A",
      perte_conversions_estimee: "N/A",
      risque_reputation: "Inconnu",
      conformite_rgpd: false,
      penalites_seo: "Données insuffisantes",
      impact_mobile: "Données insuffisantes",
    },
    recommandations_prioritaires: args.recommendations.slice(0, 5).map((item, index) => ({
      ...item,
      ordre: index + 1,
      cout_estime_fcfa: item.cout_estime_fcfa || 0,
      temps_implementation: item.temps_implementation || item.temps,
      roi_estime: item.roi_estime || "N/A",
      kpi_mesure: item.kpi_mesure || "N/A",
      etapes: item.etapes || [],
    })),
    feuille_de_route: {
      immediat_24h: [],
      semaine_1: [],
      mois_1: [],
      trimestre_1: [],
    },
    comparaison_secteur: {
      secteur: "Inconnu",
      position: "Inconnue",
      percentile: 0,
      score_moyen_secteur: 0,
      ecart: 0,
      commentaire: "Données sectorielles indisponibles sans analyse IA.",
    },
    opportunites_business: [],
    ressources_supplementaires: [],
  };
}

function extractJsonFromGeminiResponse(data: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}) {
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  if (!text) return null;

  try {
    return JSON.parse(text) as AiAnalysis;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]) as AiAnalysis;
    } catch {
      return null;
    }
  }
}

export async function buildAiAnalysis(args: {
  context: ScanContext;
  scores: CombinedScores;
  findings: ScanFinding[];
  recommendations: ScanRecommendation[];
  metrics: Record<string, unknown>;
}): Promise<AiAnalysis> {
  const fallback = buildFallbackAiAnalysis(args);
  const geminiKey = args.context.externalApis.geminiKey;
  if (!geminiKey) {
    return fallback;
  }

  const sector = detectSector(args.context.target.normalizedUrl, args.context.snapshot?.html || '');
  const companySize = estimateCompanySize(args.context.snapshot?.html || '');
  const body = {
    contents: [
      {
        parts: [
          {
            text: `
Tu es un expert en cybersécurité, performance web et SEO, spécialisé pour les PME et entreprises africaines.

CONTEXTE DU SITE :
- URL : ${args.context.target.normalizedUrl}
- Domaine : ${args.context.target.domain}
- Secteur estimé : ${sector}
- Taille entreprise : ${companySize}

SCORES OBTENUS :
- Score global : ${args.scores.global}/100 (${args.scores.grade})
- Performance : ${args.scores.performance}/100
- Sécurité : ${args.scores.security}/100
- SEO : ${args.scores.seo}/100
- UX Mobile : ${args.scores.ux_mobile}/100

FAIBLESSES DÉTECTÉES :
${JSON.stringify(args.findings, null, 2)}

RECOMMANDATIONS :
${JSON.stringify(args.recommendations, null, 2)}

MÉTRIQUES :
${JSON.stringify(args.metrics, null, 2)}

Ton rôle est également de réécrire les titres et descriptions des failles détectées pour les rendre plus professionnelles, persuasives et intelligibles pour un chef d'entreprise (ton expert et rassurant). 
Inspire-toi de la structure des anciens textes explicatifs fictifs (focus sur l'impact business et la clarté).

Retourne uniquement un JSON valide respectant cette structure :
${JSON.stringify(fallback, null, 2)}
            `.trim(),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };

  try {
    const { data } = await fetchJsonWithTimeout<{
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }>(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      10_000
    );

    return extractJsonFromGeminiResponse(data) || fallback;
  } catch {
    return fallback;
  }
}
