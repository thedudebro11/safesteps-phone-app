-- Migration: push_tokens
-- Stores Expo push tokens for authenticated users.
-- Run this against your Supabase project via the SQL editor or Supabase CLI.
--
-- One row per (user, token) pair. A user may have tokens from multiple devices.
-- Upsert on conflict updates updated_at, keeping tokens fresh without duplicates.

create table if not exists public.push_tokens (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  expo_push_token  text        not null,
  platform         text        not null check (platform in ('ios', 'android')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (user_id, expo_push_token)
);

-- Fast lookup of all tokens belonging to a given user (used when sending alerts)
create index if not exists push_tokens_user_id_idx
  on public.push_tokens (user_id);

-- RLS: enable for defence in depth.
-- The backend uses the service-role key (supabaseAdmin) which bypasses RLS,
-- so these policies govern any direct client access only.
alter table public.push_tokens enable row level security;

