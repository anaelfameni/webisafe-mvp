import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPaymentNotificationSuccessToast } from './paymentToast.js';

test('builds the Wave payment notification toast with success wording and 5s duration', () => {
  assert.deepEqual(buildPaymentNotificationSuccessToast(), {
    type: 'success',
    message: 'La demande a bien été enregistrée et la notification est partie.',
    duration: 5000,
  });
});
