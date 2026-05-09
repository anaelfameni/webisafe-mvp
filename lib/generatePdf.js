import puppeteer from 'puppeteer';
import { buildTemplate } from './pdfTemplate.js';

export async function generatePdf(scanData) {
  const html = buildTemplate(scanData);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

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
