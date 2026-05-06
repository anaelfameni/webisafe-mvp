import { createRequire } from 'module';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import puppeteer from 'puppeteer';
import { buildTemplate } from './pdfTemplate.js';

const require = createRequire(import.meta.url);
let cachedChartScript = null;

async function getChartScript() {
  if (cachedChartScript) return cachedChartScript;
  const chartPath = join(dirname(require.resolve('chart.js')), 'chart.umd.js');
  cachedChartScript = (await readFile(chartPath, 'utf8')).replace(/<\/script/gi, '<\\/script');
  return cachedChartScript;
}

export async function generatePdf(scanData) {
  const chartScript = await getChartScript();
  const html = buildTemplate(scanData, { chartScript });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => window.chartsReady === true, { timeout: 10000 });
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
