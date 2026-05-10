import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import * as cheerio from 'cheerio';

import { analyzeSeoSignals, buildSeoBusinessRecommendations } from './seoSignals.js';

const COMPLETE_HTML = `<!doctype html>
<html lang="fr">
  <head>
    <title>Agence Web Abidjan - Création site PME</title>
    <meta name="description" content="Agence web à Abidjan spécialisée dans la création de sites professionnels, rapides et sécurisés pour PME ambitieuses en Côte d’Ivoire.">
    <meta property="og:title" content="Agence Web">
    <meta property="og:description" content="Création de sites">
    <meta property="og:image" content="/og.jpg">
    <meta name="twitter:title" content="Agence Web">
    <meta name="twitter:description" content="Création">
    <meta name="twitter:image" content="/tw.jpg">
    <link rel="icon" href="/favicon.ico">
    <script type="application/ld+json">{"@type":"Organization","name":"Agence Web"}</script>
  </head>
  <body>
    <a href="/contact">Contact</a>
    <a href="/mentions-legales">Mentions légales</a>
    <main>
      <h1>Agence Web Abidjan</h1>
      <h2>Sites PME</h2>
      <p>Contenu principal lisible pour les moteurs et les prospects avec une description claire de l’offre.</p>
      <p>Deuxième paragraphe pour confirmer que la page est lisible sans JavaScript et compréhensible par les machines.</p>
    </main>
    <img src="/hero.jpg" alt="Agence">
  </body>
</html>`;

const WEAK_HTML = `<!doctype html>
<html>
  <head>
    <title>Accueil</title>
    <meta name="description" content="Court.">
  </head>
  <body>
    <div id="root"></div>
    <h1>Bienvenue</h1>
    <h1>Accueil</h1>
    <img src="/hero.jpg">
  </body>
</html>`;

describe('analyzeSeoSignals', () => {
  test('returns pass statuses for complete technical and AI credibility signals', () => {
    const $ = cheerio.load(COMPLETE_HTML);
    const result = analyzeSeoSignals($, 'https://example.com/', {
      robots: { status: 'pass', url: 'https://example.com/robots.txt', blocking: false },
      sitemap: { status: 'pass', url: 'https://example.com/sitemap.xml', discovered_from: 'robots' },
      favicon: { status: 'pass', url: 'https://example.com/favicon.ico' },
    });

    assert.equal(result.technical_checks.title_length.status, 'pass');
    assert.equal(result.technical_checks.meta_description_length.status, 'pass');
    assert.equal(result.technical_checks.h1_unique.status, 'pass');
    assert.equal(result.technical_checks.headings_structure.status, 'pass');
    assert.equal(result.technical_checks.images_alt.status, 'pass');
    assert.equal(result.technical_checks.lang_attribute.status, 'pass');
    assert.equal(result.technical_checks.robots_txt.status, 'pass');
    assert.equal(result.technical_checks.sitemap_xml.status, 'pass');
    assert.equal(result.technical_checks.structured_data.status, 'pass');
    assert.equal(result.technical_checks.twitter_cards.status, 'pass');
    assert.equal(result.technical_checks.favicon.status, 'pass');
    assert.equal(result.ai_visibility.score >= 80, true);
    assert.equal(result.ai_visibility.checks.find((check) => check.key === 'organization_schema').status, 'pass');
  });

  test('returns warnings and business recommendations for weak SEO signals', () => {
    const $ = cheerio.load(WEAK_HTML);
    const result = analyzeSeoSignals($, 'https://example.com/', {
      robots: { status: 'warning', url: null, blocking: null },
      sitemap: { status: 'warning', url: null, discovered_from: null },
      favicon: { status: 'warning', url: null },
    });
    const recommendations = buildSeoBusinessRecommendations(result);

    assert.equal(result.technical_checks.title_length.status, 'warning');
    assert.equal(result.technical_checks.meta_description_length.status, 'warning');
    assert.equal(result.technical_checks.h1_unique.status, 'warning');
    assert.equal(result.technical_checks.headings_structure.status, 'warning');
    assert.equal(result.technical_checks.images_alt.status, 'warning');
    assert.equal(result.technical_checks.lang_attribute.status, 'warning');
    assert.equal(result.technical_checks.sitemap_xml.status, 'warning');
    assert.equal(result.technical_checks.structured_data.status, 'warning');
    assert.equal(recommendations.some((item) => item.problem === 'Meta description trop courte'), true);
    assert.equal(recommendations.some((item) => item.problem === 'H1 absent ou multiple'), true);
    assert.equal(recommendations.some((item) => item.problem === 'Structure H2/H3 insuffisante'), true);
    assert.equal(recommendations.some((item) => item.problem === 'Langue HTML non déclarée'), true);
    assert.equal(recommendations.some((item) => item.problem === 'Robots.txt non confirmé ou bloquant'), true);
    assert.equal(recommendations.some((item) => item.problem === 'Sitemap non confirmé'), true);
    assert.equal(recommendations.some((item) => item.problem === 'Données structurées absentes'), true);
    assert.equal(recommendations.some((item) => item.problem === 'Favicon non confirmé'), true);
    assert.equal(recommendations.every((item) => item.impact_business && item.correction && item.effort && item.priority), true);
  });
});
