import { createClient } from '@supabase/supabase-js';

const supabaseUrl    = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('[DB] SUPABASE_URL manquante dans .env');
}
if (!serviceRoleKey) {
  throw new Error('[DB] SUPABASE_SERVICE_ROLE_KEY manquante dans .env');
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

console.log('[DB] Supabase connecte — service_role OK (bypass RLS)');
