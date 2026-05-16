// L.7 — Codes promo client-side (validation simple, montant ajusté côté admin)
const PROMO_CODES = {
  BETA50: { discount: 0.5, label: '-50 % bêta' },
  EARLY10: { discount: 0.1, label: '-10 % early adopter' },
  PARTENAIRE15: { discount: 0.15, label: '-15 % partenaire' },
  AGENCE20: { discount: 0.2, label: '-20 % agence' },
};

export function validatePromoCode(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') return null;
  const code = rawCode.trim().toUpperCase();
  const promo = PROMO_CODES[code];
  if (!promo) return null;
  return { code, ...promo };
}

export function applyPromoDiscount(amount, promo) {
  if (!promo || !promo.discount) return amount;
  return Math.round(amount * (1 - promo.discount));
}
