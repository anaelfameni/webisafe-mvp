import { generatePdf } from '../lib/generatePdf.js';
import { buildPdfFilename } from '../lib/pdfModel.js';
import { json, readJsonBody, setCorsHeaders, checkRateLimit } from '../api_shared/_utils.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  // H.10 — Rate limit endpoint coûteux (Puppeteer) : 10 PDF/min/IP
  const rateLimit = checkRateLimit(req, 10, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { error: `Trop de g\u00e9n\u00e9rations PDF, r\u00e9essayez dans ${rateLimit.retryAfter}s` });
  }

  try {
    const scanData = req.body && typeof req.body === 'object' ? req.body : await readJsonBody(req);
    if (!scanData || (typeof scanData === 'object' && Object.keys(scanData).length === 0)) {
      return json(res, 400, { error: 'Données du scan manquantes pour générer le PDF.' });
    }

    const pdf = await generatePdf(scanData);
    const filename = buildPdfFilename(scanData);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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
