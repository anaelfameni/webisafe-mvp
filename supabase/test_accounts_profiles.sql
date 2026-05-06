insert into public.users (id, email, name, plan, role, created_at, updated_at)
select
  id,
  lower(email),
  coalesce(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', email),
  'free',
  'user',
  created_at,
  now()
from auth.users
where lower(email) in ('admin@test.com', 'client@test.com')
on conflict (id) do update set
  email = excluded.email,
  name = coalesce(public.users.name, excluded.name),
  updated_at = now();

update public.users
set role = 'admin', plan = 'admin', updated_at = now()
where lower(email) = 'admin@test.com';

update public.users
set role = 'user', plan = coalesce(nullif(plan, ''), 'free'), updated_at = now()
where lower(email) = 'client@test.com';
