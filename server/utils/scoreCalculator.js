/**
 * Calcule le score global Webisafe pondéré.
 *
 * Pondération :
 *   Performance : 30 %
 *   Sécurité    : 35 %
 *   SEO         : 20 %
 *   UX Mobile   : 15 %
 *
 * Si un scanner a échoué (null), ses points sont redistribués
 * proportionnellement entre les scanners disponibles pour éviter
 * de pénaliser un site à cause d'une défaillance API.
 *
 * @param {number|null} performance
 * @param {number|null} security
 * @param {number|null} seo
 * @param {number|null} ux
 * @returns {number} Score de 0 à 100
 */
export function calculateGlobalScore(performance, security, seo, ux) {
  const weights = {
    performance : 0.30,
    security    : 0.35,
    seo         : 0.20,
    ux          : 0.15,
  };

  const values = { performance, security, seo, ux };

  // Séparation disponibles / manquants
  let totalWeight   = 0;
  let weightedSum   = 0;
  let missingWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (values[key] !== null && values[key] !== undefined) {
      totalWeight += weight;
      weightedSum += values[key] * weight;
    } else {
      missingWeight += weight;
    }
  }

  // Aucun scanner n'a fonctionné
  if (totalWeight === 0) return 0;

  // Redistribution du poids manquant → normalisation
  const normalized = weightedSum / totalWeight;

  return Math.round(normalized);
}

/**
 * Convertit un score /100 en note alphabétique Webisafe.
 * @param {number|null} score
 * @returns {string}
 */
export function getGrade(score) {
  if (score === null || score === undefined) return '?';
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

/**
 * Retourne le label et la couleur Webisafe associés au score.
 * @param {number|null} score
 * @returns {{ label: string, color: string, emoji: string }}
 */
export function getScoreLabel(score) {
  if (score === null || score === undefined) {
    return { label: 'Inconnu',   color: '#6B7280', emoji: '❓' };
  }
  if (score >= 90) return { label: 'Excellent',   color: '#1566F0', emoji: '🏆' };
  if (score >= 70) return { label: 'Bon',         color: '#1A7A3A', emoji: '✅' };
  if (score >= 50) return { label: 'Acceptable',  color: '#F97316', emoji: '⚠️' };
  if (score >= 30) return { label: 'Mauvais',     color: '#C0392B', emoji: '🚨' };
  return              { label: 'Critique',    color: '#7B241C', emoji: '💀' };
}
