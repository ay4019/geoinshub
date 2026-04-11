-- Weekly quota for Integrated Parameter Matrix AI reports (Gold; admins exempt in app logic).
create table if not exists public.usage_weekly_matrix_ai (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  report_generations int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists idx_usage_wmatrix_user_week on public.usage_weekly_matrix_ai (user_id, week_start desc);

comment on table public.usage_weekly_matrix_ai is 'Counts matrix AI report generations per ISO week (Europe/Istanbul Monday) for Gold users.';

alter table public.usage_weekly_matrix_ai enable row level security;

drop policy if exists "usage_wmatrix_select_own" on public.usage_weekly_matrix_ai;
create policy "usage_wmatrix_select_own" on public.usage_weekly_matrix_ai
  for select using (user_id = auth.uid() or public.is_subscription_admin());

drop policy if exists "usage_wmatrix_insert_own" on public.usage_weekly_matrix_ai;
create policy "usage_wmatrix_insert_own" on public.usage_weekly_matrix_ai
  for insert with check (user_id = auth.uid());

drop policy if exists "usage_wmatrix_update_own" on public.usage_weekly_matrix_ai;
create policy "usage_wmatrix_update_own" on public.usage_weekly_matrix_ai
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
