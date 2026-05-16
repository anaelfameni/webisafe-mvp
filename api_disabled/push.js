import {
  json,
  readJsonBody,
  setCorsHeaders,
  checkRateLimit,
  getSupabaseAdminClient,
  requireAuthenticatedUser,
} from '../api_shared/_utils.js';

// R.6 — Push notifications web (subscribe / unsubscribe).
//
// POST   /api/push                 -> enregistre une subscription pour l'utilisateur connecté
// DELETE /api/push                 -> supprime une subscription (par endpoint)
// GET    /api/push                 -> liste les subscriptions de l'utilisateur (debug)

const ALLOWED_SCOPES = ['general', 'protect', 'tickets', 'marketing'];

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  const user = await requireAuthenticatedUser(req, res);
  if (!user) return;

  // ── POST : enregistrer une subscription ─────────────────────────────────
  if (req.method === 'POST') {
    const rateLimit = checkRateLimit(req, 30, 60000);
    if (!rateLimit.allowed) return json(res, 429, { success: false, error: 'Trop de requêtes.' });

    const body = await readJsonBody(req);
    const endpoint = String(body.endpoint || '').trim();
    const p256dh = String(body.p256dh || '').trim();
    const auth_secret = String(body.auth_secret || '').trim();
    const userAgent = body.user_agent ? String(body.user_agent).slice(0, 500) : null;
    const scope = ALLOWED_SCOPES.includes(body.scope) ? body.scope : 'general';

    if (!endpoint || !p256dh || !auth_secret) {
      return json(res, 400, {
        success: false,
        error: 'endpoint, p256dh et auth_secret requis',
      });
    }

    // Upsert (un même endpoint = une seule subscription)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          user_email: user.email,
          endpoint,
          p256dh,
          auth_secret,
          user_agent: userAgent,
          scope,
          active: true,
        },
        { onConflict: 'endpoint' }
      )
      .select()
      .single();

    if (error) {
      return json(res, 500, { success: false, error: 'Erreur enregistrement subscription' });
    }

    return json(res, 200, { success: true, subscription: data });
  }

  // ── DELETE : désenregistrer une subscription ─────────────────────────────
  if (req.method === 'DELETE') {
    const body = await readJsonBody(req);
    const endpoint = String(body.endpoint || '').trim();

    if (!endpoint) return json(res, 400, { success: false, error: 'endpoint requis' });

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);

    if (error) return json(res, 500, { success: false, error: 'Erreur suppression' });
    return json(res, 200, { success: true });
  }

  // ── GET : liste des subscriptions de l'utilisateur ──────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, scope, user_agent, active, created_at, last_notified_at')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) return json(res, 500, { success: false, error: 'Erreur lookup' });
    return json(res, 200, { success: true, subscriptions: data || [] });
  }

  return json(res, 405, { success: false, error: 'Method not allowed' });
}
