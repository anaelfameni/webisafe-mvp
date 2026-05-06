import { expect, test } from 'vitest';

import { SIGNUP_PROFILE_ENDPOINT, buildSignupRecord, persistSignupRecord } from './signupPersistence.js';

test('buildSignupRecord maps signup coordinates for Supabase storage', () => {
  const createdAt = '2026-04-21T22:15:00.000Z';

  const record = buildSignupRecord({
    id: 'user_123',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+2250595335662',
    phoneCountry: 'CI',
    createdAt,
  });

  expect(record).toEqual({
    id: 'user_123',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+2250595335662',
    phone_country: 'CI',
    created_at: createdAt,
  });
});

test('persistSignupRecord delegates persistence to a backend endpoint adapter', async () => {
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
      persist: async (body, context) => {
        calls.push({ body, context });
        return { ...body, persisted: true };
      },
      token: 'jwt-token',
    }
  );

  expect(calls.length).toBe(1);
  expect(calls[0].context).toEqual({
    endpoint: SIGNUP_PROFILE_ENDPOINT,
    token: 'jwt-token',
  });
  expect(saved).toEqual({
    id: 'user_456',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    phone: '+2250102030405',
    phone_country: 'CI',
    created_at: '2026-04-21T22:16:00.000Z',
    persisted: true,
  });
});
