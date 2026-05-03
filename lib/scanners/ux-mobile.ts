import type { ScanContext, ScannerResult } from '../types.ts';
import {
  countResponsiveImages,
  estimateBodyFontSize,
  estimateLineHeight,
  getMetaContent,
  hasMediaQueries,
  hasUserScalableDisabled,
  inferHamburgerMenu,
  inferSmoothScroll,
  inferStickyNavigation,
} from '../utils/html.ts';
import { clampScore } from '../utils/validators.ts';
import { createFinding, createRecommendation, fetchPageSpeedBundle } from './shared.ts';

function estimateTapTargetsScore(html: string) {
  const tapTargets = (html.match(/<(button|a|input)[^>]*>/gi) || []).length;
  const withPadding = (html.match(/padding:\s*(1[2-9]|[2-9]\d)px/gi) || []).length;
  if (tapTargets === 0) return 0;
  if (withPadding >= Math.max(1, Math.floor(tapTargets * 0.5))) return 25;
  if (withPadding > 0) return 15;
  return 8;
}

function scoreResponsive(viewport: string, html: string) {
  const responsiveImages = countResponsiveImages(html);
  let score = 0;
  if (viewport) score += 15;
  if (/width=device-width/i.test(viewport) && /initial-scale=1/i.test(viewport)) score += 5;
  if (hasMediaQueries(html)) score += 10;
  if (responsiveImages.srcset > 0) score += 5;
  if (responsiveImages.picture > 0) score += 3;
  return {
    score: clampScore(Math.min(30, score)),
    responsiveImages,
  };
}

export async function scanUxMobile(context: ScanContext): Promise<ScannerResult> {
  const findings = [];
  const recommendations = [];
  const apisUsed: string[] = [];
  const apisFailed: string[] = [];
  let partial = false;

  const pageSpeed = await fetchPageSpeedBundle(context.target.normalizedUrl, context.externalApis.pageSpeedKey, ['performance', 'accessibility']);
  if (pageSpeed) apisUsed.push('PageSpeed Mobile');
  else {
    apisFailed.push('PageSpeed Mobile');
    partial = true;
  }

  const html = context.snapshot?.html || '';
  const viewport = getMetaContent(html, 'viewport');
  const responsive = scoreResponsive(viewport, html);
  const bodyFontSize = estimateBodyFontSize(html);
  const lineHeight = estimateLineHeight(html);
  const userScalableDisabled = hasUserScalableDisabled(html);
  const tapTargetsScore = clampScore(
    (Number(pageSpeed?.lighthouseResult?.audits?.['tap-targets']?.score || 0) * 25) || estimateTapTargetsScore(html)
  );
  const mobileSpeedScoreRaw = clampScore(Number(pageSpeed?.lighthouseResult?.categories?.performance?.score || 0) * 100);
  const accessibilityScore = clampScore(Number(pageSpeed?.lighthouseResult?.categories?.accessibility?.score || 0) * 100);
  const lcp = Number(pageSpeed?.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue || 0);
  const fid = Number(pageSpeed?.lighthouseResult?.audits?.['max-potential-fid']?.numericValue || 0);
  const cls = Number(pageSpeed?.lighthouseResult?.audits?.['cumulative-layout-shift']?.numericValue || 0);
  const totalBytes = Number(pageSpeed?.lighthouseResult?.audits?.['total-byte-weight']?.numericValue || context.snapshot?.htmlBytes || 0);
  const totalMb = Number((totalBytes / (1024 * 1024)).toFixed(2));

  let textScore = 0;
  if (bodyFontSize >= 16) textScore += 10;
  else if (bodyFontSize >= 14) textScore += 5;
  if (lineHeight >= 1.5) textScore += 5;
  textScore += accessibilityScore >= 80 ? 5 : accessibilityScore >= 60 ? 3 : 0;
  if (userScalableDisabled) textScore -= 10;
  textScore = clampScore(textScore);

  let vitesseMobileScore = mobileSpeedScoreRaw >= 90 ? 25 : mobileSpeedScoreRaw >= 70 ? 20 : mobileSpeedScoreRaw >= 50 ? 10 : 5;
  if (lcp > 0 && lcp < 2500) vitesseMobileScore += 5;
  if (fid > 0 && fid < 100) vitesseMobileScore += 5;
  if (cls > 0 && cls < 0.1) vitesseMobileScore += 5;
  if (totalMb < 1) vitesseMobileScore += 5;
  if (totalMb > 3) vitesseMobileScore -= 5;
  vitesseMobileScore = clampScore(Math.min(25, vitesseMobileScore));

  const navigationBonus = clampScore(
    (inferHamburgerMenu(html) ? 3 : 0) +
      (inferStickyNavigation(html) ? 2 : 0) +
      (inferSmoothScroll(html) ? 5 : 0)
  );

  const score = clampScore(
    Math.min(100, responsive.score + textScore + tapTargetsScore + vitesseMobileScore + navigationBonus)
  );

  if (!viewport) {
    findings.push(
      createFinding({
        categorie: 'ux',
        titre: 'Viewport mobile absent ou incomplet',
        severite: 'majeure',
        description: 'Le document n’expose pas correctement les consignes de mise à l’échelle mobile. Sur smartphone, l’affichage peut paraître écrasé ou imposer un zoom manuel.',
        impact_business: 'Une mauvaise première impression mobile réduit l’engagement et augmente le rebond sur les pages d’acquisition.',
        impact_financier_fcfa: 120000,
        description_courte: 'Le viewport mobile n’est pas correctement configuré.',
      })
    );
  }

  if (bodyFontSize < 16) {
    findings.push(
      createFinding({
        categorie: 'ux',
        titre: 'Lisibilité mobile perfectible',
        severite: bodyFontSize < 14 ? 'majeure' : 'mineure',
        description: `La taille de police détectée est d’environ ${bodyFontSize}px. Sous 16px, une partie des utilisateurs devra fournir un effort de lecture supplémentaire, surtout sur les écrans compacts.`,
        impact_business: 'La lecture devient moins confortable, ce qui ralentit la prise d’information et peut dégrader les conversions mobiles.',
        impact_financier_fcfa: 80000,
        description_courte: `Police estimée à ${bodyFontSize}px : la lecture mobile peut être moins confortable.`,
      })
    );
  }

  if (tapTargetsScore < 20) {
    findings.push(
      createFinding({
        categorie: 'ux',
        titre: 'Éléments tactiles trop justes pour le mobile',
        severite: 'majeure',
        description: 'Les boutons, liens ou zones cliquables semblent manquer d’espace ou de taille suffisante pour une interaction tactile fluide.',
        impact_business: 'Les erreurs de clic et la frustration augmentent, en particulier sur les pages à fort enjeu comme le paiement ou le formulaire de contact.',
        impact_financier_fcfa: 140000,
        description_courte: 'Les zones cliquables mobiles paraissent trop petites ou trop proches.',
      })
    );
  }

  recommendations.push(
    createRecommendation({
      ordre: 1,
      categorie: 'ux',
      action: 'Uniformiser l’ergonomie mobile sur les points de contact clés',
      justification: 'Les quick wins UX mobile portent sur la lisibilité, les boutons et la stabilité visuelle.',
      impact: 'Amélioration du confort mobile et baisse du taux d’abandon.',
      difficulte: 'facile',
      temps: '4 à 6 heures',
      etapes: [
        'Vérifier le viewport et maintenir une taille de texte par défaut à 16px minimum.',
        'Augmenter les boutons et liens stratégiques jusqu’à environ 48px de hauteur utile.',
        'Valider l’ergonomie sur les écrans 360px, 390px et 428px.',
      ],
    })
  );

  return {
    score,
    metrics: {
      accessibility_score: accessibilityScore,
      responsive: {
        viewport_present: Boolean(viewport),
        media_queries: hasMediaQueries(html),
        images_responsive: responsive.responsiveImages.srcset > 0 || responsive.responsiveImages.picture > 0,
        score: responsive.score,
      },
      taille_texte: {
        body_font_size: bodyFontSize,
        line_height: lineHeight,
        contraste_ok: accessibilityScore >= 80,
        score: textScore,
      },
      elements_tactiles: {
        min_size_respect: tapTargetsScore >= 20,
        espacement_ok: tapTargetsScore >= 15,
        details: {
          avg_size: tapTargetsScore >= 20 ? '48x48px+' : 'inférieur aux recommandations',
        },
        score: tapTargetsScore,
      },
      vitesse_mobile: {
        pageSpeed_mobile_score: mobileSpeedScoreRaw,
        lcp_mobile: Math.round(lcp),
        cls_mobile: Number(cls.toFixed(3)),
        score: vitesseMobileScore,
      },
      navigation_bonus: {
        hamburger: inferHamburgerMenu(html),
        sticky_navigation: inferStickyNavigation(html),
        smooth_scroll: inferSmoothScroll(html),
        score: navigationBonus,
      },
    },
    findings,
    recommendations,
    apisUsed,
    apisFailed,
    partial,
  };
}
