import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
  AGENCY_SETTINGS_DEFAULTS,
  loadAgencySettings,
  normalizeAgencySettings,
  saveAgencySettings,
} from './agencySettings.js';

const storage = new Map();

beforeEach(() => {
  storage.clear();

  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key) => storage.get(key) ?? null),
    setItem: vi.fn((key, value) => storage.set(key, String(value))),
    removeItem: vi.fn((key) => storage.delete(key)),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('normalizeAgencySettings applies defaults and rejects invalid colors', () => {
  const settings = normalizeAgencySettings({
    agency_name: 'Agence Demo',
    primary_color: 'bad',
  });

  expect(settings).toEqual({
    ...AGENCY_SETTINGS_DEFAULTS,
    agency_name: 'Agence Demo',
    primary_color: '#1566F0',
  });
});

test('loadAgencySettings uses localStorage fallback when fetch throws', async () => {
  const user = { email: 'agence@test.com' };
  const stored = {
    agency_name: 'Agence locale',
    primary_color: '#FFAA00',
  };

  localStorage.setItem('webisafe.agencySettings.agence@test.com', JSON.stringify(stored));
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('offline');
  }));

  const settings = await loadAgencySettings(user);

  expect(settings).toMatchObject({
    agency_name: 'Agence locale',
    primary_color: '#FFAA00',
  });
});

test('saveAgencySettings posts to agency endpoint and stores fallback', async () => {
  const user = { email: 'agence@test.com' };
  const input = {
    agency_name: 'Agence API',
    footer_text: 'Rapport préparé par Agence API.',
  };
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ settings: { ...input, primary_color: '#00AAFF' } }),
  }));
  vi.stubGlobal('fetch', fetchMock);

  const saved = await saveAgencySettings(user, input);

  expect(fetchMock).toHaveBeenCalledWith('/api/agency-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizeAgencySettings(input)),
  });
  expect(saved).toMatchObject({
    agency_name: 'Agence API',
    primary_color: '#00AAFF',
  });
  expect(JSON.parse(localStorage.getItem('webisafe.agencySettings.agence@test.com'))).toMatchObject(saved);
});

test('saveAgencySettings sends authorization token when provided', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ settings: { agency_name: 'Agence JWT' } }),
  }));
  vi.stubGlobal('fetch', fetchMock);

  await saveAgencySettings({ email: 'agence@test.com' }, { agency_name: 'Agence JWT' }, { token: 'jwt-token' });

  expect(fetchMock).toHaveBeenCalledWith('/api/agency-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt-token' },
    body: JSON.stringify(normalizeAgencySettings({ agency_name: 'Agence JWT' })),
  });
});
