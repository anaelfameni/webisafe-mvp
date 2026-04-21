import { json, readJsonBody, sendResendEmail } from './_utils.js';
import { buildPaymentConfirmedEmail, resolveAppUrl } from '../src/utils/paymentEmails.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const requiredFields = ['payment_code', 'user_email', 'scan_id', 'url_to_audit'];
    const missingField = requiredFields.find((field) => !body?.[field]);

    if (missingField) {
      return json(res, 400, { success: false, error: `Champ requis manquant : ${missingField}` });
    }

    await sendResendEmail(
      buildPaymentConfirmedEmail({
        appUrl: resolveAppUrl(),
        payment_code: body.payment_code,
        user_email: body.user_email,
        scan_id: body.scan_id,
        url_to_audit: body.url_to_audit,
      })
    );

    return json(res, 200, { success: true });
  } catch (error) {
    return json(res, 500, { success: false, error: error.message });
  }
}
