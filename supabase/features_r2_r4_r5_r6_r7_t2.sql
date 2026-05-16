-- =====================================================================
-- Migration : fonctionnalités avancées Webisafe (R.2, R.4, R.5, R.6, R.7, T.2)
-- =====================================================================
-- Cette migration crée toutes les tables nécessaires pour :
--   - R.2 : partage public de rapport via lien tokenisé
--   - R.4 : replay J+30 (rescan gratuit 30 jours après l'audit premium)
--   - R.5 : système de tickets support nominatifs
--   - R.6 : push notifications web (subscriptions)
--   - R.7 : notes/commentaires internes agence (B2B)
--   - T.2 : branding agence persistant (logo, couleur, signature, footer)
--
-- ATTENTION : à exécuter via Supabase SQL Editor (service-role).
-- Les policies RLS utilisent la fonction `is_webisafe_admin()` déjà créée
-- par `security_rls_policies.sql`. Si elle n'existe pas, exécutez d'abord ce fichier.
-- =====================================================================

-- ---------------------------------------------------------------------
-- R.2 — Partages de rapport via lien tokenisé
-- ---------------------------------------------------------------------
create table if not exists public.report_shares (
  token text primary key,
  scan_id text not null,
  owner_user_id uuid references auth.users(id) on delete cascade,
  owner_email text,
  expires_at timestamptz,                          -- null = sans expiration
  password_hash text,                              -- optionnel (sha-256 hex)
  views_count integer not null default 0,
  last_viewed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists report_shares_scan_idx on public.report_shares(scan_id);
create index if not exists report_shares_owner_idx on public.report_shares(owner_user_id);
create index if not exists report_shares_expires_idx on public.report_shares(expires_at);

alter table public.report_shares enable row level security;

do $$
begin
  drop policy if exists "Owners can read their shares" on public.report_shares;
  create policy "Owners can read their shares"
    on public.report_shares for select
    to authenticated
    using (owner_user_id = auth.uid() or public.is_webisafe_admin());

  drop policy if exists "Owners can create shares" on public.report_shares;
  create policy "Owners can create shares"
    on public.report_shares for insert
    to authenticated
    with check (owner_user_id = auth.uid());

  drop policy if exists "Owners can revoke their shares" on public.report_shares;
  create policy "Owners can revoke their shares"
    on public.report_shares for update
    to authenticated
    using (owner_user_id = auth.uid() or public.is_webisafe_admin());
end $$;

-- ---------------------------------------------------------------------
-- R.4 — Replay J+30 : champs sur public.scans + audit log
-- ---------------------------------------------------------------------
alter table if exists public.scans
  add column if not exists replay_eligible_at timestamptz,
  add column if not exists replay_used_at timestamptz,
  add column if not exists replay_reminder_sent_at timestamptz,
  add column if not exists replay_parent_scan_id text;

create index if not exists scans_replay_eligible_idx on public.scans(replay_eligible_at)
  where replay_used_at is null and replay_reminder_sent_at is null;

-- ---------------------------------------------------------------------
-- R.5 — Tickets de support nominatifs
-- ---------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open','in_progress','waiting_user','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  category text,                                   -- ex: 'payment', 'scan', 'protect', 'agency', 'other'
  scan_id text,
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_to_email text,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on public.support_tickets(user_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_priority_idx on public.support_tickets(priority);
create index if not exists support_tickets_created_idx on public.support_tickets(created_at desc);
create index if not exists support_tickets_assigned_idx on public.support_tickets(assigned_to);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_type text not null check (sender_type in ('user','agent','system')),
  sender_id uuid references auth.users(id) on delete set null,
  sender_email text,
  body text not null,
  internal_note boolean not null default false,    -- true = note interne agent uniquement
  created_at timestamptz not null default now()
);

create index if not exists ticket_messages_ticket_idx on public.ticket_messages(ticket_id, created_at);
create index if not exists ticket_messages_sender_idx on public.ticket_messages(sender_id);

alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;

do $$
begin
  drop policy if exists "Users read own tickets" on public.support_tickets;
  create policy "Users read own tickets"
    on public.support_tickets for select
    to authenticated
    using (user_id = auth.uid() or public.is_webisafe_admin());

  drop policy if exists "Users create own tickets" on public.support_tickets;
  create policy "Users create own tickets"
    on public.support_tickets for insert
    to authenticated
    with check (user_id = auth.uid());

  drop policy if exists "Admins update tickets" on public.support_tickets;
  create policy "Admins update tickets"
    on public.support_tickets for update
    to authenticated
    using (public.is_webisafe_admin());

  drop policy if exists "Users read own ticket messages" on public.ticket_messages;
  create policy "Users read own ticket messages"
    on public.ticket_messages for select
    to authenticated
    using (
      internal_note = false and exists (
        select 1 from public.support_tickets t
        where t.id = ticket_messages.ticket_id
          and (t.user_id = auth.uid() or public.is_webisafe_admin())
      )
      or public.is_webisafe_admin()
    );

  drop policy if exists "Users post own ticket messages" on public.ticket_messages;
  create policy "Users post own ticket messages"
    on public.ticket_messages for insert
    to authenticated
    with check (
      internal_note = false and exists (
        select 1 from public.support_tickets t
        where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()
      )
      or public.is_webisafe_admin()
    );
end $$;

-- ---------------------------------------------------------------------
-- R.6 — Push notifications web
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  scope text not null default 'general' check (scope in ('general','protect','tickets','marketing')),
  active boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists push_subscriptions_scope_idx on public.push_subscriptions(scope, active);

alter table public.push_subscriptions enable row level security;

do $$
begin
  drop policy if exists "Users manage own push subs" on public.push_subscriptions;
  create policy "Users manage own push subs"
    on public.push_subscriptions for all
    to authenticated
    using (user_id = auth.uid() or public.is_webisafe_admin())
    with check (user_id = auth.uid() or public.is_webisafe_admin());
end $$;

-- ---------------------------------------------------------------------
-- R.7 — Notes/commentaires internes (agence ou admin sur un client)
-- ---------------------------------------------------------------------
create table if not exists public.agency_client_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_email text,
  target_user_id uuid references auth.users(id) on delete set null,
  target_email text,
  scan_id text,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agency_notes_author_idx on public.agency_client_notes(author_id);
create index if not exists agency_notes_target_idx on public.agency_client_notes(target_user_id);
create index if not exists agency_notes_scan_idx on public.agency_client_notes(scan_id);
create index if not exists agency_notes_created_idx on public.agency_client_notes(created_at desc);

alter table public.agency_client_notes enable row level security;

-- Helper : un utilisateur peut accéder aux notes s'il est agence/admin
create or replace function public.is_agency_or_admin() returns boolean
language sql stable as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.role = 'admin' or u.role = 'agence' or u.plan = 'agency')
  );
$$;

do $$
begin
  drop policy if exists "Agency/admin manage notes" on public.agency_client_notes;
  create policy "Agency/admin manage notes"
    on public.agency_client_notes for all
    to authenticated
    using (public.is_agency_or_admin() and author_id = auth.uid() or public.is_webisafe_admin())
    with check (public.is_agency_or_admin() and author_id = auth.uid());
end $$;

-- ---------------------------------------------------------------------
-- T.2 — Branding agence persistant (logo, couleur, footer, signature)
-- ---------------------------------------------------------------------
create table if not exists public.agency_branding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  agency_name text,
  agency_email text,
  agency_phone text,
  agency_website text,
  logo_url text,                                    -- URL d'un logo hébergé (Supabase Storage ou externe)
  primary_color text default '#1566F0',             -- couleur hex pour entêtes/accent PDF
  footer_text text,                                 -- ex: "Audit réalisé par Agence XYZ – Tous droits réservés"
  signature text,                                   -- texte de signature en fin de rapport
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.agency_branding enable row level security;

do $$
begin
  drop policy if exists "Agency manage own branding" on public.agency_branding;
  create policy "Agency manage own branding"
    on public.agency_branding for all
    to authenticated
    using (user_id = auth.uid() or public.is_webisafe_admin())
    with check (user_id = auth.uid() or public.is_webisafe_admin());
end $$;

-- ---------------------------------------------------------------------
-- Trigger : updated_at automatique pour tickets, notes, branding
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_tickets_touch on public.support_tickets;
create trigger support_tickets_touch
  before update on public.support_tickets
  for each row execute function public.touch_updated_at();

drop trigger if exists agency_notes_touch on public.agency_client_notes;
create trigger agency_notes_touch
  before update on public.agency_client_notes
  for each row execute function public.touch_updated_at();

drop trigger if exists agency_branding_touch on public.agency_branding;
create trigger agency_branding_touch
  before update on public.agency_branding
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Fin de la migration.
-- =====================================================================
