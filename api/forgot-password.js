import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, checkRateLimit, sendResendEmail } from '../api_shared/_utils.js';

// H.10 — Rate limit strict (3 tentatives / 5 min par IP) pour éviter l'énumération
// d'emails et le spam de l'API Resend.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || null;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getRequestOrigin(req) {
  const configuredOrigin = process.env.PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL;
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, '');

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || (host?.includes('localhost') ? 'http' : 'https');

  return `${protocol}://${host}`;
}

export function buildRedirectTo(origin) {
  return `${origin.replace(/\/$/, '')}/reinitialiser-mot-de-passe`;
}

export function buildPasswordResetEmail(resetUrl) {
  return {
    subject: 'Réinitialisation de votre mot de passe Webisafe',
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;color:#1f2937">
        <div style="background:#0f172a;padding:32px 24px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:24px">Réinitialisation de mot de passe</h1>
          <p style="color:#94a3b8;margin:8px 0 0">Webisafe</p>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${resetUrl}" style="display:inline-block;background:#1566f0;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600">Réinitialiser mon mot de passe</a>
          </div>
          <p style="color:#64748b;font-size:14px">Ce lien expirera dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">Webisafe · Abidjan · CI</p>
        </div>
      </div>
    `,
  };
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const rateLimit = checkRateLimit(req, 3, 300000); // 3 requêtes max / 5 min
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const { email } = req.body || {};
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Configuration serveur manquante.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  // Vérifie que l'email existe dans la table users (signup persistence)
  const { data: existingUsers, error: lookupError } = await supabase
    .from('users')
    .select('email')
    .eq('email', cleanEmail)
    .limit(1);

  if (lookupError) {
    // H.8 — En prod, l'erreur est routée vers Sentry via le logger serveur.
    // Côté API Vercel on garde console.error (pas de logger client disponible).
    console.error('[forgot-password] lookup error:', lookupError);
    return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' });
  }

  const userExists = Array.isArray(existingUsers) && existingUsers.length > 0;

  if (!userExists) {
    // Sécurité : on retourne 200 + success même si l'email n'existe pas pour éviter
    // l'énumération d'emails (timing attack, response shape attack).
    return res.status(200).json({ success: true });
  }

  const origin = getRequestOrigin(req);
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: cleanEmail,
    options: {
      redirectTo: buildRedirectTo(origin),
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[forgot-password] recovery link error:', linkError);
    return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' });
  }

  const resetUrl = linkData.properties.action_link;
  const emailPayload = buildPasswordResetEmail(resetUrl);

  try {
    await sendResendEmail({
      to: cleanEmail,
      ...emailPayload,
    });
  } catch (err) {
    console.error('[forgot-password] email error:', err);
    return res.status(502).json({ error: "Impossible d'envoyer l'email de réinitialisation pour le moment." });
  }

  return res.status(200).json({ success: true });
}
