// agencyAccess.js
//
// H.1/H.2/H.3 — Les rôles "agence" et "admin" sont déterminés par le rôle
// retourné par l'API serveur (table public.users.role) et non par des emails
// codés en dur. Aucun bypass via email de test ne doit subsister en production.
//
// Le feature flag VITE_ENABLE_TEST_BYPASS active les bypass d'emails de test
// uniquement en environnement de développement local et n'a aucun effet en prod.

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

const TEST_BYPASS_ENABLED =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true &&
  String(import.meta.env.VITE_ENABLE_TEST_BYPASS).toLowerCase() === 'true';

// Identité admin : la table profiles ne possède pas de colonne role.
// L'admin est défini par son email (admin@test.com par défaut, ou VITE_ADMIN_EMAILS).
// Côté serveur, ce même email est vérifié via le JWT Supabase (non falsifiable).
const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || 'admin@test.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

export function isAgencyUser(user) {
  if (normalizeValue(user?.role) === 'agence' || normalizeValue(user?.plan) === 'agency') return true;
  if (TEST_BYPASS_ENABLED && normalizeEmail(user?.email) === 'agence@test.com') return true;
  return false;
}

export function isAdminUser(user) {
  if (normalizeValue(user?.role) === 'admin') return true;
  if (isAdminEmail(user?.email)) return true;
  return false;
}

export function getPostLoginPath(user) {
  if (isAdminUser(user)) return '/admin';
  if (isAgencyUser(user)) return '/agence';
  return '/dashboard';
}

export function getDashboardRedirect(user, dashboardType) {
  if (!user) return null;
  const expectedPath = getPostLoginPath(user);
  const currentPath = dashboardType === 'admin' ? '/admin' : dashboardType === 'agency' ? '/agence' : '/dashboard';
  return expectedPath === currentPath ? null : expectedPath;
}

export function getDashboardAccessState(user, dashboardType, options = {}) {
  if (!user) {
    return options.loading
      ? { status: 'loading', redirectTo: null }
      : { status: 'unauthenticated', redirectTo: null };
  }

  const redirectTo = getDashboardRedirect(user, dashboardType);
  if (redirectTo) return { status: 'redirect', redirectTo };
  return { status: 'allowed', redirectTo: null };
}

export function canUseAgencyBypass(user, scanId) {
  // Le bypass agence est légitime : un compte agence peut consulter n'importe
  // quel rapport via son rôle.
  // Le bypass test 'client@test.com' n'est actif qu'en DEV avec le flag explicite.
  if (isAgencyUser(user) && Boolean(scanId)) return true;
  if (TEST_BYPASS_ENABLED && normalizeEmail(user?.email) === 'client@test.com' && Boolean(scanId)) return true;
  return false;
}
