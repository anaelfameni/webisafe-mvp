// api/misc.js — fonctions utilitaires fusionnées (limite Vercel Hobby 12 fonctions)
// Remplace : api/contact.js, api/forgot-password.js
//
// Usage :
//   POST /api/misc { action: 'contact',         name, email, subject, message }
//   POST /api/misc { action: 'forgot-password', email }

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { setCorsHeaders, checkRateLimit, escapeHtml, sendResendEmail, readJsonBody } from '../api_shared/_utils.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || null;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.CONTACT_ADMIN_EMAIL || 'webisafe@gmail.com';
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'Webisafe <onboarding@resend.dev>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── action: contact ────────────────────────────────────────────────────────────
async function handleContact(req, res, body) {
  // H.10 — 5 messages / minute par IP
  const rl = checkRateLimit(req, 5, 60000);
  if (!rl.allowed) return res.status(429).json({ error: `Trop de messages. Réessayez dans ${rl.retryAfter}s.` });

  const { name, email, subject, message } = body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Champs obligatoires manquants' });

  const trimmedName = String(name).trim();
  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedSubject = String(subject || '').trim();
  const trimmedMessage = String(message).trim();

  if (trimmedName.length < 2 || trimmedName.length > 100)
    return res.status(400).json({ error: 'Le nom doit faire entre 2 et 100 caractères.' });
  if (trimmedMessage.length < 10 || trimmedMessage.length > 5000)
    return res.status(400).json({ error: 'Le message doit faire entre 10 et 5000 caractères.' });
  if (!EMAIL_RE.test(trimmedEmail))
    return res.status(400).json({ error: 'Adresse email invalide.' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[misc/contact] Supabase non configuré');
    return res.status(500).json({ error: 'Configuration serveur manquante (Supabase).' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

  try {
    const { error: dbError } = await supabase
      .from('contact_messages')
      .insert({ name: trimmedName, email: trimmedEmail, subject: trimmedSubject || null, message: trimmedMessage });
    if (dbError) {
      console.error('[misc/contact] DB error:', dbError);
      return res.status(500).json({ error: `Erreur DB: ${dbError.message || 'inconnue'}` });
    }
  } catch (err) {
    console.error('[misc/contact] Supabase exception:', err);
    return res.status(500).json({ error: 'Erreur de sauvegarde en base.' });
  }

  const emailErrors = [];
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL, to: ADMIN_EMAIL, reply_to: trimmedEmail,
        subject: `Nouveau message de ${trimmedName.replace(/[\r\n]+/g, ' ')} — ${(trimmedSubject || 'sans objet').replace(/[\r\n]+/g, ' ')}`,
        html: `<h2>Nouveau message via Webisafe</h2>
          <p><strong>Nom :</strong> ${escapeHtml(trimmedName)}</p>
          <p><strong>Email :</strong> <a href="mailto:${escapeHtml(trimmedEmail)}">${escapeHtml(trimmedEmail)}</a></p>
          <p><strong>Sujet :</strong> ${escapeHtml(trimmedSubject || '—')}</p>
          <hr/><p>${escapeHtml(trimmedMessage).replace(/\n/g, '<br/>')}</p>`,
      });
      if (error) emailErrors.push(`admin: ${error.message || error.name}`);
    } catch (err) { emailErrors.push(`admin: ${err.message}`); }

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL, to: trimmedEmail,
        subject: 'Votre message a bien été reçu',
        html: `<h2>Bonjour ${escapeHtml(trimmedName)},</h2>
          <p>Nous avons bien reçu votre message et vous répondrons dans les 24h.</p>
          <p style="color:#888">— L'équipe Webisafe</p>`,
      });
      if (error) emailErrors.push(`confirm: ${error.message || error.name}`);
    } catch (err) { emailErrors.push(`confirm: ${err.message}`); }
  }

  return res.status(200).json({ success: true, saved: true, emailsSent: resend && emailErrors.length === 0, emailErrors: emailErrors.length ? emailErrors : undefined });
}

// ── action: forgot-password ────────────────────────────────────────────────────
function getRequestOrigin(req) {
  const configured = process.env.PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || (host?.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

async function handleForgotPassword(req, res, body) {
  // H.10 — Rate limit strict : 3 tentatives / 5 min par IP
  const rl = checkRateLimit(req, 3, 300000);
  if (!rl.allowed) return res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${rl.retryAfter}s.` });

  const cleanEmail = String(body?.email || '').trim().toLowerCase();
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: 'Adresse email invalide.' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Configuration serveur manquante.' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const { data: existingUsers, error: lookupError } = await supabase
    .from('users').select('email').eq('email', cleanEmail).limit(1);
  if (lookupError) {
    console.error('[misc/forgot-password] lookup error:', lookupError);
    return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' });
  }

  // Sécurité : réponse identique même si l'email n'existe pas (anti-énumération)
  if (!Array.isArray(existingUsers) || existingUsers.length === 0) {
    return res.status(200).json({ success: true });
  }

  const origin = getRequestOrigin(req);
  const redirectTo = `${origin.replace(/\/$/, '')}/reinitialiser-mot-de-passe`;

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery', email: cleanEmail, options: { redirectTo },
  });
  if (linkError || !linkData?.properties?.action_link) {
    console.error('[misc/forgot-password] recovery link error:', linkError);
    return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' });
  }

  const resetUrl = linkData.properties.action_link;
  try {
    await sendResendEmail({
      to: cleanEmail,
      subject: 'Réinitialisation de votre mot de passe Webisafe',
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;color:#1f2937">
          <div style="background:#0f172a;padding:32px 24px;text-align:center;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:24px">Réinitialisation de mot de passe</h1>
            <p style="color:#94a3b8;margin:8px 0 0">Webisafe</p>
          </div>
          <div style="background:#fff;padding:32px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous :</p>
            <div style="text-align:center;margin:24px 0">
              <a href="${resetUrl}" style="display:inline-block;background:#1566f0;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600">Réinitialiser mon mot de passe</a>
            </div>
            <p style="color:#64748b;font-size:14px">Ce lien expirera dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">Webisafe · Abidjan · CI</p>
          </div>
        </div>`,
    });
  } catch (err) {
    console.error('[misc/forgot-password] email error:', err);
    return res.status(502).json({ error: "Impossible d'envoyer l'email de réinitialisation pour le moment." });
  }

  return res.status(200).json({ success: true });
}


// ── action: profile (GET /api/misc?action=profile) ────────────────────────────
async function handleGetProfile(req, res) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Authentification requise' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Configuration serveur manquante' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Token invalide' });

  const { data: profile } = await supabase
    .from('users')
    .select('role, name, phone, phone_country, plan, scans_today, last_scan_date')
    .eq('id', user.id)
    .single();

  return res.status(200).json({
    profile: {
      role: profile?.role || 'user',
      name: profile?.name || null,
      phone: profile?.phone || null,
      phone_country: profile?.phone_country || null,
      plan: profile?.plan || 'free',
      scans_today: profile?.scans_today || 0,
      last_scan_date: profile?.last_scan_date || null,
    }
  });
}

// ── Routeur principal ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  // GET /api/misc?action=profile — profil utilisateur (rôle, plan, etc.)
  if (req.method === 'GET') {
    const action = req.url?.split('?')[1]?.split('&').find(p => p.startsWith('action='))?.split('=')[1];
    if (action === 'profile') return handleGetProfile(req, res);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body;
  try { body = await readJsonBody(req); } catch { body = {}; }
  const action = String(body?.action || '').trim().toLowerCase();

  if (action === 'contact') return handleContact(req, res, body);
  if (action === 'forgot-password') return handleForgotPassword(req, res, body);

  return res.status(400).json({ error: `Action inconnue : ${action}. Utilisez 'contact' ou 'forgot-password'.` });
}
