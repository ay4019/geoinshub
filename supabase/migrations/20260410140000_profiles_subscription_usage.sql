-- Subscription tiers, daily usage, and tier-gated inserts for projects/boreholes/tool data.
-- Run after core tables exist. Backfills existing auth users as bronze; new signups get tier `none` via trigger.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  subscription_tier text not null default 'none'
    check (subscription_tier in ('none', 'bronze', 'silver', 'gold')),
  tier_source text not null default 'manual',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_subscription_tier on public.profiles (subscription_tier);

comment on table public.profiles is 'Per-user subscription tier and admin flag; tier changes for customers via Stripe webhook or manual admin.';
comment on column public.profiles.subscription_tier is 'none = no cloud projects; bronze/silver/gold = paid tiers.';
comment on column public.profiles.tier_source is 'signup | legacy | manual | stripe — informational';

-- Existing users before this migration: treat as bronze so they are not locked out.
insert into public.profiles (id, subscription_tier, tier_source)
select id, 'bronze', 'legacy'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- New signups: start as none (upgrade via admin or payment).
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, subscription_tier, tier_source)
  values (new.id, 'none', 'signup')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_profile();

-- ---------------------------------------------------------------------------
-- Daily usage (reports, AI) — calendar day in Europe/Istanbul evaluated in app when incrementing
-- ---------------------------------------------------------------------------
create table if not exists public.usage_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  reports_generated int not null default 0,
  ai_analyses int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create index if not exists idx_usage_daily_user_date on public.usage_daily (user_id, usage_date desc);

-- ---------------------------------------------------------------------------
-- RLS: profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create or replace function public.is_subscription_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_subscription_admin());

-- No client-side tier self-service in v1: no insert/update/delete for regular users.
-- Tier updates use service role (admin server action) or SQL.

-- ---------------------------------------------------------------------------
-- RLS: usage_daily
-- ---------------------------------------------------------------------------
alter table public.usage_daily enable row level security;

drop policy if exists "usage_daily_select_own" on public.usage_daily;
create policy "usage_daily_select_own" on public.usage_daily
  for select using (user_id = auth.uid() or public.is_subscription_admin());

drop policy if exists "usage_daily_insert_own" on public.usage_daily;
create policy "usage_daily_insert_own" on public.usage_daily
  for insert with check (user_id = auth.uid());

drop policy if exists "usage_daily_update_own" on public.usage_daily;
create policy "usage_daily_update_own" on public.usage_daily
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Tier gates: inserts only when not `none`
-- ---------------------------------------------------------------------------
drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.subscription_tier <> 'none'
    )
  );

drop policy if exists "boreholes_insert_own" on public.boreholes;
create policy "boreholes_insert_own" on public.boreholes
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.subscription_tier <> 'none'
    )
  );

drop policy if exists "tool_results_insert_own" on public.tool_results;
create policy "tool_results_insert_own" on public.tool_results
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.subscription_tier <> 'none'
    )
  );

drop policy if exists "project_parameters_insert_own" on public.project_parameters;
create policy "project_parameters_insert_own" on public.project_parameters
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.subscription_tier <> 'none'
    )
  );

-- Grant yourself admin (replace with your auth user UUID from Supabase Dashboard → Authentication):
-- update public.profiles set is_admin = true where id = 'YOUR-USER-UUID';
