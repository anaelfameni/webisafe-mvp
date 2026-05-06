create or replace function public.is_webisafe_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_webisafe_admin() from public;
grant execute on function public.is_webisafe_admin() to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users',
    'scans',
    'payment_requests',
    'subscriptions',
    'scan_history',
    'contact_messages',
    'correction_requests',
    'scan_events',
    'scan_analytics'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.users') is not null then
    drop policy if exists "Users can read own profile" on public.users;
    drop policy if exists "Users can update own profile" on public.users;
    drop policy if exists "Admins can read users" on public.users;

    create policy "Users can read own profile"
      on public.users
      for select
      to authenticated
      using (id = auth.uid() or public.is_webisafe_admin());
  end if;

  if to_regclass('public.scans') is not null then
    drop policy if exists "Users can read own scans" on public.scans;
    drop policy if exists "Users can insert own scans" on public.scans;
    drop policy if exists "Admins can update scans" on public.scans;
  end if;

  if to_regclass('public.payment_requests') is not null then
    drop policy if exists "Users can read own payment requests" on public.payment_requests;
    drop policy if exists "Users can create own payment requests" on public.payment_requests;
    drop policy if exists "Admins can update payment requests" on public.payment_requests;
  end if;

  if to_regclass('public.subscriptions') is not null then
    drop policy if exists "Users can read own subscriptions" on public.subscriptions;
    drop policy if exists "Users can create own subscriptions" on public.subscriptions;
    drop policy if exists "Admins can update subscriptions" on public.subscriptions;
  end if;

  if to_regclass('public.scan_history') is not null then
    drop policy if exists "Users can read own scan history" on public.scan_history;
  end if;

  if to_regclass('public.contact_messages') is not null then
    drop policy if exists "Admins can read contact messages" on public.contact_messages;
    drop policy if exists "Anyone can create contact messages" on public.contact_messages;
  end if;

  if to_regclass('public.correction_requests') is not null then
    drop policy if exists "Admins can manage correction requests" on public.correction_requests;
    drop policy if exists "Authenticated users can create correction requests" on public.correction_requests;
  end if;

  if to_regclass('public.scan_events') is not null then
    drop policy if exists "Public can read anonymized scan events" on public.scan_events;
    drop policy if exists "Service role can insert scan events" on public.scan_events;
  end if;

  if to_regclass('public.scan_analytics') is not null then
    drop policy if exists "Allow public read on scan_analytics" on public.scan_analytics;
    drop policy if exists "Allow service role insert on scan_analytics" on public.scan_analytics;
  end if;
end $$;
