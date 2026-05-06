export const SIGNUP_PROFILE_ENDPOINT = '/api/profile';

export function buildSignupRecord(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    phone_country: user.phoneCountry,
    created_at: user.createdAt,
  };
}

export async function persistSignupRecord(user, options = {}) {
  const persist = options.persist;

  if (typeof persist !== 'function') {
    throw new Error('Signup persistence must be handled by an authenticated backend endpoint');
  }

  return persist(buildSignupRecord(user), {
    endpoint: options.endpoint || SIGNUP_PROFILE_ENDPOINT,
    token: options.token,
  });
}
