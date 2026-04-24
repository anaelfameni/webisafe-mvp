import { Resend } from 'resend';

const EMAIL_FROM = 'Webisafe <webisafe@gmail.com>';

// Initialisation lazy — évite le crash au démarrage si la clé est absente
function getResend() {
  const key = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!key) {
    console.warn('[EMAIL] ⚠️  RESEND_API_KEY manquante — emails désactivés');
    return null;
  }
  return new Resend(key);
}

function scoreToColor(score) {
  if (score >= 90) return '#3b82f6';
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#eab308';
  if (score >= 30) return '#f97316';
  return '#ef4444';
}

export async function sendScanResultEmail(to, scanData) {
  const resend = getResend();
  if (!resend) return { success: false, error: 'Resend non configuré' };

  const { url, scores, recommendations } = scanData;
  const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  const topRecs = (recommendations?.failles_critiques || []).slice(0, 3);
  const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'https://webisafe.vercel.app';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre rapport Webisafe - ${domain}</title>
</head>
<body style="margin:0;padding:0;background:#060e1a;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#3b82f6;font-size:24px;font-weight:700;margin:0 0 8px;">Webisafe</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0;">Audit web pour entreprises africaines</p>
    </div>

    <div style="background:#0d1b2a;border:1px solid #1e3a5f;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <p style="color:#94a3b8;font-size:14px;margin:0 0 8px;">Audit de ${domain}</p>
      <div style="font-size:72px;font-weight:700;color:${scoreToColor(scores.global)};margin:8px 0;">
        ${scores.global}
      </div>
      <p style="color:#64748b;font-size:12px;margin:0;">Score global / 100</p>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:24px;flex-wrap:wrap;">
        ${['performance', 'security', 'seo', 'ux'].map(key => `
          <div style="text-align:center;">
            <div style="font-size:24px;font-weight:600;color:${scoreToColor(scores[key] || 0)};">
              ${scores[key] || 0}
            </div>
            <div style="color:#64748b;font-size:11px;margin-top:2px;">${key === 'performance' ? 'Performance' :
      key === 'security' ? 'Sécurité' :
        key === 'seo' ? 'SEO' : 'UX Mobile'
    }</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${topRecs.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h2 style="color:#e2e8f0;font-size:18px;font-weight:600;margin:0 0 16px;">
        🚨 Actions prioritaires
      </h2>
      ${topRecs.map(rec => `
        <div style="background:#0d1b2a;border:1px solid #1e3a5f;border-radius:12px;padding:16px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="background:#ef4444;color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">CRITIQUE</span>
            <span style="color:#e2e8f0;font-size:14px;font-weight:600;">${rec.titre || 'Problème détecté'}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">${rec.impact_business || ''}</p>
          ${rec.impact_fcfa ? `
            <p style="color:#f59e0b;font-size:12px;font-weight:600;margin:0;">
              💰 Impact estimé : ${rec.impact_fcfa.toLocaleString('fr-FR')} FCFA
            </p>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div style="text-align:center;margin-bottom:32px;">
      <a href="${frontendUrl}/analyse?url=${encodeURIComponent(url)}"
        style="display:inline-block;background:#3b82f6;color:white;font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Voir le rapport complet →
      </a>
      <p style="color:#475569;font-size:12px;margin-top:12px;">
        Débloquez les recommandations détaillées et le plan d'action 90 jours
      </p>
    </div>

    <div style="text-align:center;border-top:1px solid #1e3a5f;padding-top:24px;">
      <p style="color:#475569;font-size:12px;margin:0;">
        Vous recevez cet email car vous avez utilisé Webisafe pour analyser ${domain}.<br>
        <a href="${frontendUrl}/confidentialite" style="color:#3b82f6;">Politique de confidentialité</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Votre audit Webisafe - ${domain} - Score : ${scores.global}/100`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Erreur envoi:', error);
    return { success: false, error };
  }
}

export async function sendPaymentConfirmationEmail(to, scanData) {
  const resend = getResend();
  if (!resend) return { success: false, error: 'Resend non configuré' };

  const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'https://webisafe.tech';
  const domain = (() => { try { return new URL(scanData.url).hostname; } catch { return scanData.url; } })();

  const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#060e1a;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <h1 style="color:#3b82f6;text-align:center;margin-bottom:8px;">Webisafe</h1>
    <div style="background:#0d1b2a;border:1px solid #1e3a5f;border-radius:16px;padding:32px;text-align:center;margin:24px 0;">
      <div style="font-size:48px;margin-bottom:16px;">✅</div>
      <h2 style="color:#e2e8f0;margin:0 0 8px;">Paiement confirmé</h2>
      <p style="color:#94a3b8;margin:0;">35 000 FCFA reçus — Rapport complet débloqué</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${frontendUrl}/rapport/${scanData.scanId}"
        style="display:inline-block;background:#3b82f6;color:white;font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Accéder à mon rapport complet →
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center;">
      Votre rapport complet pour ${domain} est prêt. Vous disposez également d'un rescan gratuit dans 30 jours.<br><br>
      Une question ? Répondez directement à cet email.
    </p>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `✅ Votre rapport Webisafe complet - ${domain}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Erreur confirmation paiement:', error);
    return { success: false, error };
  }
}