import test from 'node:test';
import assert from 'node:assert/strict';

import { mergePaymentRequests } from './paymentRequestsCache.js';

test('mergePaymentRequests keeps the latest merged set sorted by creation date', () => {
  const localRows = [
    {
      id: 'local_1',
      scan_id: 'scan_1',
      payment_code: 'WBS-1111-AAAA',
      status: 'waiting_validation',
      created_at: '2026-04-21T10:00:00.000Z',
    },
  ];

  const remoteRows = [
    {
      id: 'remote_2',
      scan_id: 'scan_2',
      payment_code: 'WBS-2222-BBBB',
      status: 'validated',
      created_at: '2026-04-21T11:00:00.000Z',
    },
  ];

  const result = mergePaymentRequests(remoteRows, localRows);

  assert.equal(result.length, 2);
  assert.equal(result[0].id, 'remote_2');
  assert.equal(result[1].id, 'local_1');
});
