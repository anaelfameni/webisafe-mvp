/**
 * N.6 — Génération automatisée du sitemap.xml depuis une source unique :
 *  - Pages statiques publiques listées ci-dessous
 *  - Articles ressources lus depuis src/data/articles.js
 *
 * Usage : `node scripts/generate-sitemap.js`
 * Sortie : public/sitemap.xml (écrasé).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTICLES } from '../src/data/articles.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BRAND_URL = 'https://webisafe.vercel.app';
const TODAY = new Date().toISOString().slice(0, 10);

const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0', lastmod: TODAY },
  { path: '/protect', changefreq: 'weekly', priority: '0.9', lastmod: TODAY },
  { path: '/protect/status', changefreq: 'daily', priority: '0.6', lastmod: TODAY },
  { path: '/white-label', changefreq: 'monthly', priority: '0.8', lastmod: TODAY },
  { path: '/tarifs', changefreq: 'monthly', priority: '0.8', lastmod: TODAY },
  { path: '/a-propos', changefreq: 'monthly', priority: '0.7', lastmod: TODAY },
  { path: '/contact', changefreq: 'monthly', priority: '0.7', lastmod: TODAY },
  { path: '/partenaire', changefreq: 'monthly', priority: '0.7', lastmod: TODAY },
  { path: '/ressources', changefreq: 'weekly', priority: '0.8', lastmod: TODAY },
  { path: '/cgu', changefreq: 'yearly', priority: '0.4', lastmod: TODAY },
  { path: '/confidentialite', changefreq: 'yearly', priority: '0.4', lastmod: TODAY },
];

function urlEntry({ path, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${BRAND_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export function buildSitemapXml({ staticPages = STATIC_PAGES, articles = ARTICLES, baseUrl = BRAND_URL } = {}) {
  const articleEntries = articles.map((article) => urlEntry({
    path: `/ressources/${article.slug}`,
    lastmod: article.updatedAt || article.publishedAt,
    changefreq: 'monthly',
    priority: '0.7',
  }));
  const staticEntries = staticPages.map((page) => urlEntry({ ...page, path: page.path === '/' ? '/' : page.path }));
  const all = [...staticEntries, ...articleEntries];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.join('\n')}
</urlset>
`.replace('${baseUrl}', baseUrl);
}

function main() {
  const xml = buildSitemapXml();
  const outputPath = resolve(ROOT, 'public', 'sitemap.xml');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, xml, 'utf8');
  console.log(`[sitemap] ${ARTICLES.length} article(s) + ${STATIC_PAGES.length} page(s) → public/sitemap.xml`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('generate-sitemap.js')) {
  main();
}
