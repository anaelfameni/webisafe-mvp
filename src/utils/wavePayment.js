export const WAVE_PAYMENT_AMOUNT = 35000;
export const WAVE_PHONE = '+2250170907780';
export const WAVE_PHONE_DISPLAY = '+225 01 70 90 77 80';
export const WAVE_SUPPORT_WHATSAPP = '2250170907780';
export const REPORT_FIX_WHATSAPP = '2250595335662';
export const ADMIN_TOKEN = 'WEBISAFE_ADMIN_2025';

export function generateWavePaymentCode(random = Math.random) {
  const digits = Array.from({ length: 4 }, () => Math.floor(random() * 10)).join('');
  const letters = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(random() * 26))
  ).join('');

  return `WBS-${digits}-${letters}`;
}

export function formatFcfa(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0)).replace(/\u202f|\u00a0/g, ' ')} FCFA`;
}

export function getRelativeTimeLabel(value) {
  if (!value) return 'Date inconnue';

  const now = Date.now();
  const target = new Date(value).getTime();
  const diff = Math.max(0, now - target);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;

  return `Il y a ${Math.floor(hours / 24)} j`;
}

export function isPendingPaymentStatus(status) {
  return status === 'pending' || status === 'waiting_validation';
}

export function computePaymentStats(payments = []) {
  const today = new Date().toISOString().slice(0, 10);
  const validatedToday = payments.filter((payment) => {
    if (payment.status !== 'validated') return false;
    return String(payment.validated_at || payment.created_at || '').startsWith(today);
  });

  return {
    pendingCount: payments.filter((payment) => isPendingPaymentStatus(payment.status)).length,
    validatedTodayCount: validatedToday.length,
    dailyRevenue: validatedToday.reduce((total, payment) => total + Number(payment.amount || 0), 0),
    totalDelivered: payments.filter((payment) => payment.status === 'validated').length,
  };
}
