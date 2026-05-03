import { json, readJsonBody, sendResendEmail } from './_utils.js';
import { buildPaymentRejectedEmail } from '../src/utils/paymentEmails.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const requiredFields = ['user_email', 'rejection_reason'];
    const missingField = requiredFields.find((field) => !body?.[field]);

    if (missingField) {
      return json(res, 400, { success: false, error: `Champ requis manquant : ${missingField}` });
    }

    await sendResendEmail(
      buildPaymentRejectedEmail({
        user_email: body.user_email,
        rejection_reason: body.rejection_reason,
      })
    );

    return json(res, 200, { success: true });
  } catch (error) {
    return json(res, 500, { success: false, error: error.message });
  }
}
