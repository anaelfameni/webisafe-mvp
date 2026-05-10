import { expect, test } from 'vitest';

import {
  canUseAgencyBypass,
  getDashboardRedirect,
  getDashboardAccessState,
  getPostLoginPath,
  isAdminUser,
  isAgencyUser,
} from './agencyAccess.js';

test('detects agency and admin users and resolves their post-login path', () => {
  expect(isAgencyUser({ role: 'agence' })).toBe(true);
  expect(isAgencyUser({ plan: 'agency' })).toBe(true);
  expect(isAgencyUser({ email: 'agence@test.com' })).toBe(true);
  expect(isAgencyUser({ role: 'user', email: 'client@test.com' })).toBe(false);
  expect(isAdminUser({ role: 'admin' })).toBe(true);
  expect(getPostLoginPath({ role: 'admin' })).toBe('/admin');
  expect(getPostLoginPath({ role: 'agence' })).toBe('/agence');
  expect(getPostLoginPath({ plan: 'agency' })).toBe('/agence');
  expect(getPostLoginPath({ email: 'agence@test.com' })).toBe('/agence');
  expect(getPostLoginPath({ role: 'user' })).toBe('/dashboard');
});

test('redirects users away from dashboards that do not match their account type', () => {
  expect(getDashboardRedirect({ role: 'admin' }, 'client')).toBe('/admin');
  expect(getDashboardRedirect({ email: 'Agence@Test.com' }, 'client')).toBe('/agence');
  expect(getDashboardRedirect({ email: 'agence@test.com' }, 'client')).toBe('/agence');
  expect(getDashboardRedirect({ plan: 'agency' }, 'client')).toBe('/agence');
  expect(getDashboardRedirect({ role: 'user' }, 'client')).toBe(null);
  expect(getDashboardRedirect({ role: 'user' }, 'agency')).toBe('/dashboard');
  expect(getDashboardRedirect({ role: 'admin' }, 'agency')).toBe('/admin');
  expect(getDashboardRedirect({ role: 'agence' }, 'agency')).toBe(null);
  expect(getDashboardRedirect({ role: 'user' }, 'admin')).toBe('/dashboard');
});

test('resolves dashboard access state without rendering the wrong dashboard while auth loads', () => {
  expect(getDashboardAccessState(null, 'client', { loading: true })).toEqual({ status: 'loading', redirectTo: null });
  expect(getDashboardAccessState(null, 'client', { loading: false })).toEqual({ status: 'unauthenticated', redirectTo: null });
  expect(getDashboardAccessState({ email: 'Agence@Test.com' }, 'client')).toEqual({ status: 'redirect', redirectTo: '/agence' });
  expect(getDashboardAccessState({ plan: 'agency' }, 'agency')).toEqual({ status: 'allowed', redirectTo: null });
  expect(getDashboardAccessState({ email: 'admin@test.com' }, 'client')).toEqual({ status: 'redirect', redirectTo: '/admin' });
  expect(getDashboardAccessState({ email: 'client@test.com', role: 'user' }, 'agency')).toEqual({ status: 'redirect', redirectTo: '/dashboard' });
  expect(getDashboardAccessState({ email: 'client@test.com', role: 'user' }, 'dashboard')).toEqual({ status: 'allowed', redirectTo: null });
});

test('allows agency payment bypass for agency users and the client test account with a scan id', () => {
  expect(canUseAgencyBypass({ role: 'agence' }, 'scan_1')).toBe(true);
  expect(canUseAgencyBypass({ email: 'agence@test.com' }, 'scan_1')).toBe(true);
  expect(canUseAgencyBypass({ email: 'client@test.com', role: 'user' }, 'scan_1')).toBe(true);
  expect(canUseAgencyBypass({ role: 'agence' }, '')).toBe(false);
  expect(canUseAgencyBypass({ role: 'user' }, 'scan_1')).toBe(false);
});
