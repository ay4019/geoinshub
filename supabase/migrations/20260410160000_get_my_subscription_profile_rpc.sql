-- Reliable profile read for the signed-in user (avoids RLS edge cases on public.profiles).
-- Call from the browser: supabase.rpc('get_my_subscription_profile').

create or replace function public.get_my_subscription_profile()
returns table (
  subscription_tier text,
  is_admin boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.subscription_tier, p.is_admin
  from public.profiles p
  where p.id = auth.uid();
$$;

comment on function public.get_my_subscription_profile() is 'Returns tier and admin flag for the current JWT subject; bypasses RLS for consistent client reads.';

grant execute on function public.get_my_subscription_profile() to authenticated;
