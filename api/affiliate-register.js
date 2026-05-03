import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

function generateRefCode(name) {
  const base = name.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlever accents
    .replace(/[^A-Z]/g, '').slice(0, 7)
  const suffix = Math.floor(Math.random() * 90 + 10) // 2 chiffres
  return `${base}${suffix}` // ex: "KOUASSI42"
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, phone } = req.body

  // Générer un code unique
  let refCode = generateRefCode(name)

  // Vérifier l'unicité (boucle si collision)
  let attempts = 0
  while (attempts < 5) {
    const { data } = await supabase
      .from('affiliates').select('id').eq('ref_code', refCode).single()
    if (!data) break
    refCode = generateRefCode(name) // régénérer si collision
    attempts++
  }

  // Sauvegarder
  const { error } = await supabase.from('affiliates').insert({
    name, email, ref_code: refCode
  })

  if (error?.code === '23505') { // email déjà existant
    return res.status(400).json({ error: 'Cet email est déjà affilié' })
  }
  if (error) return res.status(500).json({ error: 'Erreur serveur' })

  const affiliateLink = `https://webisafe.ci/?ref=${refCode}`

  // Email de confirmation avec le lien unique
  await resend.emails.send({
    from: 'Webisafe <onboarding@resend.dev>',
    to: email,
    subject: `Bienvenue dans le programme affilié Webisafe !`,
    html: `
      <h2>Bonjour ${name},</h2>
      <p>Votre lien affilié unique est prêt :</p>
      <p style="font-size:20px;font-weight:bold;background:#f5f5f5;padding:15px;border-radius:8px">
        ${affiliateLink}
      </p>
      <p>Votre code : <strong>${refCode}</strong></p>
      <p>Commission : <strong>20% sur chaque vente</strong> générée via votre lien.</p>
      <p>Suivez vos stats en temps réel : 
        <a href="https://webisafe.ci/affiliate/dashboard?code=${refCode}">
          Votre tableau de bord
        </a>
      </p>
      <hr/>
      <p style="color:#888;font-size:13px">
        Les commissions sont payées via Wave Mobile Money chaque 1er du mois.
      </p>
    `
  })

  return res.status(200).json({ success: true, refCode, affiliateLink })
}