-- ─────────────────────────────────────────────────────────────────────────────
-- Table contact_messages
-- À exécuter dans Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text,
  message     text not null,
  created_at  timestamptz not null default now(),
  read        boolean not null default false
);

-- Index pour tri chronologique rapide
create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

-- RLS : on verrouille totalement. Seul le service_role (utilisé côté serveur)
-- peut lire/écrire. Les utilisateurs anon NE PEUVENT RIEN faire directement.
alter table public.contact_messages enable row level security;

-- Aucune policy pour anon/authenticated = accès interdit via l'API publique.
-- Le service_role bypass automatiquement RLS.
