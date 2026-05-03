const RESEND_API_KEY = import.meta.env?.VITE_RESEND_API_KEY;
const FROM_EMAIL = 'Webisafe <onboarding@resend.dev>';

export async function sendNurtureEmail({ to, url, scanId, firstRecommendation }) {
  if (!RESEND_API_KEY) {
    console.warn('VITE_RESEND_API_KEY non configurée — email nurturing désactivé');
    return { success: false, error: 'Clé API Resend manquante' };
  }

  const subject = `Votre audit ${url} est prêt — 1 recommandation à découvrir`;
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;color:#0F172A;background:#F8FAFC;padding:32px;border-radius:12px;">
      <h2 style="color:#1566F0;margin-top:0;">Votre audit est terminé</h2>
      <p>Bonjour,</p>
      <p>Votre scan pour <strong>${url}</strong> est terminé. Voici un aperçu de ce que nous avons détecté :</p>
      <div style="background:#1E293B;color:#F8FAFC;padding:20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:bold;color:#38BDF8;">1 recommandation prioritaire débloquée :</p>
        <p style="margin:0;font-size:15px;line-height:1.5;">${firstRecommendation?.title || 'Analyse complète disponible'}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#94A3B8;">${firstRecommendation?.description || 'Consultez votre rapport complet pour tous les détails.'}</p>
      </div>
      <p style="text-align:center;margin:28px 0;">
        <a href="https://webisafe.vercel.app/rapport/${scanId}" 
           style="display:inline-block;background:#1566F0;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;">
           Voir mon rapport complet
        </a>
      </p>
      <p style="font-size:13px;color:#64748B;margin-top:24px;">
        Ce message a été envoyé automatiquement après votre scan gratuit Webisafe.
      </p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Erreur Resend');
    }

    return { success: true, data: await response.json() };
  } catch (error) {
    console.error('Erreur envoi email nurturing:', error);
    return { success: false, error: error.message };
  }
}

export async function sendProtectReceiptEmail({ to, siteUrl, paymentCode }) {
  if (!RESEND_API_KEY) {
    console.warn('VITE_RESEND_API_KEY non configurée — email receipt Protect désactivé');
    return { success: false, error: 'Clé API Resend manquante' };
  }

  const subject = `Webisafe Protect — Votre demande est reçue (${paymentCode})`;
  const html = `
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
      <p style="font-size:13px;color:#64748B;margin-top:24px;">
        Une question ? Écrivez-nous à <a href="mailto:webisafe@gmail.com" style="color:#1566F0;">webisafe@gmail.com</a>
      </p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Erreur Resend');
    }

    return { success: true, data: await response.json() };
  } catch (error) {
    console.error('Erreur envoi email receipt Protect:', error);
    return { success: false, error: error.message };
  }
}

export async function sendAlertFollowUpEmail({ to, url, alertType }) {
  if (!RESEND_API_KEY) {
    console.warn('VITE_RESEND_API_KEY non configurée — email follow-up alerte désactivé');
    return { success: false, error: 'Clé API Resend manquante' };
  }

  const subject = `Webisafe — Votre alerte pour ${url}`;
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;color:#0F172A;background:#F8FAFC;padding:32px;border-radius:12px;">
      <h2 style="color:#1566F0;margin-top:0;">Votre site est de nouveau en ligne</h2>
      <p>Bonjour,</p>
      <p>Notre système a détecté un incident sur <strong>${url}</strong> hier et vous a alerté immédiatement.</p>
      <p>Votre site est maintenant de nouveau accessible.</p>
      <p style="margin-top:24px;"><strong>L'alerte vous a-t-elle été utile ?</strong> Un mot de retour nous aiderait beaucoup à améliorer le service.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="https://wa.me/2250595335662?text=Bonjour%2C%20l'alerte%20de%20hier%20m'a%20été%20utile." 
           style="display:inline-block;background:#1566F0;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;">
           Donner mon avis sur WhatsApp
        </a>
      </p>
      <p style="font-size:13px;color:#64748B;margin-top:24px;">
        Merci de faire confiance à Webisafe Protect.
      </p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Erreur Resend');
    }

    return { success: true, data: await response.json() };
  } catch (error) {
    console.error('Erreur envoi email follow-up alerte:', error);
    return { success: false, error: error.message };
  }
}
