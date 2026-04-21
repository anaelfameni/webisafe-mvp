import { insertRow } from './supabaseRest.js';

const env = import.meta.env ?? {};

export const SIGNUPS_TABLE = env.VITE_SUPABASE_SIGNUPS_TABLE || 'users';

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
  const insert = options.insert || insertRow;
  const table = options.table || SIGNUPS_TABLE;

  return insert(table, buildSignupRecord(user));
}
