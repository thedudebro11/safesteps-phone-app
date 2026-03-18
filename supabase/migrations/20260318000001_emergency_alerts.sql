-- Migration: emergency_alerts
-- Records every emergency alert invocation, including deduplicated ones.
-- Serves two purposes:
--   1. Deduplication: prevent re-sending within a 90-second window.
--   2. Observability: track send attempts, recipient counts, and dedup events.
--
-- Run this against your Supabase project via the SQL editor or Supabase CLI.

create table if not exists public.emergency_alerts (
  id              uuid        primary key default gen_random_uuid(),
  sender_user_id  uuid        not null references auth.users(id) on delete cascade,
  triggered_at    timestamptz not null default now(),
  recipient_count int         not null default 0,
  deduped         boolean     not null default false
);

-- Optimised for the dedup check: sender + recent timestamp descending.
-- Query: WHERE sender_user_id = $id AND deduped = false AND triggered_at > $cutoff
create index if not exists emergency_alerts_sender_triggered_idx
  on public.emergency_alerts (sender_user_id, triggered_at desc);

-- RLS: enable for defence in depth.
-- The backend uses the service-role key (supabaseAdmin) which bypasses RLS.
-- No client access policies are defined — this table is backend-only.
alter table public.emergency_alerts enable row level security;
