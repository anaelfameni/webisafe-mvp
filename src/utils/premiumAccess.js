export const PREMIUM_VALIDATED_MESSAGE =
  'Audit Premium validé — votre rapport complet est maintenant disponible.';

export function buildValidatedPremiumMap(scans = [], payments = []) {
  const scanIds = new Set(scans.map((scan) => scan.id));

  return payments.reduce((accumulator, payment) => {
    if (payment.status !== 'validated') {
      return accumulator;
    }

    if (!scanIds.has(payment.scan_id)) {
      return accumulator;
    }

    accumulator[payment.scan_id] = {
      message: PREMIUM_VALIDATED_MESSAGE,
      paymentCode: payment.payment_code || '',
      validatedAt: payment.validated_at || payment.created_at || null,
    };
    return accumulator;
  }, {});
}
