create table if not exists scan_events (
  id uuid default gen_random_uuid() primary key,
  url_hash text not null,
  domain text not null,
  score integer,
  country text default 'CI',
  created_at timestamp with time zone default now()
);

-- Index pour les requêtes fréquentes (feed temps réel)
create index if not exists idx_scan_events_created_at on scan_events(created_at desc);

alter table public.scan_events enable row level security;

-- Enable realtime (Supabase Realtime doit être activé sur cette table)
do $$
begin
  alter publication supabase_realtime add table public.scan_events;
exception
  when duplicate_object then null;
end $$;
