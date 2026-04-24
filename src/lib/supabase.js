// server/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Option 1 (recommandé): ne pas crasher l'API si Supabase n'est pas configuré.
// On désactive juste cache + sauvegarde.
export const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('[DB] ⚠️ Supabase non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes) — cache + sauvegarde désactivés');
} else {
  console.log('[DB] Supabase connecté — service_role ✅ (bypass RLS)');
}