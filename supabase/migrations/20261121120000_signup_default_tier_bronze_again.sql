-- New signups start on Bronze (replaces 20260421180000_signup_default_tier_gold.sql).
-- Only the signup trigger changes; existing profiles are not modified.
-- Tool reports and AI features are Gold only (lib/subscription.ts, app/actions/subscription.ts).

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
