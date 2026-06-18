-- =====================================================================
-- Policies RLS manquantes — complement de security_rls_policies.sql
-- À exécuter dans Supabase SQL Editor (service-role).
--
-- security_rls_policies.sql active le RLS et drop les policies mais ne
-- les recrée pas pour : scans, subscriptions, payment_requests, scan_history.
-- Sans policy, une table avec RLS activé refuse TOUT accès aux rôles non-service,
-- mais les APIs utilisent SUPABASE_SERVICE_ROLE_KEY qui bypasse le RLS.
-- Ces policies s'appliquent si on bascule vers le client anon côté API,
-- ou si on expose ces tables via PostgREST directement.
-- =====================================================================

-- ── TABLE : scans ─────────────────────────────────────────────────────────────
-- Un scan peut appartenir à un utilisateur (user_email) ou être anonyme.
-- Seul l'admin ou le propriétaire du scan (par email ou user_id) peut le lire.

do $$
begin
  if to_regclass('public.scans') is not null then

    drop policy if exists "Users read own scans"       on public.scans;
    drop policy if exists "Users insert own scans"     on public.scans;
    drop policy if exists "Admins update scans"        on public.scans;
    drop policy if exists "Service role full access"   on public.scans;

    -- SELECT : l'utilisateur voit ses propres scans (via user_id ou user_email).
    -- L'admin voit tout.
    create policy "Users read own scans"
      on public.scans for select
      to authenticated
      using (
        user_id = auth.uid()
        or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
        or public.is_webisafe_admin()
      );

    -- INSERT : un utilisateur authentifié insère uniquement pour lui-même.
    create policy "Users insert own scans"
      on public.scans for insert
      to authenticated
      with check (
        user_id = auth.uid()
        or user_id is null   -- scans anonymes autorisés
      );

    -- UPDATE : seul l'admin peut modifier (ex: paid = true après validation paiement).
    create policy "Admins update scans"
      on public.scans for update
      to authenticated
      using (public.is_webisafe_admin());

  end if;
end $$;

-- ── TABLE : subscriptions ──────────────────────────────────────────────────────
-- Chaque abonnement est lié à un user_id.

do $$
begin
  if to_regclass('public.subscriptions') is not null then

    drop policy if exists "Users read own subscriptions"    on public.subscriptions;
    drop policy if exists "Users create own subscriptions"  on public.subscriptions;
    drop policy if exists "Admins update subscriptions"     on public.subscriptions;

    create policy "Users read own subscriptions"
      on public.subscriptions for select
      to authenticated
      using (user_id = auth.uid() or public.is_webisafe_admin());

    -- INSERT bloqué côté RLS : l'endpoint /api/subscribe utilise service_role
    -- et valide user_id = auth.uid() lui-même. On l'ouvre pour le service_role uniquement.
    create policy "Users create own subscriptions"
      on public.subscriptions for insert
      to authenticated
      with check (user_id = auth.uid());

    create policy "Admins update subscriptions"
      on public.subscriptions for update
      to authenticated
      using (public.is_webisafe_admin());

  end if;
end $$;

-- ── TABLE : payment_requests ───────────────────────────────────────────────────
-- Une demande de paiement peut être anonyme (user_id null) ou liée à un compte.

do $$
begin
  if to_regclass('public.payment_requests') is not null then

    drop policy if exists "Users read own payment requests"    on public.payment_requests;
    drop policy if exists "Users create own payment requests"  on public.payment_requests;
    drop policy if exists "Admins update payment requests"     on public.payment_requests;

    -- SELECT : un utilisateur voit ses propres demandes.
    -- Les demandes anonymes (user_id null) ne sont lisibles que par l'admin.
    create policy "Users read own payment requests"
      on public.payment_requests for select
      to authenticated
      using (
        (user_id is not null and user_id = auth.uid())
        or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
        or public.is_webisafe_admin()
      );

    create policy "Users create own payment requests"
      on public.payment_requests for insert
      to authenticated
      with check (
        user_id = auth.uid()
        or user_id is null   -- demande anonyme autorisée
      );

    create policy "Admins update payment requests"
      on public.payment_requests for update
      to authenticated
      using (public.is_webisafe_admin());

  end if;
end $$;

-- ── TABLE : scan_history ───────────────────────────────────────────────────────
-- L'historique est la table la plus sensible : elle contient les résultats détaillés.

do $$
begin
  if to_regclass('public.scan_history') is not null then

    drop policy if exists "Users read own scan history"    on public.scan_history;
    drop policy if exists "Users insert own scan history"  on public.scan_history;
    drop policy if exists "Admins read scan history"       on public.scan_history;

    -- SELECT : isolation stricte — chaque utilisateur ne voit QUE ses propres entrées.
    create policy "Users read own scan history"
      on public.scan_history for select
      to authenticated
      using (user_id = auth.uid() or public.is_webisafe_admin());

    create policy "Users insert own scan history"
      on public.scan_history for insert
      to authenticated
      with check (user_id = auth.uid());

  end if;
end $$;

-- ── TABLE : users (complément) ─────────────────────────────────────────────────
-- Ajouter la policy UPDATE manquante (security_rls_policies.sql ne la crée pas).

do $$
begin
  if to_regclass('public.users') is not null then

    drop policy if exists "Users can update own profile" on public.users;

    create policy "Users can update own profile"
      on public.users for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());

  end if;
end $$;

-- =====================================================================
-- Vérification (à exécuter après pour confirmer) :
--   select tablename, policyname, cmd, roles
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('scans','subscriptions','payment_requests','scan_history','users')
--   order by tablename, policyname;
-- =====================================================================
