-- Legacy schemas used `public.profiles.plan` while the app standardises on `subscription_tier`.
-- 1) Ensure `subscription_tier` exists (idempotent with 20260410200000).
-- 2) Copy values from `plan` when present, using a safe text mapping.
-- 3) Drop `plan` to remove ambiguity for PostgREST and app code.

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

do $$
begin
  alter table public.profiles
    add constraint profiles_subscription_tier_check
    check (subscription_tier in ('none', 'bronze', 'silver', 'gold'));
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_profiles_subscription_tier on public.profiles (subscription_tier);

-- Migrate legacy `plan` → `subscription_tier` (only rows where `plan` is set).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'plan'
  ) then
    update public.profiles
    set subscription_tier = case lower(trim(plan::text))
      when '' then 'none'
      when 'none' then 'none'
      when 'free' then 'none'
      when 'trial' then 'none'
      when 'bronze' then 'bronze'
      when 'basic' then 'bronze'
      when 'copper' then 'bronze'
      when 'silver' then 'silver'
      when 'pro' then 'silver'
      when 'professional' then 'silver'
      when 'gold' then 'gold'
      when 'premium' then 'gold'
      when 'enterprise' then 'gold'
      else 'none'
    end
    where plan is not null;

    alter table public.profiles drop column plan;
  end if;
end $$;

comment on column public.profiles.subscription_tier is 'Subscription level: none | bronze | silver | gold (replaces legacy `plan`).';
