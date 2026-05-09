import { test } from 'vitest';
import assert from 'node:assert/strict';

import {
  buildAdminPaymentNotificationEmail,
  buildPaymentConfirmedEmail,
  buildPaymentRejectedEmail,
} from './paymentEmails.js';

test('buildAdminPaymentNotificationEmail builds the admin alert email with the expected CTA', () => {
  const email = buildAdminPaymentNotificationEmail({
    appUrl: 'https://webisafe.vercel.app',
    payment_code: 'WBS-1234-ABCD',
    user_email: 'client@test.com',
    url_to_audit: 'https://site-client.ci',
    wave_phone: '+2250595335662',
    timestamp: '21/04/2026 10:30:00',
  });

  assert.equal(email.to, 'webisafe@gmail.com');
  assert.match(email.subject, /Nouveau paiement Wave/);
  assert.match(email.html, /Nouveau paiement à valider/);
  assert.match(email.html, /WBS-1234-ABCD/);
  assert.match(email.html, /35 000 FCFA/);
  assert.match(email.html, /https:\/\/webisafe\.vercel\.app\/admin/);
  assert.match(email.html, /Valider dans le Panel Admin/);
});

test('buildPaymentConfirmedEmail builds the premium report email for the client', () => {
  const email = buildPaymentConfirmedEmail({
    appUrl: 'https://webisafe.vercel.app',
    payment_code: 'WBS-1234-ABCD',
    user_email: 'client@test.com',
    scan_id: 'scan_42',
    url_to_audit: 'https://site-client.ci',
  });

  assert.equal(email.to, 'client@test.com');
  assert.match(email.subject, /rapport Webisafe est prêt/);
  assert.match(email.html, /Votre rapport est disponible/);
  assert.match(email.html, /https:\/\/webisafe\.vercel\.app\/rapport\/scan_42/);
  assert.match(email.html, /1 rescan gratuit disponible dans 30 jours/);
  assert.match(email.html, /webisafe@gmail\.com/);
  assert.match(email.html, /\+225 05 95 33 56 62/);
});

test('buildPaymentRejectedEmail builds the rejection email with support contacts', () => {
  const email = buildPaymentRejectedEmail({
    user_email: 'client@test.com',
    rejection_reason: 'Le paiement est introuvable dans Wave.',
  });

  assert.equal(email.to, 'client@test.com');
  assert.match(email.subject, /Paiement non confirmé/);
  assert.match(email.html, /Nous n'avons pas pu confirmer votre paiement/);
  assert.match(email.html, /Le paiement est introuvable dans Wave\./);
  assert.match(email.html, /\+225 05 95 33 56 62/);
  assert.match(email.html, /webisafe@gmail\.com/);
});
