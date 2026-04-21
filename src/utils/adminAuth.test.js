import test from 'node:test';
import assert from 'node:assert/strict';

import { ADMIN_EMAIL, ADMIN_PASSWORD, buildAdminUser, isAdminCredentials } from './adminAuth.js';

test('recognizes the configured admin credentials', () => {
  assert.equal(isAdminCredentials(ADMIN_EMAIL, ADMIN_PASSWORD), true);
  assert.equal(isAdminCredentials('wrong@test.com', ADMIN_PASSWORD), false);
  assert.equal(isAdminCredentials(ADMIN_EMAIL, 'wrong-pass'), false);
});

test('builds an admin user payload with admin role', () => {
  const user = buildAdminUser();

  assert.equal(user.email, ADMIN_EMAIL);
  assert.equal(user.role, 'admin');
  assert.equal(user.plan, 'admin');
});
