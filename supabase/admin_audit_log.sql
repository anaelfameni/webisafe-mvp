-- U.2 — Audit log des actions admin
-- Conserve une trace immuable de chaque action sensible (validation paiement,
-- rejet d'abonnement, modification de scan, etc.) avec acteur, cible et payload.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,                 -- ex: payment.confirm, subscription.reject
  target_type text,                     -- ex: payment_request, subscription, user
  target_id text,                       -- id de la ressource ciblée (uuid ou string)
  metadata jsonb default '{}'::jsonb,   -- payload arbitraire (raison, montant…)
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_actor_idx on public.admin_audit_log(actor_id);
create index if not exists admin_audit_log_action_idx on public.admin_audit_log(action);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log(target_type, target_id);

-- RLS : seuls les admins peuvent lire le log via l'API admin (service-role bypass).
alter table public.admin_audit_log enable row level security;

do $$
begin
  drop policy if exists "Admins can read audit log" on public.admin_audit_log;
  create policy "Admins can read audit log"
    on public.admin_audit_log
    for select
    to authenticated
    using (public.is_webisafe_admin());
end $$;

-- Pas de policy d'écriture publique : les écritures se font via service-role
-- depuis api_shared/_utils.js (logAdminAction).
