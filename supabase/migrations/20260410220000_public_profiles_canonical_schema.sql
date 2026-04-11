-- =============================================================================
-- public.profiles — canonical schema (single migration, idempotent)
-- =============================================================================
-- Nihai kolonlar (uygulama + admin upsert):
--   id                uuid PRIMARY KEY → auth.users(id) ON DELETE CASCADE
--   subscription_tier text NOT NULL DEFAULT 'none'
--                     CHECK (subscription_tier IN ('none','bronze','silver','gold'))
--   tier_source       text NOT NULL DEFAULT 'manual'
--   is_admin          boolean NOT NULL DEFAULT false
--   created_at        timestamptz NOT NULL DEFAULT now()
--   updated_at        timestamptz NOT NULL DEFAULT now()
--
-- tier_source anlamı (bilgi): signup | legacy | manual | stripe
--
-- Güvenli: boş DB, eksik kolonlu legacy tablolar, veya `plan` + `subscription_tier` karmaşası.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tablo yoksa tam şema ile oluştur
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    create table public.profiles (
      id uuid not null
        primary key
        references auth.users (id) on delete cascade,
      subscription_tier text not null default 'none',
      tier_source text not null default 'manual',
      is_admin boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint profiles_subscription_tier_check
        check (subscription_tier in ('none', 'bronze', 'silver', 'gold'))
    );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) Eksik kolonları güvenli ekle (mevcut tablolar)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists subscription_tier text;

alter table public.profiles
  add column if not exists tier_source text;

alter table public.profiles
  add column if not exists is_admin boolean;

alter table public.profiles
  add column if not exists created_at timestamptz;

alter table public.profiles
  add column if not exists updated_at timestamptz;

-- subscription_tier boşları doldur (plan taşımasından önce)
update public.profiles
set subscription_tier = coalesce(nullif(trim(subscription_tier), ''), 'none')
where subscription_tier is null;

-- -----------------------------------------------------------------------------
-- 3) Legacy `plan` → `subscription_tier`, sonra `plan` kaldır
--    (NOT NULL / CHECK öncesi: geçerli tier değerleri yazılır)
-- -----------------------------------------------------------------------------
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

-- Diğer kolonlarda NULL düzelt
update public.profiles
set subscription_tier = coalesce(nullif(trim(subscription_tier), ''), 'none')
where subscription_tier is null;

update public.profiles
set tier_source = coalesce(nullif(trim(tier_source), ''), 'manual')
where tier_source is null;

update public.profiles
set is_admin = coalesce(is_admin, false)
where is_admin is null;

update public.profiles
set created_at = coalesce(created_at, now())
where created_at is null;

update public.profiles
set updated_at = coalesce(updated_at, now())
where updated_at is null;

-- Geçersiz tier metinlerini CHECK öncesi normalize et (ör. eski veri, büyük harf)
update public.profiles
set subscription_tier = lower(trim(subscription_tier));

update public.profiles
set subscription_tier = case subscription_tier
  when 'free' then 'none'
  when 'trial' then 'none'
  when 'basic' then 'bronze'
  when 'copper' then 'bronze'
  when 'pro' then 'silver'
  when 'professional' then 'silver'
  when 'premium' then 'gold'
  when 'enterprise' then 'gold'
  else subscription_tier
end
where subscription_tier in ('free', 'trial', 'basic', 'copper', 'pro', 'professional', 'premium', 'enterprise');

update public.profiles
set subscription_tier = 'none'
where subscription_tier not in ('none', 'bronze', 'silver', 'gold');

-- Varsayılanlar ve NOT NULL
alter table public.profiles
  alter column subscription_tier set default 'none';

alter table public.profiles
  alter column tier_source set default 'manual';

alter table public.profiles
  alter column is_admin set default false;

alter table public.profiles
  alter column created_at set default now();

alter table public.profiles
  alter column updated_at set default now();

alter table public.profiles
  alter column subscription_tier set not null;

alter table public.profiles
  alter column tier_source set not null;

alter table public.profiles
  alter column is_admin set not null;

alter table public.profiles
  alter column created_at set not null;

alter table public.profiles
  alter column updated_at set not null;

-- CHECK (yoksa ekle)
do $$
begin
  alter table public.profiles
    add constraint profiles_subscription_tier_check
    check (subscription_tier in ('none', 'bronze', 'silver', 'gold'));
exception
  when duplicate_object then null;
end $$;

-- PRIMARY KEY ve auth.users FK (legacy tabloda eksikse)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.contype = 'p'
  ) then
    alter table public.profiles add primary key (id);
  end if;
exception
  when others then
    null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.contype = 'f'
      and c.conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
  when others then
    null;
end $$;

create index if not exists idx_profiles_subscription_tier on public.profiles (subscription_tier);

-- -----------------------------------------------------------------------------
-- 4) auth kullanıcıları için eksik satır (legacy bronze)
-- -----------------------------------------------------------------------------
insert into public.profiles (id, subscription_tier, tier_source)
select u.id, 'bronze', 'legacy'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 5) Yorumlar
-- -----------------------------------------------------------------------------
comment on table public.profiles is 'Per-user subscription tier, tier provenance, admin flag; tier updates via service role (admin) or SQL/triggers.';

comment on column public.profiles.id is 'auth.users.id ile aynı; birincil anahtar.';

comment on column public.profiles.subscription_tier is 'none = bulut projesi yok; bronze | silver | gold = ücretli kademeler.';

comment on column public.profiles.tier_source is 'signup | legacy | manual | stripe — tier''ın nereden geldiği (bilgi amaçlı).';

comment on column public.profiles.is_admin is 'true ise /admin ve tier yönetimi.';

comment on column public.profiles.created_at is 'Satır oluşturulma zamanı.';

comment on column public.profiles.updated_at is 'Son güncelleme (ör. admin tier değişimi).';

-- -----------------------------------------------------------------------------
-- 6) PostgREST: şema önbelleğini yenile (subscription_tier, tier_source görünsün)
-- -----------------------------------------------------------------------------
select pg_notify('pgrst', 'reload schema');
