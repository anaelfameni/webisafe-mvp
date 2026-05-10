import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('dashboard shells expose distinct role identities and guarded auth loading states', () => {
  const app = readFileSync(resolve('src/App.jsx'), 'utf8');
  const admin = readFileSync(resolve('src/pages/Admin.jsx'), 'utf8');
  const agency = readFileSync(resolve('src/pages/AgenceDashboard.jsx'), 'utf8');
  const client = readFileSync(resolve('src/pages/Dashboard.jsx'), 'utf8');

  expect(app).toContain('authLoading={authLoading}');
  expect(admin).toContain('Console administrateur');
  expect(admin).toContain('Command center');
  expect(admin).toContain('Supervision plateforme');
  expect(admin).toContain('Centre de contrôle Webisafe');
  expect(admin).toContain('Salle de validation');
  expect(admin).toContain('Journal plateforme');
  expect(admin).toContain('Vérification des droits administrateur');
  expect(agency).toContain('Console agence marque blanche');
  expect(agency).toContain('B2B studio');
  expect(agency).toContain('Cockpit agence B2B');
  expect(agency).toContain('Portefeuille client prioritaire');
  expect(agency).toContain('Centre de livraison');
  expect(agency).toContain('Vérification de votre espace agence');
  expect(client).toContain('Espace client personnel');
  expect(client).toContain('Client space');
  expect(client).toContain('Mon espace personnel');
  expect(client).toContain('Plan d’action client');
  expect(client).toContain('État de votre site');
  expect(client).toContain('Chargement sécurisé de votre espace');
});
