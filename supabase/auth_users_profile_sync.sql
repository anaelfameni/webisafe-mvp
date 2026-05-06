-- Synchronise les comptes Supabase Auth vers public.users sans stocker de mot de passe.
-- À exécuter dans Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  phone text,
  phone_country text,
  plan text not null default 'free',
  scans_today integer not null default 0,
  last_scan_date text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users drop column if exists password;

create or replace function public.handle_auth_user_profile_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    name,
    phone,
    phone_country,
    plan,
    role,
    created_at,
    updated_at
  ) values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'phoneCountry', new.raw_user_meta_data->>'phone_country'),
    coalesce(new.raw_user_meta_data->>'plan', 'free'),
    'user',
    new.created_at,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.users.name),
    phone = coalesce(excluded.phone, public.users.phone),
    phone_country = coalesce(excluded.phone_country, public.users.phone_country),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;

create trigger on_auth_user_profile_sync
after insert or update on auth.users
for each row execute function public.handle_auth_user_profile_sync();
