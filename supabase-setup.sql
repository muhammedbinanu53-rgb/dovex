-- Run this in the Supabase SQL Editor for a new DoveX deployment.
-- This starts with empty cloud data; it does not import your local database.

create table if not exists public.dovex_state (
  id text primary key check (id = 'dovex'),
  data jsonb not null default '{"users":[],"products":[],"orders":[],"reactivationRequests":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.dovex_state enable row level security;

-- The backend accesses this table only with its private Supabase service role key.
-- Do not create public/anon policies for this table.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
