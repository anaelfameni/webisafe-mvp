import type { ScanContext, ScannerResult } from '../types.ts';
import {
  countImagesWithAlt,
  countTag,
  extractHeadingLevels,
  getCanonicalUrl,
  getMetaContent,
  getOpenGraphTags,
  getTitle,
  getTwitterTags,
  hasStructuredData,
} from '../utils/html.ts';
import { fetchTextWithTimeout } from '../utils/http.ts';
import { clampScore } from '../utils/validators.ts';
import { createFinding, createRecommendation, fetchPageSpeedBundle } from './shared.ts';

function scoreMeta(title: string, description: string, viewport: string, robots: string) {
  let score = 0;
  score += title ? 10 : 0;
  score += title.length >= 50 && title.length <= 60 ? 5 : title ? 2 : 0;
  score += description ? 10 : 0;
  score += description.length >= 150 && description.length <= 160 ? 5 : description ? 2 : 0;
  score += viewport ? 5 : 0;
  score += robots && !/noindex|nofollow/i.test(robots) ? 5 : robots ? -10 : 0;
  return clampScore(score);
}

function scoreStructure(h1Count: number, h1Text: string, headings: number[]) {
  let score = 0;
  if (h1Count === 1) score += 10;
  if (h1Text && h1Text.trim().split(/\s+/).length >= 2) score += 5;

  const hierarchyValid = headings.every((value, index) => index === 0 || value - headings[index - 1] <= 1);
  if (hierarchyValid) score += 5;

  return {
    score: clampScore(score),
    hierarchyValid,
  };
}

async function fetchSitemap(domainUrl: string) {
  try {
    const { response, text } = await fetchTextWithTimeout(`${domainUrl}/sitemap.xml`, {}, 6_000);
    const valid = /<urlset[\s>]/i.test(text) && /<url>/i.test(text);
    const urlsCount = (text.match(/<url>/gi) || []).length;
    return {
      present: response.ok,
      valid: response.ok && valid,
      urlsCount,
      score: response.ok ? 10 + (valid ? 5 : 0) : 0,
    };
  } catch {
    return {
      present: false,
      valid: false,
      urlsCount: 0,
      score: 0,
    };
  }
}

async function fetchRobots(domainUrl: string) {
  try {
    const { response, text } = await fetchTextWithTimeout(`${domainUrl}/robots.txt`, {}, 5_000);
    return {
      present: response.ok,
      text,
      hasSitemap: /sitemap:/i.test(text),
    };
  } catch {
    return { present: false, text: '', hasSitemap: false };
  }
}

function inferIndexation(robots: string) {
  if (/noindex/i.test(robots)) {
    return {
      indexed: false,
      method: 'meta_robots',
      pagesIndexed: 0,
      score: 0,
      status: 'noindex détecté',
    };
  }

  return {
    indexed: true,
    method: 'meta_robots_fallback',
    pagesIndexed: 0,
    score: 10,
    status: 'Indexation probable',
  };
}

export async function scanSeo(context: ScanContext): Promise<ScannerResult> {
  const findings = [];
  const recommendations = [];
  const apisUsed: string[] = [];
  const apisFailed: string[] = [];
  let partial = false;

  const pageSpeed = await fetchPageSpeedBundle(context.target.normalizedUrl, context.externalApis.pageSpeedKey, ['seo']);
  if (pageSpeed) apisUsed.push('PageSpeed SEO');
  else {
    apisFailed.push('PageSpeed SEO');
    partial = true;
  }

  const html = context.snapshot?.html || '';
  const title = getTitle(html);
  const description = getMetaContent(html, 'description');
  const viewport = getMetaContent(html, 'viewport');
  const robots = getMetaContent(html, 'robots');
  const h1Count = countTag(html, 'h1');
  const h1Text = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, ' ').trim() || '';
  const headings = extractHeadingLevels(html);
  const metaScore = scoreMeta(title, description, viewport, robots);
  const structure = scoreStructure(h1Count, h1Text, headings);
  const domainUrl = `${context.target.protocol}//${context.target.domain}`;
  const sitemap = await fetchSitemap(domainUrl);
  const robotsTxt = await fetchRobots(domainUrl);
  const indexation = inferIndexation(robots);
  const openGraphTags = getOpenGraphTags(html);
  const twitterTags = getTwitterTags(html);
  const canonicalUrl = getCanonicalUrl(html);
  const structuredData = hasStructuredData(html);
  const altCoverage = countImagesWithAlt(html);

  const ogScore = clampScore(
    openGraphTags.reduce((sum, tag) => sum + ({ 'og:title': 3, 'og:description': 3, 'og:image': 4, 'og:url': 2, 'og:type': 2 }[tag] || 0), 0) +
      twitterTags.reduce((sum, tag) => sum + ({ 'twitter:card': 2, 'twitter:title': 2, 'twitter:image': 3 }[tag] || 0), 0)
  );
  const otherScore = clampScore((canonicalUrl ? 3 : 0) + (structuredData ? 5 : 0) + (altCoverage.ratio >= 0.8 ? 2 : 0));
  const lighthouseSeo = clampScore(Number(pageSpeed?.lighthouseResult?.categories?.seo?.score || 0) * 100);

  const score = clampScore(
    lighthouseSeo * 0.3 +
      metaScore * 0.2 +
      structure.score * 0.15 +
      Math.min(18, sitemap.score + (robotsTxt.hasSitemap ? 3 : 0)) * 0.15 +
      indexation.score * 0.2 +
      Math.min(15, ogScore + otherScore) * 0.1
  );

  if (!title || !description) {
    findings.push(
      createFinding({
        categorie: 'seo',
        titre: 'Métadonnées SEO incomplètes',
        severite: 'majeure',
        description: 'Le document ne présente pas toutes les métadonnées essentielles pour Google et les réseaux sociaux. Cela réduit la qualité d’indexation et le taux de clic dans les résultats de recherche.',
        impact_business: 'Une mauvaise présentation SEO limite votre visibilité organique et le trafic qualifié.',
        impact_financier_fcfa: 150000,
        description_courte: 'Title et/ou meta description manquants ou sous-optimisés.',
      })
    );
  }

  if (!sitemap.present) {
    findings.push(
      createFinding({
        categorie: 'seo',
        titre: 'Sitemap XML non détecté',
        severite: 'majeure',
        description: 'Aucun sitemap XML accessible n’a été trouvé au niveau du domaine racine. Les moteurs de recherche disposent alors de moins de signaux pour découvrir efficacement vos pages.',
        impact_business: 'L’indexation de nouvelles pages peut être ralentie, ce qui pénalise votre acquisition organique.',
        impact_financier_fcfa: 120000,
        description_courte: 'Pas de sitemap.xml détecté : la découverte des pages est moins efficace.',
      })
    );
  }

  if (!indexation.indexed) {
    findings.push(
      createFinding({
        categorie: 'seo',
        titre: 'Le site semble bloqué pour l’indexation',
        severite: 'critique',
        description: 'La configuration SEO actuelle suggère que certaines pages ne doivent pas être indexées. Si ce comportement n’est pas intentionnel, il annule une grande partie du potentiel organique du site.',
        impact_business: 'Un site non indexé perd une part importante de sa visibilité Google et de ses leads entrants.',
        impact_financier_fcfa: 280000,
        description_courte: 'Un signal noindex a été détecté : la visibilité Google peut être sévèrement réduite.',
      })
    );
  }

  recommendations.push(
    createRecommendation({
      ordre: 1,
      categorie: 'seo',
      action: 'Renforcer les signaux techniques envoyés aux moteurs de recherche',
      justification: 'Les quick wins SEO portent sur les métadonnées, le sitemap et les balises sociales.',
      impact: 'Amélioration de l’indexation et du taux de clic organique.',
      difficulte: 'facile',
      temps: '3 à 6 heures',
      etapes: [
        'Optimiser le title entre 50 et 60 caractères et la meta description autour de 155 caractères.',
        'Publier un sitemap XML valide et le déclarer dans robots.txt.',
        'Ajouter les balises Open Graph et Twitter Cards principales sur les pages clés.',
      ],
    })
  );

  return {
    score,
    metrics: {
      lighthouse_score: lighthouseSeo,
      meta_tags: {
        title: { present: Boolean(title), length: title.length, score: title ? (title.length >= 50 && title.length <= 60 ? 15 : 10) : 0 },
        description: { present: Boolean(description), length: description.length, score: description ? (description.length >= 150 && description.length <= 160 ? 15 : 10) : 0 },
        viewport: { present: Boolean(viewport), score: viewport ? 5 : 0 },
        robots: { present: Boolean(robots), score: robots && !/noindex|nofollow/i.test(robots) ? 5 : robots ? 0 : 0, value: robots || '' },
      },
      structure: {
        h1_count: h1Count,
        h1_content: h1Text,
        hierarchie_valide: structure.hierarchyValid,
        score: structure.score,
      },
      sitemap: {
        present: sitemap.present,
        valid: sitemap.valid,
        urls_count: sitemap.urlsCount,
        score: Math.min(15, sitemap.score + (robotsTxt.hasSitemap ? 3 : 0)),
      },
      indexation,
      open_graph: {
        present: openGraphTags.length > 0,
        tags: openGraphTags,
        twitter_tags: twitterTags,
        score: Math.min(15, ogScore + otherScore),
      },
      other: {
        canonical_url: canonicalUrl,
        structured_data: structuredData,
        image_alt_ratio: altCoverage.ratio,
      },
    },
    findings,
    recommendations,
    apisUsed,
    apisFailed,
    partial,
  };
}
