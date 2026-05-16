import {
  json,
  readJsonBody,
  setCorsHeaders,
  checkRateLimit,
  getSupabaseAdminClient,
  requireAuthenticatedUser,
} from '../api_shared/_utils.js';

// T.2 — Branding agence persistant (logo, couleur, signature, footer).
//
// GET    /api/branding          -> récupère le branding de l'utilisateur connecté
// PUT    /api/branding          -> upsert le branding
// DELETE /api/branding          -> désactive (enabled = false)

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function sanitizeUrl(value) {
  if (!value) return null;
  const trimmed = String(value).trim().slice(0, 500);
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function isAgencyOrAdmin(supabase, user) {
  if (!user) return false;
  const { data } = await supabase
    .from('users')
    .select('role, plan')
    .eq('id', user.id)
    .single();

  if (!data) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, plan')
      .eq('id', user.id)
      .single();
    return Boolean(
      profile && (profile.role === 'admin' || profile.role === 'agence' || profile.plan === 'agency')
    );
  }
  return data.role === 'admin' || data.role === 'agence' || data.plan === 'agency';
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  const user = await requireAuthenticatedUser(req, res);
  if (!user) return;

  // ── GET : récupère le branding ─────────────────────────────────────────
  if (req.method === 'GET') {
    const { data } = await supabase
      .from('agency_branding')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return json(res, 200, { success: true, branding: data || null });
  }

  // ── PUT : upsert ───────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const allowed = await isAgencyOrAdmin(supabase, user);
    if (!allowed) {
      return json(res, 403, {
        success: false,
        error: 'Réservé aux agences (plan agency / role admin).',
      });
    }

    const rateLimit = checkRateLimit(req, 20, 60000);
    if (!rateLimit.allowed) return json(res, 429, { success: false, error: 'Trop de requêtes.' });

    const body = await readJsonBody(req);
    const primaryColor = body.primary_color && HEX_COLOR_RE.test(body.primary_color)
      ? body.primary_color
      : '#1566F0';

    const payload = {
      user_id: user.id,
      enabled: body.enabled !== false,
      agency_name: body.agency_name ? String(body.agency_name).slice(0, 200) : null,
      agency_email: body.agency_email ? String(body.agency_email).slice(0, 200) : null,
      agency_phone: body.agency_phone ? String(body.agency_phone).slice(0, 50) : null,
      agency_website: sanitizeUrl(body.agency_website),
      logo_url: sanitizeUrl(body.logo_url),
      primary_color: primaryColor,
      footer_text: body.footer_text ? String(body.footer_text).slice(0, 500) : null,
      signature: body.signature ? String(body.signature).slice(0, 500) : null,
    };

    const { data, error } = await supabase
      .from('agency_branding')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) return json(res, 500, { success: false, error: 'Erreur sauvegarde' });
    return json(res, 200, { success: true, branding: data });
  }

  // ── DELETE : désactive ─────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    await supabase
      .from('agency_branding')
      .update({ enabled: false })
      .eq('user_id', user.id);

    return json(res, 200, { success: true });
  }

  return json(res, 405, { success: false, error: 'Method not allowed' });
}
