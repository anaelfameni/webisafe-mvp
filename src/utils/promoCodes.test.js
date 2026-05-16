import { describe, expect, it } from 'vitest';
import { applyPromoDiscount, validatePromoCode } from './promoCodes.js';

describe('validatePromoCode', () => {
  it('returns null for missing or invalid input', () => {
    expect(validatePromoCode(null)).toBeNull();
    expect(validatePromoCode('')).toBeNull();
    expect(validatePromoCode('   ')).toBeNull();
    expect(validatePromoCode('UNKNOWN_CODE')).toBeNull();
    expect(validatePromoCode(42)).toBeNull();
  });

  it('returns the matching promo info for valid codes (case-insensitive)', () => {
    expect(validatePromoCode('beta50')).toMatchObject({ code: 'BETA50', discount: 0.5 });
    expect(validatePromoCode('  EARLY10 ')).toMatchObject({ code: 'EARLY10', discount: 0.1 });
    expect(validatePromoCode('partenaire15')).toMatchObject({ code: 'PARTENAIRE15', discount: 0.15 });
    expect(validatePromoCode('AGENCE20')).toMatchObject({ code: 'AGENCE20', discount: 0.2 });
  });
});

describe('applyPromoDiscount', () => {
  it('returns the original amount when no promo is provided', () => {
    expect(applyPromoDiscount(35350, null)).toBe(35350);
    expect(applyPromoDiscount(15150, undefined)).toBe(15150);
    expect(applyPromoDiscount(35350, { discount: 0 })).toBe(35350);
  });

  it('applies the discount and rounds to the nearest integer', () => {
    expect(applyPromoDiscount(35350, { discount: 0.5 })).toBe(17675);
    expect(applyPromoDiscount(35350, { discount: 0.1 })).toBe(31815);
    expect(applyPromoDiscount(35350, { discount: 0.15 })).toBe(30048);
    expect(applyPromoDiscount(35350, { discount: 0.2 })).toBe(28280);
  });
});
