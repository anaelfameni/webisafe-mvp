import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

// H.1/H.2/H.3 — Le bypass agence est maintenant gouverné par le rôle serveur
// (Supabase) et non par un email codé en dur. L'email `client@test.com` reste
// supporté uniquement en DEV via le feature flag `VITE_ENABLE_TEST_BYPASS`.
test('payment page exposes a premium agency bypass for the client test account', () => {
  const payment = readFileSync(resolve('src/pages/Payment.jsx'), 'utf8');
  const rapport = readFileSync(resolve('src/pages/Rapport.jsx'), 'utf8');
  const access = readFileSync(resolve('src/utils/agencyAccess.js'), 'utf8');

  // Le feature flag protège le bypass test en DEV uniquement.
  expect(access).toContain('VITE_ENABLE_TEST_BYPASS');
  expect(access).toContain('TEST_BYPASS_ENABLED');
  expect(access).toContain("client@test.com");

  // Payment.jsx affiche le bypass via Lucide (ShieldCheck) et plus via emoji ⚙️.
  expect(payment).toContain('Mode Agence');
  expect(payment).toContain("Voir l'audit premium (Agence)");
  expect(payment).toContain('canUseAgencyBypass(user, scanId)');
  expect(payment).toContain('agencyScan');

  // Rapport.jsx vérifie le rôle via useAuth/Supabase, plus via location.state.
  expect(rapport).toContain('isAgencyUser(user)');
  expect(rapport).toContain('isAgencyBypass');
  expect(rapport).toContain("user?.role === 'admin'");
  // location.state ne sert qu'à pré-charger des données scan, jamais à autoriser.
  expect(rapport).toContain('location.state?.adminScan');
  expect(rapport).toContain('location.state?.agencyScan');
});
