import { createClient } from '@supabase/supabase-js'
import { escapeHtml, requireCronSecret, sendResendEmail } from './_utils.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Sécuriser l'endpoint — seul le cron peut l'appeler
  if (!requireCronSecret(req, res)) return;

  // 1. Récupérer tous les clients Protect actifs
  const { data: clients } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')

  if (!clients?.length) return res.json({ checked: 0 })

  // 2. Vérifier chaque site en parallèle
  const results = await Promise.allSettled(
    clients.map(async (client) => {
      const start = Date.now()
      let status = 0
      let isUp = false

      try {
        const siteUrl = client.site_url || client.url
        if (!siteUrl) return { client: client.id, isUp: false, error: 'Aucune URL' }
        const r = await fetch(siteUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000) // timeout 10s
        })
        status = r.status
        isUp = r.status < 400
      } catch {
        isUp = false // timeout ou erreur réseau
      }

      const responseMs = Date.now() - start

      // 3. Insérer le log
      await supabase.from('uptime_logs').insert({
        client_id: client.id,
        status,
        response_ms: responseMs,
        is_up: isUp
      })

      // 4. Si site DOWN → créer un incident + notifier
      if (!isUp) {
        const { data: existing } = await supabase
          .from('incidents')
          .select('id')
          .eq('client_id', client.id)
          .is('resolved_at', null)
          .single()

        if (!existing) {
          // Nouvel incident
          await supabase.from('incidents').insert({
            client_id: client.id,
            notified: true
          })

          // Envoyer alerte email
          await sendResendEmail({
            to: client.user_email,
            subject: `⚠️ ALERTE — ${String(client.name || siteUrl).replace(/[\r\n]+/g, ' ')} est HORS LIGNE`,
            html: `
              <h2>Votre site est inaccessible</h2>
              <p><strong>${escapeHtml(siteUrl)}</strong> ne répond plus.</p>
              <p>Détecté à : ${new Date().toLocaleString('fr-FR')}</p>
              <p>Nous continuons à surveiller et vous notifierons dès le retour en ligne.</p>
            `
          })
        }
      } else {
        // Site UP → résoudre l'incident ouvert s'il existe
        const { data: incident } = await supabase
          .from('incidents')
          .select('id, started_at')
          .eq('client_id', client.id)
          .is('resolved_at', null)
          .single()

        if (incident) {
          const durationMin = Math.floor(
            (Date.now() - new Date(incident.started_at)) / 60000
          )
          await supabase.from('incidents').update({
            resolved_at: new Date().toISOString(),
            duration_minutes: durationMin
          }).eq('id', incident.id)

          // Email de retour en ligne
          await sendResendEmail({
            to: client.user_email,
            subject: `✅ ${String(client.name || siteUrl).replace(/[\r\n]+/g, ' ')} est de nouveau en ligne`,
            html: `
              <h2>Votre site est rétabli</h2>
              <p>Durée de l'incident : <strong>${durationMin} minutes</strong></p>
            `
          })
        }
      }

      return { client: siteUrl, isUp, responseMs }
    })
  )

  return res.json({
    checked: clients.length,
    results: results.map(r => r.value || r.reason)
  })
}