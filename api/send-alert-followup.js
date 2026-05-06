import { checkRateLimit, escapeHtml, json, readJsonBody, sendResendEmail, setCorsHeaders } from './_utils.js';

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

  if (!body.to || !body.url) {
    return json(res, 400, { success: false, error: 'to et url sont requis' });
  }

  const url = escapeHtml(body.url);

  await sendResendEmail({
    to: body.to,
    subject: `Webisafe — Votre alerte pour ${String(body.url).replace(/[\r\n]+/g, ' ')}`,
    html: `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;color:#0F172A;background:#F8FAFC;padding:32px;border-radius:12px;">
      <h2 style="color:#1566F0;margin-top:0;">Votre site est de nouveau en ligne</h2>
      <p>Bonjour,</p>
      <p>Notre système a détecté un incident sur <strong>${url}</strong> hier et vous a alerté immédiatement.</p>
      <p>Votre site est maintenant de nouveau accessible.</p>
      <p style="margin-top:24px;"><strong>L'alerte vous a-t-elle été utile ?</strong> Un mot de retour nous aiderait beaucoup à améliorer le service.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="https://wa.me/2250595335662?text=Bonjour%2C%20l'alerte%20de%20hier%20m'a%20été%20utile." style="display:inline-block;background:#1566F0;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;">Donner mon avis sur WhatsApp</a>
      </p>
      <p style="font-size:13px;color:#64748B;margin-top:24px;">Merci de faire confiance à Webisafe Protect.</p>
    </div>`,
  });

  return json(res, 200, { success: true });
}
