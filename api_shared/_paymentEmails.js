// Helpers email paiement AUTONOMES pour les fonctions serverless Vercel.
// IMPORTANT : ce fichier ne DOIT PAS importer depuis /src/ (sinon FUNCTION_INVOCATION_FAILED
// car certains imports /src/* utilisent des chemins sans extension .js, non supportes par Node ESM).

const DEFAULT_APP_URL = 'https://webisafe.vercel.app';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createEmailShell({ title, body, footer, appUrl }) {
  return `
    <div style="margin:0;padding:32px;background:#060b16;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e5eefc">
      <div style="max-width:720px;margin:0 auto;background:linear-gradient(180deg,#0b1220 0%,#111b30 100%);border:1px solid rgba(64,125,255,0.22);border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.35)">
        <div style="padding:28px 32px;border-bottom:1px solid rgba(148,163,184,0.18);background:linear-gradient(90deg,rgba(21,102,240,0.18),rgba(21,102,240,0))">
          <div style="font-size:28px;font-weight:800;letter-spacing:-0.03em;color:#ffffff">${title}</div>
        </div>
        <div style="padding:32px">${body}</div>
        <div style="padding:18px 32px;border-top:1px solid rgba(148,163,184,0.12);font-size:13px;color:#94a3b8">
          ${footer}
          ${appUrl ? `&nbsp;&nbsp;•&nbsp;&nbsp;<a href="${escapeHtml(appUrl)}" style="color:#7fb0ff;text-decoration:none">webisafe.vercel.app</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

export function resolveAppUrl() {
  return process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
}

export function formatPaymentTimestamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'Africa/Abidjan',
  }).format(date);
}

export function buildAdminPaymentNotificationEmail({
  appUrl,
  payment_code,
  user_email,
  url_to_audit,
  wave_phone,
  scan_id,
  timestamp,
}) {
  const paymentCode = escapeHtml(payment_code);
  const clientEmail = escapeHtml(user_email);
  const auditUrl = escapeHtml(url_to_audit);
  const wavePhone = escapeHtml(wave_phone);
  const scanId = escapeHtml(scan_id || '');

  // Lien direct vers le panel admin avec le code paiement pré-renseigné en query param.
  // L'admin arrive directement sur la ligne concernée sans chercher manuellement.
  const ctaUrl = `${appUrl}/admin?q=${encodeURIComponent(payment_code || '')}`;

  const body = `
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#cbd5e1">
      Un nouveau paiement Wave nécessite votre vérification manuelle avant activation du rapport premium.
    </p>
    <div style="margin:0 0 18px;padding:14px 20px;border-radius:14px;background:rgba(239,68,68,0.10);border:1px solid rgba(239,68,68,0.30);color:#fca5a5;font-size:14px;font-weight:700">
      ⏱ À valider sous 2h ouvrées — le client attend sa confirmation par email.
    </div>
    <div style="margin:0 0 22px;padding:22px;border-radius:20px;background:rgba(15,23,42,0.72);border:1px solid rgba(96,165,250,0.22)">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7fb0ff;margin-bottom:8px">Code paiement</div>
      <div style="font-size:28px;font-weight:900;letter-spacing:0.04em;color:#1566F0">${paymentCode}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
      <tr><td style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.14);color:#94a3b8">Client</td><td style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.14);color:#f8fafc;text-align:right">${clientEmail}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.14);color:#94a3b8">Site audité</td><td style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.14);color:#f8fafc;text-align:right">${auditUrl}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.14);color:#94a3b8">Numéro Wave client</td><td style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.14);color:#f8fafc;text-align:right">${wavePhone}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.14);color:#94a3b8">Montant</td><td style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.14);color:#f8fafc;text-align:right">35 000 FCFA</td></tr>
      ${scanId ? `<tr><td style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.14);color:#94a3b8">Scan ID</td><td style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.14);color:#7fb0ff;text-align:right;font-family:monospace;font-size:13px">${scanId}</td></tr>` : ''}
      <tr><td style="padding:12px 0;color:#94a3b8">Reçu le</td><td style="padding:12px 0;color:#f8fafc;text-align:right">${escapeHtml(timestamp)}</td></tr>
    </table>
    <div style="margin:0 0 24px;padding:18px 20px;border-radius:18px;background:rgba(245,158,11,0.10);border:1px solid rgba(245,158,11,0.28);color:#fde68a;font-size:14px;line-height:1.7">
      Vérifiez dans votre app Wave que vous avez bien reçu <strong>35 000 FCFA</strong> avec la note <strong>${paymentCode}</strong> avant de valider.
    </div>
    <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#1566F0;color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:14px;font-weight:800;box-shadow:0 16px 36px rgba(21,102,240,0.34)">Valider ce paiement →</a>
    <p style="margin:16px 0 0;font-size:12px;color:#64748b">Lien direct : ${escapeHtml(ctaUrl)}</p>
  `;

  return {
    to: 'webisafe@gmail.com',
    subject: `[ACTION REQUISE ⚡] Paiement Wave — ${String(user_email || '').replace(/[\r\n]+/g, ' ')} — ${String(payment_code || '').replace(/[\r\n]+/g, ' ')}`,
    html: createEmailShell({
      title: 'Nouveau paiement à valider',
      body,
      footer: 'Email automatique Webisafe — Ne pas répondre',
      appUrl,
    }),
  };
}

export function buildPaymentReceivedEmail({
  appUrl,
  payment_code,
  user_email,
  url_to_audit,
  timestamp,
}) {
  const paymentCode = escapeHtml(payment_code || '');
  const auditUrl = escapeHtml(url_to_audit || '');

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#dbe7ff">Bonjour,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#cbd5e1">
      Nous avons bien recu votre demande de paiement pour l'audit premium de
      <strong style="color:#ffffff">${auditUrl}</strong>.
    </p>
    <div style="margin:0 0 22px;padding:22px;border-radius:20px;background:rgba(15,23,42,0.72);border:1px solid rgba(96,165,250,0.22)">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7fb0ff;margin-bottom:8px">Votre code de paiement</div>
      <div style="font-size:28px;font-weight:900;letter-spacing:0.04em;color:#1566F0">${paymentCode}</div>
    </div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#cbd5e1">
      Notre equipe verifie votre paiement Wave manuellement. Vous recevrez un second
      email des que votre rapport complet est disponible.
    </p>
    <div style="margin:0 0 24px;padding:18px 20px;border-radius:18px;background:rgba(34,197,94,0.10);border:1px solid rgba(34,197,94,0.28);color:#bbf7d0;font-size:14px;line-height:1.7">
      Delai habituel : sous 2h ouvrees (Lun-Ven 8h-18h GMT).
    </div>
    <div style="padding:16px 18px;border-radius:16px;background:rgba(15,23,42,0.72);border:1px solid rgba(96,165,250,0.16);color:#e5eefc;font-size:14px;line-height:1.9">
      <div>WhatsApp : +225 05 95 33 56 62</div>
      <div>Email : webisafe@gmail.com</div>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">
      Demande recue le ${escapeHtml(timestamp || '')}.
    </p>
  `;

  return {
    to: user_email,
    subject: `Votre demande de paiement Webisafe - code ${String(payment_code || '').replace(/[\r\n]+/g, ' ')}`,
    html: createEmailShell({
      title: 'Demande de paiement recue',
      body,
      footer: 'Email automatique Webisafe',
      appUrl,
    }),
  };
}

export function buildPaymentConfirmedEmail({
  appUrl,
  payment_code,
  user_email,
  scan_id,
  url_to_audit,
}) {
  const reportUrl = `${appUrl}/rapport/${scan_id}`;

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#dbe7ff">Bonjour,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#cbd5e1">
      Votre paiement <strong style="color:#ffffff">${escapeHtml(payment_code || '')}</strong> a ete confirme avec succes.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#cbd5e1">
      Votre rapport d'audit premium pour <strong style="color:#ffffff">${escapeHtml(url_to_audit)}</strong> est maintenant disponible.
    </p>
    <a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:#1566F0;color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:14px;font-weight:800;box-shadow:0 16px 36px rgba(21,102,240,0.34)">Acceder a mon rapport complet</a>
    <div style="margin-top:28px;padding:20px;border-radius:18px;background:rgba(15,23,42,0.72);border:1px solid rgba(96,165,250,0.20)">
      <div style="font-size:14px;line-height:1.9;color:#dbeafe">1 rescan gratuit disponible dans 30 jours</div>
      <div style="font-size:14px;line-height:1.9;color:#dbeafe">Support email 48h : webisafe@gmail.com</div>
      <div style="font-size:14px;line-height:1.9;color:#dbeafe">WhatsApp corrections : +225 05 95 33 56 62</div>
    </div>
  `;

  return {
    to: user_email,
    subject: 'Votre rapport Webisafe est pret',
    html: createEmailShell({
      title: 'Votre rapport est disponible',
      body,
      footer: 'Merci de votre confiance.',
      appUrl,
    }),
  };
}

export function buildRescanReminderEmail({ appUrl, scan_id, user_email, url_to_audit }) {
  const reportUrl = `${(appUrl || DEFAULT_APP_URL)}/rapport/${escapeHtml(scan_id)}`;
  const auditUrl = escapeHtml(url_to_audit || '');

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#dbe7ff">Bonjour,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#cbd5e1">
      Il y a maintenant plus de <strong style="color:#ffffff">30 jours</strong> que vous avez obtenu
      votre audit premium pour <strong style="color:#ffffff">${auditUrl}</strong>.
    </p>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:#cbd5e1">
      Comme promis dans votre offre Premium, votre <strong style="color:#ffffff">rescan gratuit</strong>
      est maintenant disponible. Voyez comment votre site a évolué depuis votre premier audit.
    </p>
    <div style="margin:0 0 24px;padding:20px;border-radius:18px;background:rgba(34,197,94,0.10);border:1px solid rgba(34,197,94,0.28);color:#bbf7d0;font-size:14px;line-height:1.8">
      ✅ <strong>1 rescan gratuit inclus</strong> — valable maintenant, aucun paiement requis.
    </div>
    <a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:#1566F0;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:14px;font-weight:800;font-size:15px;box-shadow:0 16px 36px rgba(21,102,240,0.34)">Demander mon rescan gratuit →</a>
    <p style="margin:20px 0 0;font-size:13px;color:#64748b">
      Ou contactez-nous sur WhatsApp : +225 05 95 33 56 62
    </p>
  `;

  return {
    to: user_email,
    subject: 'Votre rescan gratuit Webisafe est disponible',
    html: createEmailShell({
      title: '🔄 Votre rescan gratuit est prêt',
      body,
      footer: 'Vous recevez cet email car vous avez souscrit à un audit premium Webisafe.',
      appUrl: appUrl || DEFAULT_APP_URL,
    }),
  };
}

export function buildPaymentRejectedEmail({ user_email, rejection_reason }) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#dbe7ff">Bonjour,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#cbd5e1">
      Nous n'avons pas pu confirmer votre paiement.
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#cbd5e1">
      Raison : <strong style="color:#ffffff">${escapeHtml(rejection_reason)}</strong>
    </p>
    <div style="padding:18px 20px;border-radius:18px;background:rgba(15,23,42,0.72);border:1px solid rgba(248,113,113,0.20);color:#e5eefc;font-size:14px;line-height:1.9">
      <div>WhatsApp : +225 05 95 33 56 62</div>
      <div>Email : webisafe@gmail.com</div>
      <div>Reponse sous 2h ouvrees.</div>
    </div>
  `;

  return {
    to: user_email,
    subject: 'Paiement non confirme - Webisafe',
    html: createEmailShell({
      title: 'Paiement non confirme',
      body,
      footer: 'Email automatique Webisafe',
    }),
  };
}
