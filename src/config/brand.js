// ── Configuration centralisée de la marque Webisafe ───────────────────────────
// Objectif : éviter les numéros/email hardcodés dispersés dans le code

export const BRAND_NAME = 'Webisafe';
export const BRAND_TAGLINE = 'Auditez la sécurité de votre site web en 30 secondes';

// À mettre à jour à chaque révision réelle du contenu légal (CGU, Confidentialité).
export const LEGAL_LAST_UPDATED = '10 mai 2026';
export const LEGAL_VERSION = '2.0';

// I.7 — Source unique de la durée de scan affichée à l'utilisateur.
// Toute mention de durée doit utiliser ces constantes pour éviter les incohérences
// entre Hero, FAQ, URLInput, emails, etc.
export const SCAN_DURATION_AVG_LABEL = '30 secondes';
export const SCAN_DURATION_RANGE_LABEL = '30 à 90 secondes';
export const SCAN_DURATION_PROMISE = `Résultats en ${SCAN_DURATION_RANGE_LABEL}`;

// URL canonique de la plateforme (sans slash final)
// À mettre à jour dès l'achat du domaine pro (webisafe.com ou webisafe.ci)
export const BRAND_URL = 'https://webisafe.vercel.app';
export const BRAND_DOMAIN = 'webisafe.vercel.app';

export const SUPPORT_PHONE = '+225 01 70 90 77 80';
export const SUPPORT_PHONE_RAW = '2250170907780'; // Sans + pour wa.me
export const REPORT_FIX_PHONE = '+225 05 95 33 56 62';
export const REPORT_FIX_PHONE_RAW = '2250595335662';
// TODO migrer vers contact@webisafe.com dès que le domaine pro est configuré
export const SUPPORT_EMAIL = 'webisafe@gmail.com';

// Identité juridique (à mettre à jour dès la création de la société)
export const LEGAL_ENTITY = {
  name: 'Anael FAMENI',
  status: 'Micro-entreprise / Activité individuelle',
  city: 'Abidjan',
  country: 'Côte d\'Ivoire',
  rccm: null, // À renseigner après immatriculation
  vatStatus: 'Exonéré — Régime de la micro-entreprise',
};

// Sous-traitants et partenaires techniques (utilisés pour la politique de confidentialité)
export const SUB_PROCESSORS = [
  { name: 'Supabase Inc.', purpose: 'Authentification et stockage des données utilisateurs', country: 'États-Unis', dpa: 'https://supabase.com/legal/dpa' },
  { name: 'Vercel Inc.', purpose: 'Hébergement de la plateforme', country: 'États-Unis', dpa: 'https://vercel.com/legal/dpa' },
  { name: 'Wave Mobile Money', purpose: 'Traitement des paiements', country: 'Côte d\'Ivoire / Sénégal', dpa: 'https://wave.com/legal' },
  { name: 'Sentry (Functional Software, Inc.)', purpose: 'Détection des erreurs applicatives', country: 'États-Unis', dpa: 'https://sentry.io/legal/dpa/' },
  { name: 'Google LLC (Google Analytics 4)', purpose: 'Statistiques d\'audience anonymisées', country: 'États-Unis', dpa: 'https://business.safety.google/processorterms/' },
  { name: 'Microsoft Corporation (Clarity)', purpose: 'Analyse comportementale anonymisée', country: 'États-Unis', dpa: 'https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-protection' },
  { name: 'OpenRouter / Anthropic / OpenAI', purpose: 'Analyses sémantiques optionnelles (visibilité IA)', country: 'États-Unis', dpa: 'https://openrouter.ai/privacy' },
  { name: 'UptimeRobot', purpose: 'Monitoring de disponibilité (Webisafe Protect)', country: 'États-Unis', dpa: 'https://uptimerobot.com/privacyPolicy/' },
];

export const SOCIAL_LINKS = {
  whatsapp: `https://wa.me/${SUPPORT_PHONE_RAW}`,
  email: `mailto:${SUPPORT_EMAIL}`,
};

export const PAYMENT_CONFIG = {
  wavePhone: SUPPORT_PHONE,
  premiumAmount: 35000,
  protectAmount: 15000,
  currency: 'FCFA',
};

// Liens de paiement Wave Business (fallback manuel — conservé pour le mode de rattrapage)
// Montants TTC incluant frais Wave : 35 350 FCFA (audit) / 15 150 FCFA (protect)
export const WAVE_BUSINESS_LINKS = {
  audit: 'https://pay.wave.com/m/M_ci_5BsAxsc0BlEl/c/ci/?amount=35350',
  protect: 'https://pay.wave.com/m/M_ci_5BsAxsc0BlEl/c/ci/?amount=15150',
};

// Génère une URL de paiement Wave Checkout à partir du wave_launch_url
// retourné par /api/checkout/create-session. Si l'API Checkout n'est pas
// disponible, on bascule sur le lien Wave Business manuel (fallback).
export function getWaveCheckoutUrl(wavelaunchUrl, type = 'audit') {
  if (wavelaunchUrl) return wavelaunchUrl;
  return WAVE_BUSINESS_LINKS[type] ?? WAVE_BUSINESS_LINKS.audit;
}
