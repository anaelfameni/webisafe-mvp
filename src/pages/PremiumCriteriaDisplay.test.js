import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('premium report and PDF expose enhanced SEO and security criteria', () => {
  const rapport = readFileSync(resolve('src/pages/Rapport.jsx'), 'utf8');
  const pdfModel = readFileSync(resolve('lib/pdfModel.js'), 'utf8');
  const pdfTemplate = readFileSync(resolve('lib/pdfTemplate.js'), 'utf8');

  for (const expected of [
    'Contrôles SEO avancés',
    'Longueur title',
    'Longueur meta description',
    'H1 unique',
    'Structure H2/H3',
    'Images avec alt',
    'Langue HTML',
    'Robots.txt',
    'Sitemap XML',
    'Données structurées',
    'Twitter Cards',
    'Favicon',
    'Crédibilité IA & moteurs',
    'Recommandations SEO orientées business',
    'Signaux sécurité renforcés',
    'Qualité CSP',
    'Méthodes HTTP sensibles',
    'DNSSEC',
    'CMS détecté',
    'Librairies JavaScript',
    'Subresource Integrity',
    'WordPress',
  ]) {
    expect(rapport).toContain(expected);
  }

  for (const expected of [
    'technical_checks',
    'ai_visibility',
    'business_recommendations',
    'csp_quality',
    'http_methods',
    'dnssec',
    'cms_detection',
    'wordpress_security',
    'js_libraries',
    'sri',
    'compliance_badges',
    'advancedRows',
    'aiVisibility',
    'businessRecommendations',
    'complianceBadges',
  ]) {
    expect(pdfModel).toContain(expected);
  }

  expect(pdfTemplate).toContain('Visibilité IA & conformité');
  expect(pdfTemplate).toContain('Méthodes HTTP');
  expect(pdfTemplate).toContain('Préparation conformité');
  expect(pdfTemplate).toContain('Résumé sécurité enrichie');
});
