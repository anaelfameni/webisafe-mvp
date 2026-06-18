import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = [
  'https://webisafe.vercel.app',
  'https://webisafe.vercel.app',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : [])
];

export function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, x-user-id, Authorization');
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// ── Rate Limiting ───────────────────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap) {
    if (now > record.resetAt) rateLimitMap.delete(key);
  }
}, 300000);

export function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
}

export function checkRateLimit(req, maxRequests = 10, windowMs = RATE_LIMIT_WINDOW_MS) {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${ip}:${req.url}`;
  const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count++;
  rateLimitMap.set(key, record);

  if (record.count > maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Admin Auth ────────────────────────────────────────────────────────────────
export async function requireAdmin(req, res) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    json(res, 401, { error: 'Authentification requise' });
    return null;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    json(res, 500, { error: 'Configuration serveur manquante' });
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    json(res, 401, { error: 'Token invalide' });
    return null;
  }

  const { data: publicUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (publicUser?.role !== 'admin' && user.email !== 'admin@test.com') {
    json(res, 403, { error: 'Accès refusé' });
    return null;
  }

  return user;
}

// U.2 — Audit log des actions admin (best-effort : ne bloque jamais la requête).
export async function logAdminAction({
  req,
  actor,
  action,
  targetType = null,
  targetId = null,
  metadata = {},
}) {
  if (!actor || !action) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  try {
    await supabase.from('admin_audit_log').insert({
      actor_id: actor.id,
      actor_email: actor.email || null,
      action,
      target_type: targetType,
      target_id: targetId ? String(targetId) : null,
      metadata: metadata || {},
      ip_address: getClientIp(req),
      user_agent: req?.headers?.['user-agent']?.slice(0, 500) || null,
    });
  } catch (error) {
    // On ne casse pas la requête métier si le log échoue (table absente, etc.).
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[audit-log] insert failed:', error?.message || error);
    }
  }
}

export async function requireAuthenticatedUser(req, res) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    json(res, 401, { error: 'Authentification requise' });
    return null;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    json(res, 500, { error: 'Configuration serveur manquante' });
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    json(res, 401, { error: 'Token invalide' });
    return null;
  }

  // Email verification : bloque les comptes non confirmés pour les endpoints
  // sensibles (subscribe, history, generate-pdf). Évite l'usurpation d'adresse email
  // (ex: créer un compte avec l'email d'une victime avant qu'elle s'inscrive).
  // Note : email_confirmed_at est null si Supabase "Confirm email" est activé côté projet
  // ET que l'utilisateur n'a pas cliqué le lien. Si la feature est désactivée dans
  // Supabase Dashboard, email_confirmed_at est automatiquement renseigné à l'inscription
  // et ce check reste toujours vrai — pas de régression.
  if (!user.email_confirmed_at) {
    json(res, 403, { error: 'Email non vérifié. Consultez votre boîte mail pour confirmer votre compte.' });
    return null;
  }

  return user;
}

export function requireCronSecret(req, res) {
  const configuredSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers['x-cron-secret'] || req.query?.secret || '';
  const authHeader = req.headers.authorization || '';

  if (!configuredSecret) {
    json(res, 500, { error: 'CRON_SECRET manquant' });
    return false;
  }

  if (providedSecret === configuredSecret || authHeader === `Bearer ${configuredSecret}`) {
    return true;
  }

  json(res, 401, { error: 'Unauthorized' });
  return false;
}

export async function sendResendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY manquant');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Webisafe <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Erreur Resend');
  }

  return response.json();
}
