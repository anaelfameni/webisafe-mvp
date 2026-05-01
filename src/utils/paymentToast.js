export const PAYMENT_NOTIFICATION_SUCCESS_TOAST = {
  type: 'success',
  message: 'La demande a bien été enregistrée et la notification est partie.',
  duration: 5000,
};

export function buildPaymentNotificationSuccessToast() {
  return { ...PAYMENT_NOTIFICATION_SUCCESS_TOAST };
}
