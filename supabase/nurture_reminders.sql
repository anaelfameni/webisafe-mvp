-- ─────────────────────────────────────────────────────────────────────────────
-- Table nurture_reminders (I.2)
--
-- Stocke les demandes "Me rappeler dans 24h" déclenchées depuis le FreemiumGate
-- d'un rapport gratuit. Un job programmé (Vercel cron / Supabase Edge Function)
-- doit consommer cette file 1×/h et déclencher un email de relance.
--
-- À exécuter dans Supabase → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.nurture_reminders (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  url          text,
  scan_id      uuid,
  source       text not null default 'freemium_gate', -- freemium_gate | post_scan | paywall
  scheduled_at timestamptz not null,
  sent_at      timestamptz,
  status       text not null default 'pending'        -- pending | sent | failed | cancelled
    check (status in ('pending','sent','failed','cancelled')),
  user_agent   text,
  ip_hash      text,
  created_at   timestamptz not null default now()
);

-- Index pour le worker qui lit la file
create index if not exists nurture_reminders_pending_idx
  on public.nurture_reminders (status, scheduled_at)
  where status = 'pending';

-- Index pour éviter les doublons par email récents
create index if not exists nurture_reminders_email_recent_idx
  on public.nurture_reminders (email, created_at desc);

-- RLS verrouillée — seul service_role peut écrire/lire
alter table public.nurture_reminders enable row level security;

-- Aucune policy publique : accès uniquement via service_role.
