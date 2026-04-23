import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = 'Webisafe <contact@webisafe.tech>';

// Fonction helper pour score → couleur
function scoreToColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function scoreToLabel(score) {
  if (score >= 75) return 'Bon';
  if (score >= 60) return 'Moyen';
  return 'Critique';
}

// Email post-scan (avec capture email uniquement)
export async function sendScanResultEmail(to, scanData) {
  const { url, scores, recommendations } = scanData;
  const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  
  // Prendre les 3 recommandations les plus critiques
  const topRecs = (recommendations?.failles_critiques || []).slice(0, 3);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre rapport Webisafe — ${domain}</title>
</head>
<body style="margin:0;padding:0;background:#060e1a;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#3b82f6;font-size:24px;font-weight:700;margin:0 0 8px;">
        Webisafe
      </h1>
      <p style="color:#94a3b8;font-size:14px;margin:0;">Audit web pour entreprises africaines</p>
    </div>
    
    <!-- Score principal -->
    <div style="background:#0d1b2a;border:1px solid #1e3a5f;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <p style="color:#94a3b8;font-size:14px;margin:0 0 8px;">Audit de ${domain}</p>
      <div style="font-size:72px;font-weight:700;color:${scoreToColor(scores.global)};margin:8px 0;">
        ${scores.global}
      </div>
      <p style="color:#64748b;font-size:12px;margin:0;">Score global / 100</p>
      
      <!-- 4 scores -->
      <div style="display:flex;justify-content:center;gap:16px;margin-top:24px;flex-wrap:wrap;">
        ${['performance', 'security', 'seo', 'ux'].map(key => `
          <div style="text-align:center;">
            <div style="font-size:24px;font-weight:600;color:${scoreToColor(scores[key] || 0)};">
              ${scores[key] || 0}
            </div>
            <div style="color:#64748b;font-size:11px;margin-top:2px;">${
              key === 'performance' ? 'Performance' :
              key === 'security' ? 'Sécurité' :
              key === 'seo' ? 'SEO' : 'UX Mobile'
            }</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Top 3 recommandations -->
    ${topRecs.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h2 style="color:#e2e8f0;font-size:18px;font-weight:600;margin:0 0 16px;">
        🚨 Actions prioritaires
      </h2>
      ${topRecs.map((rec, i) => `
        <div style="background:#0d1b2a;border:1px solid #1e3a5f;border-radius:12px;padding:16px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="background:#ef4444;color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">
              CRITIQUE
            </span>
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
    
    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a 
        href="${process.env.FRONTEND_URL}/analyse?url=${encodeURIComponent(url)}"
        style="display:inline-block;background:#3b82f6;color:white;font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;"
      >
        Voir le rapport complet →
      </a>
      <p style="color:#475569;font-size:12px;margin-top:12px;">
        Débloquez les recommandations détaillées et le plan d'action 90 jours
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid #1e3a5f;padding-top:24px;">
      <p style="color:#475569;font-size:12px;margin:0;">
        Vous recevez cet email car vous avez utilisé Webisafe pour analyser ${domain}.<br>
        <a href="${process.env.FRONTEND_URL}/confidentialite" style="color:#3b82f6;">Politique de confidentialité</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Votre audit Webisafe — ${domain} — Score : ${scores.global}/100`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

// Email de confirmation de paiement
export async function sendPaymentConfirmationEmail(to, scanData) {
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
      <a 
        href="${process.env.FRONTEND_URL}/rapport/${scanData.scanId}"
        style="display:inline-block;background:#3b82f6;color:white;font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;"
      >
        Accéder à mon rapport complet →
      </a>
    </div>
    
    <p style="color:#64748b;font-size:13px;text-align:center;">
      Votre rapport complet pour ${domain} est prêt. Vous disposez également d'un rescan gratuit dans 30 jours.<br><br>
      Une question ? Répondez directement à cet email.
    </p>
  </div>
</body>
</html>
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: `✅ Votre rapport Webisafe complet — ${domain}`,
    html,
  });
}
