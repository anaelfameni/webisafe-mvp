import test from 'node:test';
import assert from 'node:assert/strict';

import { buildValidatedPremiumMap, PREMIUM_VALIDATED_MESSAGE } from './premiumAccess.js';

test('maps only validated payments that match local scans', () => {
  const scans = [{ id: 'scan_1' }, { id: 'scan_2' }];
  const payments = [
    { scan_id: 'scan_1', status: 'validated', payment_code: 'WBS-1111-AAAA', validated_at: '2026-04-21T10:00:00.000Z' },
    { scan_id: 'scan_2', status: 'waiting_validation', payment_code: 'WBS-2222-BBBB' },
    { scan_id: 'scan_3', status: 'validated', payment_code: 'WBS-3333-CCCC' },
  ];

  const result = buildValidatedPremiumMap(scans, payments);

  assert.deepEqual(Object.keys(result), ['scan_1']);
  assert.equal(result.scan_1.message, PREMIUM_VALIDATED_MESSAGE);
  assert.equal(result.scan_1.paymentCode, 'WBS-1111-AAAA');
});
