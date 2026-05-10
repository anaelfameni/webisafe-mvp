import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('payment page exposes a premium agency bypass for the client test account', () => {
  const payment = readFileSync(resolve('src/pages/Payment.jsx'), 'utf8');
  const rapport = readFileSync(resolve('src/pages/Rapport.jsx'), 'utf8');
  const access = readFileSync(resolve('src/utils/agencyAccess.js'), 'utf8');

  expect(access).toContain("client@test.com");
  expect(payment).toContain('⚙️ Mode Agence');
  expect(payment).toContain("Voir l'audit premium (Agence)");
  expect(payment).toContain('canUseAgencyBypass(user, scanId)');
  expect(payment).toContain('agencyBypass: true');
  expect(payment).toContain('agencyScan');
  expect(rapport).toContain('location.state?.agencyBypass === true');
  expect(rapport).toContain('location.state?.agencyScan');
});
