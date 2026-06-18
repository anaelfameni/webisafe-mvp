import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { buildTemplate } from './pdfTemplate.js';

// Détection de l'environnement serverless (Vercel ou AWS Lambda).
// En serverless, on utilise @sparticuz/chromium (binaire Chromium Linux optimisé
// pour AWS Lambda / Vercel, ~50 MB au lieu de ~150 MB pour puppeteer full).
// En local (Windows/macOS/Linux dev), on utilise puppeteer-core avec un
// Chrome déjà installé sur la machine du développeur.
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.AWS_EXECUTION_ENV
);

function getLocalChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  // Sur Windows, on essaie plusieurs emplacements connus (x64, x86, Edge)
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe`,
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    for (const candidate of candidates) {
      try {
        if (candidate && existsSync(candidate)) return candidate;
      } catch { /* ignore */ }
    }
    // Aucun trouvé : on retourne le premier, l'erreur "Failed to launch" sera explicite
    return candidates[0];
  }

  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }

  // Linux : chemin le plus courant
  return '/usr/bin/google-chrome';
}

async function launchBrowser() {
  if (isServerless) {
    // Import dynamique pour ne charger @sparticuz/chromium qu'en serverless
    const { default: chromium } = await import('@sparticuz/chromium');
    return puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: { width: 992, height: 1403, deviceScaleFactor: 1 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  // Dev local : utilise le Chrome installé sur la machine
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath: getLocalChromePath(),
  });
}

export async function generatePdf(scanData) {
  const html = await buildTemplate(scanData);

  let browser;
  try {
    browser = await launchBrowser();
  } catch (error) {
    // Erreur de lancement Chromium : message clair pour faciliter le debug
    const hint = isServerless
      ? 'Vérifiez que @sparticuz/chromium est installé et que la fonction a au moins 1024 Mo de RAM.'
      : `Vérifiez que Google Chrome est installé sur cette machine (chemin attendu : ${getLocalChromePath()}). Sinon définissez CHROME_PATH dans .env.local.`;
    throw new Error(`Impossible de démarrer Chromium pour générer le PDF. ${hint} Erreur d'origine : ${error?.message || error}`);
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 992, height: 1403, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
