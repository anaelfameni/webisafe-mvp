-- ─────────────────────────────────────────────────────────────────────────────
-- Table scan_analytics
-- Dataset anonymisé pour le MOAT (benchmark africain, stats publiques, data network effects)
-- À exécuter dans Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.scan_analytics (
  id           uuid primary key default gen_random_uuid(),
  domain       text not null,
  country_code text not null default 'CI',
  score_security   integer,
  score_performance integer,
  score_seo        integer,
  score_ux         integer,
  score_global     integer,
  cms_detected     text,
  hosting_detected text,
  ssl_valid        boolean,
  has_wordpress    boolean default false,
  load_time_ms     integer,
  scanned_at       timestamptz not null default now(),
  is_public        boolean not null default true
);

-- Index pour les requêtes agrégées rapides
create index if not exists idx_scan_analytics_country
  on public.scan_analytics (country_code);

create index if not exists idx_scan_analytics_scanned_at
  on public.scan_analytics (scanned_at desc);

create index if not exists idx_scan_analytics_score_global
  on public.scan_analytics (score_global);

-- RLS : lecture publique pour les stats agrégées
alter table public.scan_analytics enable row level security;

-- Politique : tout le monde peut lire les scans publics
-- (utile pour l'endpoint /api/stats qui fait des COUNT/AVG)
create policy if not exists "Allow public read on scan_analytics"
  on public.scan_analytics
  for select
  to anon, authenticated
  using (is_public = true);

-- Politique : insertion seulement par service_role (backend)
create policy if not exists "Allow service role insert on scan_analytics"
  on public.scan_analytics
  for insert
  to service_role
  with check (true);
