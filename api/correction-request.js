import { createClient } from '@supabase/supabase-js';
import { json, readJsonBody, sendResendEmail, setCorsHeaders, requireAdmin } from './_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    let body;
    try { body = await readJsonBody(req); } catch { return json(res, 400, { error: 'Corps invalide' }); }

    const { name, email, phone, url, pack, message } = body;

    if (!name || !email || !url || !pack) {
      return json(res, 400, { error: 'Nom, email, URL et pack sont requis' });
    }

    const payload = {
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : null,
      url: String(url).trim(),
      pack: String(pack).trim(),
      message: message ? String(message).trim() : null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Envoi email admin (non bloquant)
    const emailPromise = sendResendEmail({
      to: 'admin@webisafe.ci',
      subject: `🔧 Nouvelle demande de correction — ${payload.pack}`,
      html: `
        <h2>Nouvelle demande de correction WebiSafe</h2>
        <ul>
          <li><strong>Nom :</strong> ${payload.name}</li>
          <li><strong>Email :</strong> ${payload.email}</li>
          <li><strong>Téléphone :</strong> ${payload.phone || 'N/A'}</li>
          <li><strong>Site :</strong> ${payload.url}</li>
          <li><strong>Pack :</strong> ${payload.pack}</li>
          <li><strong>Message :</strong> ${payload.message || 'Aucun'}</li>
          <li><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</li>
        </ul>
        <p>Connectez-vous au panel admin pour traiter cette demande.</p>
      `,
    }).catch(() => {});

    // Stockage Supabase (best effort)
    let dbRecord = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('correction_requests')
          .insert(payload)
          .select()
          .single();
        if (!error) dbRecord = data;
      } catch {
        // silent
      }
    }

    await emailPromise;

    return json(res, 201, {
      success: true,
      message: 'Demande envoyée — notre équipe vous recontacte sous 24h.',
      id: dbRecord?.id || null,
    });
  }

  if (req.method === 'GET') {
    const adminUser = await requireAdmin(req, res);
    if (!adminUser) return;

    if (!supabase) return json(res, 503, { error: 'Service indisponible' });

    const { data, error } = await supabase
      .from('correction_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return json(res, 500, { error: 'Erreur lecture base de données' });

    return json(res, 200, { success: true, data: data || [] });
  }

  return json(res, 405, { error: 'Method not allowed' });
}
