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
  const { context, scores, findings, recommendations } = args;
  const critical = findings.filter((item) => item.severite === 'critique');
  const major = findings.filter((item) => item.severite === 'majeure');
  const minor = findings.filter((item) => item.severite === 'mineure');
  const sector = detectSector(context.target.normalizedUrl, context.snapshot?.html || '');
  const estimatedImpact = findings.reduce((sum, item) => sum + item.impact_financier_fcfa, 0);
  const scoreBenchmark = sector === 'e-commerce' ? 72 : sector === 'finance' ? 76 : 68;

  return {
    resume_executif: `Le site obtient ${scores.global}/100 avec un niveau ${scores.interpretation.toLowerCase()}. Les points les plus sensibles concernent ${critical[0]?.categorie || 'la sécurité et la performance'}, avec des effets directs sur la confiance, la conversion et la visibilité organique.`,
    statut_urgence: determineUrgency(findings, scores),
    failles_critiques: critical,
    failles_majeures: major,
    failles_mineures: minor,
    points_forts: [
      scores.performance >= 70 ? 'Les performances globales restent correctes sur plusieurs indicateurs clés.' : 'Le site répond et reste exploitable, ce qui permet d’envisager des optimisations progressives.',
      scores.seo >= 70 ? 'La base SEO comporte déjà plusieurs signaux utiles pour les moteurs de recherche.' : 'La structure actuelle peut être améliorée sans refonte complète.',
      context.target.httpsEnabled ? 'Le site est servi en HTTPS, ce qui constitue une base saine pour renforcer la sécurité.' : 'La présence d’un domaine stable facilite la mise à niveau de la sécurité et du SEO.',
    ],
    impact_total: {
      financier_annuel_fcfa: estimatedImpact || 250000,
      utilisateurs_potentiellement_affectes: estimatedImpact > 500000 ? '10 000+' : '1 000+',
      perte_conversions_estimee: scores.performance < 60 || scores.ux_mobile < 60 ? '10% à 20%' : '5% à 10%',
      risque_reputation: critical.length > 0 ? 'élevé' : major.length > 2 ? 'moyen' : 'faible',
      conformite_rgpd: scores.security >= 70,
      penalites_seo: scores.seo < 60 ? 'Risque de déclassement et indexation partielle' : 'Risque modéré si aucun correctif n’est mené',
      impact_mobile: scores.ux_mobile < 60 ? 'La majorité des visiteurs mobiles peut rencontrer des frictions.' : 'L’expérience mobile reste exploitable mais optimisable.',
    },
    recommandations_prioritaires: recommendations.slice(0, 5).map((item, index) => ({
      ...item,
      ordre: index + 1,
      cout_estime_fcfa: item.cout_estime_fcfa || 50000,
      temps_implementation: item.temps_implementation || item.temps,
      roi_estime: item.roi_estime || item.impact,
      kpi_mesure: item.kpi_mesure || `Amélioration visible du score ${item.categorie}`,
      etapes: item.etapes || ['Préparer la correction', 'Déployer dans l’environnement de test', 'Contrôler le résultat après mise en production'],
    })),
    feuille_de_route: fallbackRoadmap(recommendations),
    comparaison_secteur: {
      secteur: sector,
      position: scores.global >= scoreBenchmark + 10 ? 'top 10%' : scores.global >= scoreBenchmark ? 'moyenne' : 'en-dessous moyenne',
      percentile: Math.max(5, Math.min(95, scores.global)),
      score_moyen_secteur: scoreBenchmark,
      ecart: scores.global - scoreBenchmark,
      commentaire: `Pour un acteur du secteur ${sector}, le score de référence retenu est autour de ${scoreBenchmark}/100. Le site se situe actuellement ${scores.global >= scoreBenchmark ? 'au niveau ou au-dessus' : 'en-dessous'} de ce repère.`,
    },
    opportunites_business: [
      'Accélérer les pages stratégiques pour réduire le rebond mobile et améliorer la conversion.',
      'Renforcer la sécurité visible pour rassurer les prospects, partenaires et moteurs de recherche.',
      'Corriger les signaux SEO bloquants pour capter davantage de trafic organique qualifié.',
    ],
    ressources_supplementaires: [
      {
        titre: 'Guide Web Vitals Google',
        url: 'https://web.dev/vitals/',
        pertinence: 'Utile pour comprendre les métriques de performance qui influencent l’expérience réelle.',
      },
      {
        titre: 'Mozilla Observatory',
        url: 'https://observatory.mozilla.org/',
        pertinence: 'Permet de suivre les progrès sur les headers et la posture de sécurité HTTP.',
      },
    ],
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
