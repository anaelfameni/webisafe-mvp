// Stub Supabase — cache désactivé si pas de config
// Pour activer : npm install @supabase/supabase-js et renseigner .env

const noopClient = {
  from: () => ({
    select: () => ({ eq: () => ({ gt: () => ({ order: () => ({ limit: () => ({ single: () => ({ data: null, error: null }) }) }) }) }) }),
    insert: () => ({ select: () => ({ single: () => ({ data: { id: 'local-' + Date.now() }, error: null }) }) }),
  }),
};

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

let supabase = noopClient;

if (url && key) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(url, key);
    console.log('[DB] Supabase connecté');
  } catch {
    console.warn('[DB] @supabase/supabase-js non installé — cache désactivé');
  }
} else {
  console.warn('[DB] SUPABASE_URL/KEY manquantes — cache désactivé');
}

export { supabase };