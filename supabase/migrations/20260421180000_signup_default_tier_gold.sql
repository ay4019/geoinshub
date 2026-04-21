-- New signups default to Gold (matches app policy in lib/subscription.ts).

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, subscription_tier, tier_source)
  values (new.id, 'gold', 'signup')
  on conflict (id) do nothing;
  return new;
end;
$$;
