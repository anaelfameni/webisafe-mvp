export type Severity = 'critique' | 'majeure' | 'mineure';
export type ScanCategory = 'performance' | 'securite' | 'seo' | 'ux';

export interface ScanTarget {
  normalizedUrl: string;
  hostname: string;
  domain: string;
  protocol: 'http:' | 'https:';
  httpsEnabled: boolean;
}

export interface PageSnapshot {
  finalUrl: string;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  html: string;
  htmlBytes: number;
  ttfbMs: number;
  externalResourceCount: number;
}

export interface ScanFinding {
  id: string;
  categorie: ScanCategory;
  titre: string;
  severite: Severity;
  description: string;
  impact_business: string;
  impact_financier_fcfa: number;
  description_courte?: string;
  probabilite_occurrence?: 'élevée' | 'moyenne' | 'faible';
  temps_resolution?: string;
  difficulte?: 'facile' | 'moyenne' | 'difficile';
}

export interface ScanRecommendation {
  ordre: number;
  categorie: ScanCategory;
  action: string;
  justification: string;
  impact: string;
  difficulte: 'facile' | 'moyenne' | 'difficile';
  temps: string;
  temps_implementation?: string;
  cout_estime_fcfa?: number;
  roi_estime?: string;
  kpi_mesure?: string;
  etapes?: string[];
}

export interface ScannerResult {
  score: number;
  metrics: Record<string, unknown>;
  findings: ScanFinding[];
  recommendations: ScanRecommendation[];
  apisUsed: string[];
  apisFailed: string[];
  partial: boolean;
}

export interface ExternalApis {
  pageSpeedKey?: string;
  googleSafeBrowsingKey?: string;
  virusTotalKey?: string;
  geminiKey?: string;
  appUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface ScanContext {
  target: ScanTarget;
  ipAddress: string;
  userAgent: string;
  snapshot: PageSnapshot | null;
  externalApis: ExternalApis;
  startedAt: number;
}

export interface CombinedScores {
  performance: number;
  security: number;
  seo: number;
  ux_mobile: number;
  global: number;
  grade: string;
  interpretation: string;
}

export interface AiAnalysis {
  resume_executif: string;
  statut_urgence: 'critique' | 'urgent' | 'modéré' | 'satisfaisant';
  failles_critiques: ScanFinding[];
  failles_majeures: ScanFinding[];
  failles_mineures: ScanFinding[];
  points_forts: string[];
  impact_total: {
    financier_annuel_fcfa: number;
    utilisateurs_potentiellement_affectes: string;
    perte_conversions_estimee: string;
    risque_reputation: string;
    conformite_rgpd: boolean;
    penalites_seo: string;
    impact_mobile: string;
  };
  recommandations_prioritaires: Array<ScanRecommendation & {
    cout_estime_fcfa: number;
    temps_implementation: string;
    roi_estime: string;
    kpi_mesure: string;
    etapes: string[];
  }>;
  feuille_de_route: {
    immediat_24h: string[];
    semaine_1: string[];
    mois_1: string[];
    trimestre_1: string[];
  };
  comparaison_secteur: {
    secteur: string;
    position: string;
    percentile: number;
    score_moyen_secteur: number;
    ecart: number;
    commentaire: string;
  };
  opportunites_business: string[];
  ressources_supplementaires: Array<{
    titre: string;
    url: string;
    pertinence: string;
  }>;
}
