// lib/spaRenderer.js
//
// Rendu JavaScript via Puppeteer pour les SPA (React/Vue/Angular/Next/Nuxt).
// Utilisé par scanSEO et scanUX quand le HTML statique est détecté comme vide.
//
// Contrainte Vercel : api/scan.js a maxDuration=90s et 1024 MB.
// PageSpeed peut prendre 55s, il reste ~35s de marge.
// Ce module impose un timeout strict de 8s pour le rendu Puppeteer.
// En cas d'échec ou timeout → retourne null → les scanners tombent en fallback statique.
//
// Optimisation clé : l'appelant lance Puppeteer UNE seule fois via renderSpaHtml()
// et passe le résultat aux deux scanners — pas deux lancements par scan.

import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV
);

// Timeout strict pour le rendu SPA (ms).
// 8s : assez pour les SPA typiques (React, Vue), assez court pour ne pas bloquer le scan.
const SPA_RENDER_TIMEOUT_MS = 8_000;

function getLocalChromePath() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
    if (process.platform === 'win32') {
        const candidates = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe`,
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        ];
        for (const c of candidates) {
            try { if (c && existsSync(c)) return c; } catch { /* ignore */ }
        }
        return candidates[0];
    }
    if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    return '/usr/bin/google-chrome';
}

// Vérifie si le HTML statique indique une SPA dont le contenu est rendu côté client.
// Critères combinés : conteneur SPA racine + corps quasi-vide ou présence de bundles JS.
export function detectSpa(html, $) {
    const spaRootSelectors = ['#root', '#app', '#__next', '#__nuxt', '#__sveltekit', '[data-reactroot]', 'ng-app', '[ng-version]'];
    const hasSpaRoot = spaRootSelectors.some(sel => {
        try { return $(sel).length > 0; } catch { return false; }
    });

    const bodyText = $('body').clone().find('script, style, noscript, svg').remove().end().text().replace(/\s+/g, ' ').trim();
    const isBodyEmpty = bodyText.length < 200;

    const hasJsBundles =
        $('script[src*="/assets/"]').length > 0 ||
        $('script[src*="/chunks/"]').length > 0 ||
        $('script[src*="/chunk"]').length > 0 ||
        $('script[src*="/bundle"]').length > 0 ||
        $('script[src*="main."]').length > 0 ||
        $('script[src*="index."]').length > 0 ||
        $('script[type="module"]').length > 2;  // Vite / ESM moderne

    // SPA confirmée = racine identifiée ET (corps vide OU bundles JS présents)
    return hasSpaRoot && (isBodyEmpty || hasJsBundles);
}

// Lance Puppeteer, charge l'URL, attend le rendu JS, retourne le HTML final.
// Retourne null si timeout, erreur Chromium ou désactivé par variable d'env.
export async function renderSpaHtml(url) {
    // Échappatoire pour les environnements où Puppeteer n'est pas disponible
    if (process.env.DISABLE_SPA_RENDERER === '1') {
        console.log('[SPA] Renderer désactivé via DISABLE_SPA_RENDERER=1');
        return null;
    }

    let browser = null;
    const overallTimer = setTimeout(() => {
        // Dernier recours : tuer le browser si la fermeture prend trop de temps
        if (browser) browser.close().catch(() => {});
    }, SPA_RENDER_TIMEOUT_MS + 2_000);

    try {
        // Lancement Chromium
        if (isServerless) {
            const { default: chromium } = await import('@sparticuz/chromium');
            browser = await puppeteer.launch({
                args: [
                    ...chromium.args,
                    '--hide-scrollbars',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-dev-shm-usage',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',  // réduit la RAM en serverless
                ],
                defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1 },
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                timeout: SPA_RENDER_TIMEOUT_MS,
            });
        } else {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                executablePath: getLocalChromePath(),
                timeout: SPA_RENDER_TIMEOUT_MS,
            });
        }

        const page = await browser.newPage();

        // Viewport mobile (cohérent avec l'analyse UX)
        await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });

        // User-agent mobile réaliste
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

        // Bloquer les ressources inutiles pour le rendu : images, polices, vidéos, médias
        // → accélère le rendu de 40-60% sans impacter le DOM textuel
        await page.setRequestInterception(true);
        page.on('request', req => {
            const type = req.resourceType();
            if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Naviguer vers l'URL avec timeout strict
        await page.goto(url, {
            waitUntil: 'networkidle2',     // attend que le réseau soit calme (< 2 req en cours)
            timeout: SPA_RENDER_TIMEOUT_MS,
        });

        // Attendre que le contenu principal soit visible dans le DOM
        // On attend soit le premier H1, soit un minimum de texte dans body
        await page.waitForFunction(
            () => {
                const body = document.body?.innerText?.trim() || '';
                return body.length > 100 || document.querySelector('h1') !== null;
            },
            { timeout: 3_000 }
        ).catch(() => {
            // Pas grave si ce check échoue — on prend le HTML tel quel
        });

        const renderedHtml = await page.content();
        console.log(`[SPA] Rendu JS réussi pour ${url} — ${renderedHtml.length} bytes`);
        return renderedHtml;

    } catch (err) {
        console.warn(`[SPA] Rendu JS échoué pour ${url} — fallback statique. Raison: ${err.message}`);
        return null;
    } finally {
        clearTimeout(overallTimer);
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}
