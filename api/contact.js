import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { setCorsHeaders } from './_utils.js'

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const ADMIN_EMAIL = process.env.CONTACT_ADMIN_EMAIL || 'webisafe@gmail.com'
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'Webisafe <onboarding@resend.dev>'

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { name, email, subject, message } = req.body || {}

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' })
  }

  // Vérification config serveur
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[contact] Supabase non configuré', {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_SERVICE_KEY,
    })
    return res.status(500).json({
      error: 'Configuration serveur manquante (Supabase). Contactez l\'administrateur.',
    })
  }
  if (!RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY manquante')
    // On continue quand même : la sauvegarde DB est prioritaire
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

  // 1️⃣ Sauvegarde Supabase (bloquante)
  try {
    const { error: dbError } = await supabase
      .from('contact_messages')
      .insert({ name, email, subject: subject || null, message })

    if (dbError) {
      console.error('[contact] Supabase insert error:', dbError)
      return res.status(500).json({
        error: `Erreur DB: ${dbError.message || 'inconnue'}`,
        hint: dbError.hint || null,
      })
    }
  } catch (err) {
    console.error('[contact] Supabase exception:', err)
    return res.status(500).json({ error: 'Erreur de sauvegarde en base.' })
  }

  // 2️⃣ Emails (non bloquants — si Resend échoue, le message est déjà en DB)
  const emailErrors = []

  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        reply_to: email,
        subject: `📩 Nouveau message de ${name} — ${subject || 'sans objet'}`,
        html: `
          <h2>Nouveau message via Webisafe</h2>
          <p><strong>Nom :</strong> ${name}</p>
          <p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Sujet :</strong> ${subject || '—'}</p>
          <hr/>
          <p>${String(message).replace(/\n/g, '<br/>')}</p>
        `,
      })
      if (error) {
        console.error('[contact] Resend admin error:', error)
        emailErrors.push(`admin: ${error.message || error.name}`)
      }
    } catch (err) {
      console.error('[contact] Resend admin exception:', err)
      emailErrors.push(`admin: ${err.message}`)
    }

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Votre message a bien été reçu',
        html: `
          <h2>Bonjour ${name},</h2>
          <p>Nous avons bien reçu votre message et vous répondrons dans les 24h.</p>
          <p style="color:#888">— L'équipe Webisafe</p>
        `,
      })
      if (error) {
        console.error('[contact] Resend confirm error:', error)
        emailErrors.push(`confirm: ${error.message || error.name}`)
      }
    } catch (err) {
      console.error('[contact] Resend confirm exception:', err)
      emailErrors.push(`confirm: ${err.message}`)
    }
  }

  return res.status(200).json({
    success: true,
    saved: true,
    emailsSent: resend && emailErrors.length === 0,
    emailErrors: emailErrors.length ? emailErrors : undefined,
  })
}