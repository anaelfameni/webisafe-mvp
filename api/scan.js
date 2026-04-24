// api/scan.js
import { handleScan } from '../server/controllers/scanController.js';

export const config = {
    runtime: 'nodejs',
    maxDuration: 60, // augmente le temps max (selon ton plan Vercel)
};

async function readJsonBody(req) {
    // Sur Vercel Functions, req.body n'est pas toujours parsé
    if (req.body && typeof req.body === 'object') return req.body;

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};

    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function validateAndNormalizeUrl(input) {
    if (!input || typeof input !== 'string') {
        return { ok: false, error: 'Le champ "url" est requis.' };
    }

    let parsed;
    try {
        parsed = new URL(input.trim());
    } catch {
        return { ok: false, error: 'URL invalide. Utilisez le format https://votresite.ci' };
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { ok: false, error: 'Seuls les protocoles HTTP et HTTPS sont acceptés.' };
    }

    return { ok: true, url: parsed.href };
}

export default async function handler(req, res) {
    // (Optionnel) CORS si un jour tu appelles l’API depuis un autre domaine
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const body = await readJsonBody(req);
        const check = validateAndNormalizeUrl(body?.url);

        if (!check.ok) {
            return res.status(400).json({ success: false, error: check.error });
        }

        // Injecte un body "express-like" pour réutiliser ton controller existant
        req.body = { url: check.url };

        return await handleScan(req, res);
    } catch (e) {
        console.error('API /api/scan error:', e);
        return res.status(500).json({
            success: false,
            error: e?.message || "Erreur interne lors de l'analyse",
        });
    }
}