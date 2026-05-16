import { describe, expect, it } from 'vitest';
import { ARTICLES } from '../src/data/articles.js';
import { buildSitemapXml } from './generate-sitemap.js';

describe('sitemap generator', () => {
  it('produces a well-formed XML envelope', () => {
    const xml = buildSitemapXml();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trim().endsWith('</urlset>')).toBe(true);
  });

  it('lists all required public pages and every article slug', () => {
    const xml = buildSitemapXml();
    const expectedPaths = [
      'https://webisafe.vercel.app/',
      'https://webisafe.vercel.app/protect',
      'https://webisafe.vercel.app/tarifs',
      'https://webisafe.vercel.app/a-propos',
      'https://webisafe.vercel.app/contact',
      'https://webisafe.vercel.app/partenaire',
      'https://webisafe.vercel.app/ressources',
      'https://webisafe.vercel.app/cgu',
      'https://webisafe.vercel.app/confidentialite',
    ];
    for (const url of expectedPaths) {
      expect(xml).toContain(`<loc>${url}</loc>`);
    }
    for (const article of ARTICLES) {
      expect(xml).toContain(`<loc>https://webisafe.vercel.app/ressources/${article.slug}</loc>`);
    }
  });

  it('does not include private/admin routes', () => {
    const xml = buildSitemapXml();
    expect(xml).not.toMatch(/\/admin/);
    expect(xml).not.toMatch(/\/dashboard/);
    expect(xml).not.toMatch(/\/payment/);
    expect(xml).not.toMatch(/\/rapport/);
  });
});
