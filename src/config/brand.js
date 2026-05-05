// ── Configuration centralisée de la marque Webisafe ───────────────────────────
// Objectif : éviter les numéros/email hardcodés dispersés dans le code

export const BRAND_NAME = 'Webisafe';
export const BRAND_TAGLINE = 'Auditez la sécurité de votre site web en 30 secondes';

export const SUPPORT_PHONE = '+225 01 70 90 77 80';
export const SUPPORT_PHONE_RAW = '2250170907780'; // Sans + pour wa.me
export const REPORT_FIX_PHONE = '+225 05 95 33 56 62';
export const REPORT_FIX_PHONE_RAW = '2250595335662';
export const SUPPORT_EMAIL = 'webisafe@gmail.com';

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

// Liens de paiement Wave Business (Wave for Business — demande de paiement)
// Montants TTC incluant frais Wave : 35 350 FCFA (audit) / 15 150 FCFA (protect)
export const WAVE_BUSINESS_LINKS = {
  audit: 'https://pay.wave.com/m/M_ci_5BsAxsc0BlEl/c/ci/?amount=35350',
  protect: 'https://pay.wave.com/m/M_ci_5BsAxsc0BlEl/c/ci/?amount=15150',
};
