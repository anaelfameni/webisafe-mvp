import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPremiumExplanationParagraphs } from './premiumExplanation.js';

test('builds an introduction, numbered issue paragraphs, and a persuasive action plan', () => {
  const recommendations = [
    {
      priority: 'CRITIQUE',
      category: 'security',
      title: 'Certificat HSTS manquant',
      description:
        "Votre site ne force pas la connexion HTTPS, ce qui expose vos visiteurs a des attaques.",
      impact: "vos visiteurs peuvent etre rediriges vers un faux site a votre insu",
      action: 'Activez HSTS dans la configuration serveur',
    },
    {
      priority: 'IMPORTANT',
      category: 'performance',
      title: 'Temps de chargement excessif',
      description: 'Votre page met plus de 3 secondes a charger sur mobile.',
      impact: 'vous perdez une partie importante des visiteurs avant affichage complet',
      action: 'Activez la compression et optimisez vos ressources critiques',
    },
    {
      priority: 'AMELIORATION',
      category: 'seo',
      title: 'Images sans attribut ALT',
      description: "Plusieurs images n'ont pas de texte alternatif.",
      impact: 'google comprend moins bien vos contenus visuels',
      action: 'Ajoutez un attribut alt descriptif a chaque image',
    },
  ];

  const paragraphs = buildPremiumExplanationParagraphs(recommendations);

  assert.equal(paragraphs.length, recommendations.length + 2);
  assert.match(paragraphs[0], /audit premium|vue complete|introduction/i);
  assert.match(paragraphs[1], /^1\./);
  assert.match(paragraphs[1], /point critique/i);
  assert.match(paragraphs[1], /credibilite|revenus|marque/i);
  assert.match(paragraphs[2], /^2\./);
  assert.match(paragraphs[2], /probl[eè]me important/i);
  assert.match(paragraphs[2], /cons[eé]quence concr[eè]te|ralentir le parcours utilisateur/i);
  assert.match(paragraphs[3], /^3\./);
  assert.match(paragraphs[3], /am[eé]lioration utile/i);
  assert.match(paragraphs[3], /pas le plus urgent/i);
  assert.match(paragraphs[4], /plan d'action global|ordre de correction/i);
  assert.match(paragraphs[4], /risque|faire ces corrections vous-meme|Webisafe peut prendre en charge/i);
});
