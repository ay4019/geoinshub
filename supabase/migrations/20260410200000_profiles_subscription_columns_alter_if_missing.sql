-- If `public.profiles` already existed before 20260410140000, `create table if not exists`
-- skipped the full definition and `subscription_tier` (and related columns) may be missing.
-- This migration adds them idempotently so PostgREST exposes `subscription_tier`.

alter table public.profiles
  add column if not exists subscription_tier text not null default 'none';

alter table public.profiles
  add column if not exists tier_source text not null default 'manual';

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- Enforce tier values when not already constrained (safe if constraint already exists).
do $$
begin
  alter table public.profiles
    add constraint profiles_subscription_tier_check
    check (subscription_tier in ('none', 'bronze', 'silver', 'gold'));
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_profiles_subscription_tier on public.profiles (subscription_tier);
