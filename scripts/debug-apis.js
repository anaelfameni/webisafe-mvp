// scripts/debug-apis.js
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Chargement .env ───────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
}

const API_KEY = process.env.GOOGLE_PAGESPEED_KEY;
const TEST_URL = 'https://wordpress.com';

// ── Debug PageSpeed ───────────────────────────────────────────────────────────
async function debugPageSpeed() {
    console.log('\n════ PAGESPEED RAW RESPONSE ════\n');

    const url =
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
        `?url=${encodeURIComponent(TEST_URL)}&strategy=mobile&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();
    const lhr = data.lighthouseResult;

    if (!lhr) {
        console.error('Pas de lighthouseResult !');
        console.log(JSON.stringify(data, null, 2));
        return;
    }

    // Scores des catégories
    console.log('── Catégories ──');
    for (const [id, cat] of Object.entries(lhr.categories ?? {})) {
        console.log(`  ${id}: score=${cat.score} → ${Math.round((cat.score ?? 0) * 100)}`);
    }

    // Audits qui nous intéressent
    console.log('\n── Audits ciblés ──');
    const audits = ['is-on-https', 'viewport', 'tap-targets', 'font-size'];
    for (const id of audits) {
        const a = lhr.audits?.[id];
        console.log(`  ${id}:`);
        console.log(`    score            = ${a?.score}`);
        console.log(`    scoreDisplayMode = ${a?.scoreDisplayMode}`);
        console.log(`    displayValue     = ${a?.displayValue}`);
    }
}

// ── Debug Webisafe ────────────────────────────────────────────────────────────
async function debugWebisafe() {
    console.log('\n════ WEBISAFE RAW RESPONSE ════\n');

    const res = await fetch('http://localhost:3001/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: TEST_URL }),
    });

    const data = await res.json();

    // Structure complète
    console.log(JSON.stringify(data, null, 2));

    // Résumé des chemins
    console.log('\n── Chemins détectés ──');
    console.log('  data.scores           =', JSON.stringify(data.scores));
    console.log('  data.data?.scores     =', JSON.stringify(data.data?.scores));
    console.log('  data.summary          =', JSON.stringify(data.summary));
    console.log('  data.data?.summary    =', JSON.stringify(data.data?.summary));
    console.log('  data.security         =', JSON.stringify(data.security));
    console.log('  data.data?.security   =', JSON.stringify(data.data?.security));
    console.log('  data.seo              =', JSON.stringify(data.seo));
    console.log('  data.data?.seo        =', JSON.stringify(data.data?.seo));
    console.log('  data.ux               =', JSON.stringify(data.ux));
    console.log('  data.data?.ux         =', JSON.stringify(data.data?.ux));
}

// ── Main ──────────────────────────────────────────────────────────────────────
await debugPageSpeed().catch(e => console.error('PageSpeed error:', e.message));
await debugWebisafe().catch(e => console.error('Webisafe error:', e.message));