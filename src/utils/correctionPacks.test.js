import { test } from 'vitest';
import assert from 'node:assert/strict';

import { buildPackImprovements } from './correctionPacks.js';

test('builds pack improvements from scan recommendations without listing unrelated fixes', () => {
  const recommendations = [
    { title: 'Activer les protections de sÃ©curitÃ© manquantes', priority: 'CRITIQUE', category: 'security' },
    { action: "AccÃ©lÃ©rer l'affichage du contenu principal", priority: 'HAUTE', category: 'performance' },
    { titre: 'Ajouter une meta description claire', priority: 'MOYENNE', category: 'seo' },
    { title: 'AmÃ©liorer les Ã©lÃ©ments tactiles sur mobile', priority: 'BASSE', category: 'ux' },
  ];

  const packs = buildPackImprovements(recommendations);

  assert.deepEqual(packs.rapide, [
    'Activer les protections de sÃ©curitÃ© manquantes',
    "AccÃ©lÃ©rer l'affichage du contenu principal",
    'Ajouter une meta description claire',
  ]);
  assert.deepEqual(packs.standard, [
    'Activer les protections de sÃ©curitÃ© manquantes',
    "AccÃ©lÃ©rer l'affichage du contenu principal",
    'Ajouter une meta description claire',
    'AmÃ©liorer les Ã©lÃ©ments tactiles sur mobile',
  ]);
  assert.deepEqual(packs.complet, [
    'Activer les protections de sÃ©curitÃ© manquantes',
    "AccÃ©lÃ©rer l'affichage du contenu principal",
    'Ajouter une meta description claire',
    'AmÃ©liorer les Ã©lÃ©ments tactiles sur mobile',
  ]);
});

test('falls back to coherent default improvements when no scan recommendations are available', () => {
  const packs = buildPackImprovements([]);

  assert.ok(packs.rapide.some((item) => item.includes('Meta tags')));
  assert.ok(packs.standard.some((item) => item.includes('sécurité')));
  assert.ok(packs.complet.some((item) => item.includes('Optimisation complète')));
});
