import { Resend } from 'resend';
import { setCorsHeaders } from './_utils.js';
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { email, result } = req.body;
  if (!email || !result) return res.status(400).json({ error: 'Email et résultat requis' });

  const score = result.global_score ?? 'N/A';
  const url = result.url ?? 'votre site';
  const issues = (result.critical_alerts || []).slice(0, 5);

  try {
    await resend.emails.send({
      from: 'Webisafe <onboarding@resend.dev>',
      to: email,
      subject: `Votre rapport Webisafe — score ${score}/100`,
      html: `<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif">
        <div style="background:#0f172a;padding:24px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Votre audit Webisafe</h1>
          <p style="color:#94a3b8;margin:4px 0 0">${url}</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px">
          <p style="font-size:36px;font-weight:800;text-align:center;margin:0">${score}<span style="font-size:16px;color:#64748b">/100</span></p>
          <h2 style="font-size:16px;margin:16px 0 8px">Priorités</h2>
          <ul style="padding-left:20px">${issues.map(i => `<li>${i.title}</li>`).join('')}</ul>
          <div style="text-align:center;margin:20px 0">
            <a href="https://webisafe.ci/tarifs" style="background:#1566f0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Voir l'offre Audit+Fix</a>
          </div>
        </div>
      </div>`
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[send-report] error:', err);
    return res.status(500).json({ error: 'Erreur envoi' });
  }
}
