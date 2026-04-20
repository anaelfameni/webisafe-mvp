import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COUNTRY_DIAL_CODES,
  DEFAULT_PHONE_COUNTRY,
  buildInternationalPhone,
  findCountryByCode,
  getFlagImageUrl,
  normalizePhoneDigits,
} from './phoneCountries.js';

test('exposes a comprehensive country list and a default selection', () => {
  assert.ok(COUNTRY_DIAL_CODES.length >= 190);
  assert.equal(DEFAULT_PHONE_COUNTRY, 'CI');
  assert.deepEqual(findCountryByCode('CI'), {
    code: 'CI',
    name: "Côte d’Ivoire",
    dialCode: '+225',
  });
  assert.deepEqual(findCountryByCode('FR'), {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
  });
  assert.deepEqual(findCountryByCode('US'), {
    code: 'US',
    name: 'États-Unis',
    dialCode: '+1',
  });
});

test('normalizes local phone digits and builds an international number', () => {
  assert.equal(normalizePhoneDigits('07 00-00-00 00'), '0700000000');
  assert.equal(buildInternationalPhone('CI', '07 00 00 00 00'), '+2250700000000');
  assert.equal(buildInternationalPhone('FR', '06 12 34 56 78'), '+330612345678');
});

test('builds flag image urls from ISO country codes', () => {
  assert.equal(getFlagImageUrl('CI'), 'https://flagcdn.com/w40/ci.png');
  assert.equal(getFlagImageUrl('FR'), 'https://flagcdn.com/w40/fr.png');
  assert.equal(getFlagImageUrl('US'), 'https://flagcdn.com/w40/us.png');
  assert.equal(getFlagImageUrl(''), '');
});

test('keeps countries sorted from A to Z by display name', () => {
  const countryNames = COUNTRY_DIAL_CODES.map((country) => country.name);
  const sortedNames = [...countryNames].sort((a, b) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  );

  assert.deepEqual(countryNames, sortedNames);
});
