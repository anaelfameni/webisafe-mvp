import { checkRateLimit, escapeHtml, json, readJsonBody, sendResendEmail, setCorsHeaders } from '../api_shared/_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' });

  const rateLimit = checkRateLimit(req, 10, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { success: false, error: 'Corps invalide' });
  }

  if (!body.to || !body.siteUrl || !body.paymentCode) {
    return json(res, 400, { success: false, error: 'to, siteUrl et paymentCode sont requis' });
  }

  const siteUrl = escapeHtml(body.siteUrl);
  const paymentCode = escapeHtml(body.paymentCode);

  await sendResendEmail({
    to: body.to,
    subject: `Webisafe Protect — Votre demande est reçue (${String(body.paymentCode).replace(/[\r\n]+/g, ' ')})`,
    html: `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;color:#0F172A;background:#F8FAFC;padding:32px;border-radius:12px;">
      <h2 style="color:#1566F0;margin-top:0;">Demande reçue — Webisafe Protect</h2>
      <p>Bonjour,</p>
      <p>Votre demande d'abonnement <strong>Webisafe Protect Basic</strong> pour <strong>${siteUrl}</strong> a bien été enregistrée.</p>
      <div style="background:#1E293B;color:#F8FAFC;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;color:#94A3B8;">Votre code de confirmation</p>
        <p style="margin:0;font-size:20px;letter-spacing:4px;font-weight:bold;color:#38BDF8;">${paymentCode}</p>
      </div>
      <p><strong>Prochaine étape :</strong> notre équipe valide votre paiement Wave sous <strong>2 heures ouvrées</strong> et active immédiatement votre surveillance.</p>
      <p>Vous recevrez un second email dès que votre abonnement sera actif.</p>
      <p style="font-size:13px;color:#64748B;margin-top:24px;">Une question ? Écrivez-nous à <a href="mailto:webisafe@gmail.com" style="color:#1566F0;">webisafe@gmail.com</a></p>
    </div>`,
  });

  return json(res, 200, { success: true });
}
