import { describe, expect, it } from 'vitest';
import { ARTICLES, getArticleBySlug } from './articles.js';

describe('articles dataset', () => {
  it('contains exactly 3 unique articles with unique slugs', () => {
    expect(ARTICLES).toHaveLength(3);
    const slugs = new Set(ARTICLES.map((article) => article.slug));
    expect(slugs.size).toBe(3);
  });

  it('declares the required metadata for each article', () => {
    for (const article of ARTICLES) {
      expect(article.slug).toMatch(/^[a-z0-9-]+$/);
      expect(article.title.length).toBeGreaterThan(10);
      expect(article.excerpt.length).toBeGreaterThan(20);
      expect(article.category).toMatch(/^(Performance|Sécurité|SEO)$/);
      expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(article.sections)).toBe(true);
      expect(article.sections.length).toBeGreaterThan(0);
      expect(Array.isArray(article.sources)).toBe(true);
      expect(article.sources.length).toBeGreaterThan(0);
      for (const source of article.sources) {
        expect(typeof source.label).toBe('string');
        expect(source.url).toMatch(/^https?:\/\//);
      }
    }
  });

  it('returns the matching article by slug or null', () => {
    expect(getArticleBySlug(ARTICLES[0].slug)).toBe(ARTICLES[0]);
    expect(getArticleBySlug('unknown-slug')).toBeNull();
    expect(getArticleBySlug('')).toBeNull();
  });
});
