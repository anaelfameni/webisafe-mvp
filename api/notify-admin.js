import { json, readJsonBody, sendResendEmail, setCorsHeaders } from './_utils.js';
import {
  buildAdminPaymentNotificationEmail,
  formatPaymentTimestamp,
  resolveAppUrl,
} from '../src/utils/paymentEmails.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const requiredFields = ['payment_code', 'user_email', 'url_to_audit', 'wave_phone', 'scan_id'];
    const missingField = requiredFields.find((field) => !body?.[field]);

    if (missingField) {
      return json(res, 400, { success: false, error: `Champ requis manquant : ${missingField}` });
    }

    await sendResendEmail(
      buildAdminPaymentNotificationEmail({
        appUrl: resolveAppUrl(),
        payment_code: body.payment_code,
        user_email: body.user_email,
        url_to_audit: body.url_to_audit,
        wave_phone: body.wave_phone,
        scan_id: body.scan_id,
        timestamp: formatPaymentTimestamp(),
      })
    );

    return json(res, 200, { success: true });
  } catch (error) {
    return json(res, 500, { success: false, error: error.message });
  }
}
