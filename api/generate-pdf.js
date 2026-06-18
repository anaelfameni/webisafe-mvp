import { generatePdf } from '../lib/generatePdf.js';
import { buildPdfFilename } from '../lib/pdfModel.js';
import { getPdfFromCache, savePdfToCache } from '../lib/pdfCache.js';
import { json, readJsonBody, setCorsHeaders, checkRateLimit, requireAuthenticatedUser } from '../api_shared/_utils.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  // Authentification requise : évite l'abus de marque et la surcharge Puppeteer
  // par des appels non autorisés.
  const authUser = await requireAuthenticatedUser(req, res);
  if (!authUser) return;

  // Rate limit sur les PDF : endpoint coûteux (Puppeteer + 60s)
  const rateLimit = checkRateLimit(req, 10, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { error: `Trop de générations PDF, réessayez dans ${rateLimit.retryAfter}s` });
  }

  try {
    const scanData = req.body && typeof req.body === 'object' ? req.body : await readJsonBody(req);
    if (!scanData || (typeof scanData === 'object' && Object.keys(scanData).length === 0)) {
      return json(res, 400, { error: 'Données du scan manquantes pour générer le PDF.' });
    }

    const filename = buildPdfFilename(scanData);
    // scan_id ou id identifient le scan en base — clé de cache stable par scan.
    // Un nouveau scan sur la même URL génère toujours un nouvel id → invalidation naturelle.
    const scanId = scanData.scan_id || scanData.id || null;

    // ── Lecture du cache ────────────────────────────────────────────────────────
    // Si un PDF a déjà été généré pour ce scan_id + cette version du template,
    // on le retourne directement sans relancer Chromium.
    if (scanId) {
      const cached = await getPdfFromCache(scanId);
      if (cached) {
        console.log(`[PDF] Cache HIT pour scan ${scanId} — Chromium non démarré`);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('X-Pdf-Cache', 'hit');
        res.setHeader('Cache-Control', 'no-store');
        res.end(cached);
        return;
      }
    }

    // ── Génération Chromium ─────────────────────────────────────────────────────
    const t0 = Date.now();
    const pdf = await generatePdf(scanData);
    console.log(`[PDF] Généré en ${Date.now() - t0}ms pour scan ${scanId || '(no id)'}`);

    // ── Mise en cache ───────────────────────────────────────────────────────────
    // On attend savePdfToCache AVANT res.end() : sur Vercel serverless, toute
    // Promise non résolue au moment de res.end() est immédiatement coupée.
    // savePdfToCache a son propre timeout interne de 3 s (UPLOAD_TIMEOUT_MS) —
    // si Supabase Storage est lent, on n'attend pas au-delà. Erreurs silencieuses.
    if (scanId) {
      await savePdfToCache(scanId, pdf);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Pdf-Cache', 'miss');
    res.setHeader('Cache-Control', 'no-store');
    res.end(pdf);
  } catch (error) {
    // H.4 — Loguer le détail côté serveur mais renvoyer un message d'erreur
    // utile au client (sans fuite de stack trace) pour faciliter le diagnostic.
    console.error('[PDF] Génération échouée :', error?.stack || error);
    const safeMessage = String(error?.message || 'Erreur interne').slice(0, 280);
    return json(res, 500, {
      error: `Génération PDF impossible : ${safeMessage}`,
    });
  }
}
