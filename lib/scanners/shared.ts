import type { ScanFinding, ScanRecommendation } from '../types.ts';
import { fetchJsonWithTimeout } from '../utils/http.ts';

export interface PageSpeedBundle {
  lighthouseResult?: {
    categories?: Record<string, { score?: number }>;
    audits?: Record<string, { score?: number; numericValue?: number; details?: Record<string, unknown>; displayValue?: string }>;
  };
}

export async function fetchPageSpeedBundle(url: string, apiKey: string | undefined, categories: string[] = []) {
  if (!apiKey) return null;

  const query = new URLSearchParams({
    url,
    strategy: 'mobile',
    key: apiKey,
  });

  categories.forEach((category) => query.append('category', category));

  try {
    const { data } = await fetchJsonWithTimeout<PageSpeedBundle>(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${query.toString()}`,
      {},
      12_000
    );
    return data;
  } catch {
    return null;
  }
}

export function createFinding(
  partial: Omit<ScanFinding, 'id' | 'description_courte' | 'probabilite_occurrence' | 'temps_resolution' | 'difficulte'> & {
    id?: string;
    description_courte?: string;
    probabilite_occurrence?: 'élevée' | 'moyenne' | 'faible';
    temps_resolution?: string;
    difficulte?: 'facile' | 'moyenne' | 'difficile';
  }
): ScanFinding {
  return {
    id: partial.id || crypto.randomUUID(),
    description_courte: partial.description_courte || partial.description,
    probabilite_occurrence: partial.probabilite_occurrence || 'moyenne',
    temps_resolution: partial.temps_resolution || '2 à 4 heures',
    difficulte: partial.difficulte || 'moyenne',
    ...partial,
  };
}

export function createRecommendation(
  partial: Omit<ScanRecommendation, 'ordre' | 'temps_implementation' | 'cout_estime_fcfa' | 'roi_estime' | 'kpi_mesure' | 'etapes'> & {
    ordre?: number;
    temps_implementation?: string;
    cout_estime_fcfa?: number;
    roi_estime?: string;
    kpi_mesure?: string;
    etapes?: string[];
  }
): ScanRecommendation {
  return {
    ordre: partial.ordre || 1,
    temps_implementation: partial.temps_implementation || partial.temps,
    cout_estime_fcfa: partial.cout_estime_fcfa || 50000,
    roi_estime: partial.roi_estime || partial.impact,
    kpi_mesure: partial.kpi_mesure || partial.impact,
    etapes: partial.etapes || [],
    ...partial,
  };
}
