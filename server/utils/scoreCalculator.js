/**
 * Calcul du score global pondéré
 * Poids basés sur l'importance perçue par les PME africaines
 */
export function calculateGlobalScore(performance, security, seo, ux) {
  const weights = {
    performance: 0.35,
    security: 0.30,
    seo: 0.25,
    ux: 0.10,
  };

  const values = { performance, security, seo, ux };
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const val = values[key];
    if (val !== null && val !== undefined) {
      weightedSum += val * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return null;

  const normalized = weightedSum / totalWeight;
  return Math.min(100, Math.max(0, Math.round(normalized)));
}

/**
 * Grade qualitatif du score
 */
export function getGrade(score) {
  if (score === null || score === undefined) return { grade: '?', label: 'Non mesuré', color: '#6b7280' };
  if (score >= 90) return { grade: 'A', label: 'Excellent', color: '#22c55e' };
  if (score >= 75) return { grade: 'B', label: 'Bon', color: '#84cc16' };
  if (score >= 60) return { grade: 'C', label: 'Moyen', color: '#f59e0b' };
  if (score >= 40) return { grade: 'D', label: 'Faible', color: '#f97316' };
  return { grade: 'F', label: 'Critique', color: '#ef4444' };
}