import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { setCorsHeaders, checkRateLimit, getClientIp } from '../api_shared/_utils.js';

// I.2 — Endpoint "Me rappeler dans 24h" depuis le FreemiumGate.
// Le worker `nurture-runner` consommera la table `public.nurture_reminders`
// 1×/h pour envoyer les emails dont scheduled_at <= now().

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SOURCES = new Set(['freemium_gate', 'post_scan', 'paywall']);

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 32);
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // 3 demandes/min/IP : on évite spam et erreurs accidentelles.
  const rate = checkRateLimit(req, 3, 60_000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Trop de demandes. Réessayez dans ${rate.retryAfter}s.`,
    });
  }

  const { email, url, scanId, source } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email requis.' });
  }
  const trimmedEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  const safeSource = VALID_SOURCES.has(source) ? source : 'freemium_gate';
  const safeUrl =
    typeof url === 'string' && url.length > 0 && url.length < 2048 ? url : null;
  const safeScanId =
    typeof scanId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scanId)
      ? scanId
      : null;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[remind-later] Supabase non configuré');
    return res.status(500).json({ error: 'Configuration serveur manquante.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const userAgent = (req.headers['user-agent'] || '').slice(0, 256);
  const ipHash = hashIp(getClientIp(req));

  try {
    const { error } = await supabase.from('nurture_reminders').insert({
      email: trimmedEmail,
      url: safeUrl,
      scan_id: safeScanId,
      source: safeSource,
      scheduled_at: scheduledAt,
      user_agent: userAgent,
      ip_hash: ipHash,
    });
    if (error) {
      console.error('[remind-later] insert error:', error);
      return res
        .status(500)
        .json({ error: 'Impossible d\'enregistrer la demande. Réessayez plus tard.' });
    }
  } catch (err) {
    console.error('[remind-later] exception:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

  return res.status(200).json({
    success: true,
    scheduledAt,
  });
}
