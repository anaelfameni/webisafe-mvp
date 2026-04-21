import test from 'node:test';
import assert from 'node:assert/strict';

import { SIGNUPS_TABLE, buildSignupRecord, persistSignupRecord } from './signupPersistence.js';

test('buildSignupRecord maps signup coordinates for Supabase storage', () => {
  const createdAt = '2026-04-21T22:15:00.000Z';

  const record = buildSignupRecord({
    id: 'user_123',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+2250700000000',
    phoneCountry: 'CI',
    createdAt,
  });

  assert.deepEqual(record, {
    id: 'user_123',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+2250700000000',
    phone_country: 'CI',
    created_at: createdAt,
  });
});

test('persistSignupRecord inserts the record into the signups table', async () => {
  const calls = [];

  const saved = await persistSignupRecord(
    {
      id: 'user_456',
      name: 'Grace Hopper',
      email: 'grace@example.com',
      phone: '+2250102030405',
      phoneCountry: 'CI',
      createdAt: '2026-04-21T22:16:00.000Z',
    },
    {
      insert: async (table, body) => {
        calls.push({ table, body });
        return { table, ...body };
      },
    }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, SIGNUPS_TABLE);
  assert.deepEqual(saved, {
    table: SIGNUPS_TABLE,
    id: 'user_456',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    phone: '+2250102030405',
    phone_country: 'CI',
    created_at: '2026-04-21T22:16:00.000Z',
  });
});
