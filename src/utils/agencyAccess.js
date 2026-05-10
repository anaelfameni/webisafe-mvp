function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

export function isAgencyUser(user) {
  return normalizeValue(user?.role) === 'agence' || normalizeValue(user?.plan) === 'agency' || normalizeEmail(user?.email) === 'agence@test.com';
}

export function isAdminUser(user) {
  return normalizeValue(user?.role) === 'admin' || normalizeEmail(user?.email) === 'admin@test.com';
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
  return (isAgencyUser(user) || normalizeEmail(user?.email) === 'client@test.com') && Boolean(scanId);
}
