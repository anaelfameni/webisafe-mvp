export const ADMIN_EMAIL = 'admin@test.com';
export const ADMIN_PASSWORD = '123admin123';

export function isAdminCredentials(email, password) {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function buildAdminUser() {
  return {
    id: 'admin_user',
    name: 'Admin Webisafe',
    email: ADMIN_EMAIL,
    role: 'admin',
    plan: 'admin',
    createdAt: new Date().toISOString(),
  };
}
