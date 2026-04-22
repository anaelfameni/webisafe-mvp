/**
 * API Wrapper pour Webisafe
 * Communique avec le backend Next.js (/api/scan) pour obtenir des résultats réels.
 */

export async function runFullAnalysis(url, onProgress) {
  // Simuler une progression visuelle pour l'utilisateur
  onProgress?.({ step: 1, message: 'Initialisation de l\'analyse...' });
  
  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Échec de l\'analyse');
    }

    const data = await response.json();
    
    // Adapter le format du backend vers le format attendu par le frontend
    // Note: Le backend renvoie déjà presque tout, on s'assure juste de la cohérence.
    return {
      ...data,
      // Mapper les champs si nécessaire
      performance: data.core_metrics.performance,
      security: data.core_metrics.security,
      seo: data.core_metrics.seo,
      ux: data.core_metrics.ux_mobile,
      recommendations: data.ai_analysis.recommandations_prioritaires.map(r => ({
        ...r,
        priority: r.difficulte === 'facile' ? 'MINEIRE' : 'CRITIQUE', // Mapping simplifié pour l'UI
      })),
      isPartial: false, // Plus de partial/mock autorisé
    };
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Les fonctions individuelles sont obsolètes mais gardées pour compatibilité si nécessaire
export async function fetchPageSpeedData(url) {
  return null; // Devrait passer par runFullAnalysis
}

export async function fetchSecurityData(url) {
  return null;
}
