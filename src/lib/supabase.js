// server/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;

// Accepte service_role (backend) ou anon key (fallback)
const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    null;

// Ne fait plus throw → retourne null si non configuré
// (le scanController gère le cas supabase = null)
export const supabase =
    supabaseUrl && serviceRoleKey
        ? createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false },
        })
        : null;

if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
        '[DB] ⚠️ Supabase non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes) — cache + sauvegarde désactivés'
    );
} else {
    console.log('[DB] Supabase connecté ✅');
}