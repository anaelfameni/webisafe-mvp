import { describe, expect, it } from 'vitest';
import { buildPasswordResetEmail, buildRedirectTo } from './forgot-password.js';

describe('forgot-password email helpers', () => {
  it('builds the Supabase Auth redirect URL from the current origin', () => {
    const url = buildRedirectTo('https://app.webisafe.vercel.app/');

    expect(url).toBe('https://app.webisafe.vercel.app/reinitialiser-mot-de-passe');
  });

  it('builds the email sent to customers with the reset link', () => {
    const email = buildPasswordResetEmail('https://supabase.example/auth/v1/verify?token=abc&type=recovery&redirect_to=https%3A%2F%2Fwebisafe.vercel.app%2Freinitialiser-mot-de-passe');

    expect(email.subject).toBe('Réinitialisation de votre mot de passe Webisafe');
    expect(email.html).toContain('Réinitialisation de mot de passe');
    expect(email.html).toContain('Réinitialiser mon mot de passe');
    expect(email.html).toContain('https://supabase.example/auth/v1/verify?token=abc&type=recovery&redirect_to=https%3A%2F%2Fwebisafe.vercel.app%2Freinitialiser-mot-de-passe');
    expect(email.html).toContain('Ce lien expirera dans 1 heure');
  });
});
