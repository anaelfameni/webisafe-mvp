import { generatePdf } from '../lib/generatePdf.js';
import { buildPdfFilename } from '../lib/pdfModel.js';
import { json, readJsonBody, setCorsHeaders } from '../api_shared/_utils.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const scanData = req.body && typeof req.body === 'object' ? req.body : await readJsonBody(req);
    const pdf = await generatePdf(scanData);
    const filename = buildPdfFilename(scanData);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.end(pdf);
  } catch (error) {
    console.error('PDF Error:', error);
    return json(res, 500, { error: 'Erreur génération PDF' });
  }
}
