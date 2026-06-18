// api/webhook/wave.js
//
// Reçoit les événements Wave Checkout (checkout.session.completed, etc.),
// vérifie la signature HMAC-SHA256, et active automatiquement les rapports payés.
//
// POST /api/webhook/wave  — appelé par Wave, pas par le client
// Aucune auth Bearer : la vérification se fait via la signature Wave-Signature.
//
// IMPORTANT : Vercel lit req.body par défaut et le parse.
// Pour la vérification HMAC, il faut le corps RAW (bytes bruts, pas JSON parsé).
// On configure rawBody via bodyParser:false dans la config Vercel.

export const config = {
  api: { bodyParser: false },   // indispensable : HMAC doit signer le body brut
  maxDuration: 15,
};

import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSupabaseAdminClient, sendResendEmail } from '../../api_shared/_utils.js';
import { buildPaymentConfirmedEmail, resolveAppUrl } from '../../api_shared/_paymentEmails.js';

// Lit le body brut (Buffer) depuis le stream de la requête.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Vérifie la signature Wave-Signature (HMAC-SHA256).
// Format de l'en-tête : "t=1639081943,v1=<hex>"
// Payload signé : `${timestamp}${rawBodyAsString}`
// Tolérance replay : ±5 minutes.
function verifyWaveSignature(rawBody, signatureHeader, signingSecret) {
  if (!signatureHeader || !signingSecret) return false;

  // Extraire timestamp et signature(s)
  const parts = Object.fromEntries(
    signatureHeader.split(',').map(part => {
      const idx = part.indexOf('=');
      return [part.slice(0, idx), part.slice(idx + 1)];
    })
  );

  const timestamp = parts['t'];
  const receivedSig = parts['v1'];
  if (!timestamp || !receivedSig) return false;

  // Vérification replay : timestamp dans la fenêtre de ±5 minutes
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    console.warn('[webhook/wave] Timestamp hors fenêtre (replay attack possible) :', ts, 'vs', now);
    return false;
  }

  // Recalcul de la signature côté serveur
  const payload = `${timestamp}${rawBody.toString('utf8')}`;
  const expectedSig = createHmac('sha256', signingSecret).update(payload).digest('hex');

  // Comparaison timing-safe pour éviter les timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(receivedSig, 'hex')
    );
  } catch {
    return false;
  }
}

// Active le rapport (scan.paid = true) et met à jour payment_requests.
async function activateScan(supabase, scanId, sessionId, eventData) {
  const now = new Date().toISOString();

  // Marquer le scan comme payé
  const { error: scanError } = await supabase
    .from('scans')
    .update({ paid: true, paid_at: now, wave_session_id: sessionId })
    .eq('id', scanId);

  if (scanError) throw new Error(`scan update failed: ${scanError.message}`);

  // Mettre à jour payment_requests (statut + champs Wave)
  await supabase
    .from('payment_requests')
    .update({
      status: 'validated',
      validated_at: now,
      validated_by: 'wave_webhook',
      wave_session_id: sessionId,
      wave_transaction_id: eventData.transaction_id || null,
    })
    .eq('scan_id', scanId)
    .catch(err => console.warn('[webhook/wave] payment_requests update warn:', err.message));
}

// Envoie un email de confirmation au client.
async function notifyClient(supabase, scanId, sessionId) {
  try {
    // Récupérer l'email du client depuis scans ou payment_requests
    const { data: scan } = await supabase
      .from('scans')
      .select('user_email, url')
      .eq('id', scanId)
      .single();

    const userEmail = scan?.user_email;
    if (!userEmail) return;

    const appUrl = resolveAppUrl();

    await sendResendEmail(
      buildPaymentConfirmedEmail({
        appUrl,
        payment_code: sessionId,
        user_email: userEmail,
        scan_id: scanId,
        url_to_audit: scan.url || '—',
      })
    );
  } catch (err) {
    // Non-bloquant : l'activation du rapport ne doit pas échouer si l'email rate
    console.warn('[webhook/wave] email client failed:', err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }

  // Lire le corps brut AVANT tout parsing JSON
  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    console.error('[webhook/wave] body read error:', err.message);
    res.statusCode = 400;
    return res.end('Bad request');
  }

  // Vérification de la signature
  const signingSecret = process.env.WAVE_WEBHOOK_SECRET;
  const signatureHeader = req.headers['wave-signature'] || req.headers['x-wave-signature'] || '';

  if (!signingSecret) {
    // En dev/staging sans secret configuré : log + traitement quand même (pour tests)
    console.warn('[webhook/wave] WAVE_WEBHOOK_SECRET non configuré — signature non vérifiée');
  } else if (!verifyWaveSignature(rawBody, signatureHeader, signingSecret)) {
    console.error('[webhook/wave] Signature invalide — requête rejetée');
    res.statusCode = 401;
    return res.end('Invalid signature');
  }

  // Parser le body maintenant que la signature est validée
  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    res.statusCode = 400;
    return res.end('Invalid JSON');
  }

  const eventType = event?.type;
  const eventData = event?.data ?? {};
  const sessionId = eventData?.id;
  const scanId = eventData?.client_reference;   // = scan_id Webisafe, défini lors de create-session

  console.log(`[webhook/wave] Event reçu : ${eventType} | session=${sessionId} | scan=${scanId}`);

  // Wave demande une réponse 2xx dans les 5 secondes — on répond immédiatement
  // et on traite en async (fire-and-forget) pour ne pas timeuter.
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ received: true }));

  // Traitement asynchrone après la réponse
  setImmediate(async () => {
    if (eventType !== 'checkout.session.completed') {
      console.log(`[webhook/wave] Événement ignoré : ${eventType}`);
      return;
    }

    if (eventData.payment_status !== 'succeeded') {
      console.log(`[webhook/wave] Paiement non réussi : payment_status=${eventData.payment_status}`);
      return;
    }

    if (!scanId) {
      console.error('[webhook/wave] client_reference (scan_id) manquant dans l\'événement');
      return;
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      console.error('[webhook/wave] Supabase non configuré — impossible d\'activer le scan');
      return;
    }

    // Idempotence : vérifier que le scan n'est pas déjà payé
    const { data: existing } = await supabase
      .from('scans')
      .select('id, paid')
      .eq('id', scanId)
      .single()
      .catch(() => ({ data: null }));

    if (existing?.paid === true) {
      console.log(`[webhook/wave] Scan ${scanId} déjà payé — événement dupliqué ignoré`);
      return;
    }

    try {
      await activateScan(supabase, scanId, sessionId, eventData);
      console.log(`[webhook/wave] ✅ Scan ${scanId} activé via session ${sessionId}`);
      await notifyClient(supabase, scanId, sessionId);
    } catch (err) {
      console.error(`[webhook/wave] ❌ Activation scan ${scanId} échouée :`, err.message);
      // Le scan reste en waiting_webhook → l'admin peut déclencher la validation manuelle
    }
  });
}
