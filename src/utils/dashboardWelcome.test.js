import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldShowDashboardWelcome } from './dashboardWelcome.js';

test('shouldShowDashboardWelcome returns true only for signup welcome state', () => {
  assert.equal(shouldShowDashboardWelcome({ welcomeNewAccount: true }), true);
  assert.equal(shouldShowDashboardWelcome({ welcomeNewAccount: false }), false);
  assert.equal(shouldShowDashboardWelcome(null), false);
});
