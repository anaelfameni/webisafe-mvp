import { checkRateLimit, escapeHtml, json, readJsonBody, sendResendEmail, setCorsHeaders } from '../api_shared/_utils.js';

function resolveAppUrl() {
  if (process.env.VITE_APP_URL) return process.env.VITE_APP_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://webisafe.vercel.app';
}

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

  if (!body.to || !body.url || !body.scanId) {
    return json(res, 400, { success: false, error: 'to, url et scanId sont requis' });
  }

  const appUrl = resolveAppUrl();
  const url = escapeHtml(body.url);
  const scanId = encodeURIComponent(String(body.scanId));
  const title = escapeHtml(body.firstRecommendation?.title || 'Analyse complète disponible');
  const description = escapeHtml(body.firstRecommendation?.description || 'Consultez votre rapport complet pour tous les détails.');

  await sendResendEmail({
    to: body.to,
    subject: `Votre audit ${String(body.url).replace(/[\r\n]+/g, ' ')} est prêt — 1 recommandation à découvrir`,
    html: `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;color:#0F172A;background:#F8FAFC;padding:32px;border-radius:12px;">
      <h2 style="color:#1566F0;margin-top:0;">Votre audit est terminé</h2>
      <p>Bonjour,</p>
      <p>Votre scan pour <strong>${url}</strong> est terminé. Voici un aperçu de ce que nous avons détecté :</p>
      <div style="background:#1E293B;color:#F8FAFC;padding:20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:bold;color:#38BDF8;">1 recommandation prioritaire débloquée :</p>
        <p style="margin:0;font-size:15px;line-height:1.5;">${title}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#94A3B8;">${description}</p>
      </div>
      <p style="text-align:center;margin:28px 0;">
        <a href="${escapeHtml(`${appUrl}/rapport/${scanId}`)}" style="display:inline-block;background:#1566F0;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;">Voir mon rapport complet</a>
      </p>
      <p style="font-size:13px;color:#64748B;margin-top:24px;">Ce message a été envoyé automatiquement après votre scan gratuit Webisafe.</p>
    </div>`,
  });

  return json(res, 200, { success: true });
}
