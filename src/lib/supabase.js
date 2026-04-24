// server/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// On force la service_role. Pas de fallback anon (sinon RLS revient)
if (!supabaseUrl) {
    throw new Error('[DB] SUPABASE_URL manquante dans .env');
}
if (!serviceRoleKey) {
    throw new Error('[DB] SUPABASE_SERVICE_ROLE_KEY manquante dans .env (clé service_role requise côté backend)');
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
});

console.log('[DB] Supabase connecté — service_role ✅ (bypass RLS)');x