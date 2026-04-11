-- New signups are members on the Bronze tier by default (cloud projects enabled).
-- Replaces previous default of `none` from handle_new_user_profile.

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, subscription_tier, tier_source)
  values (new.id, 'bronze', 'signup')
  on conflict (id) do nothing;
  return new;
end;
$$;
