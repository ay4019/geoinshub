create table if not exists public.site_metrics (
  id integer primary key default 1 check (id = 1),
  visits bigint not null default 0,
  tool_uses bigint not null default 0,
  article_reads bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.site_metrics (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.site_counter_breakdowns (
  metric_type text not null check (metric_type in ('tool_uses', 'article_reads')),
  slug text not null,
  count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (metric_type, slug)
);

create table if not exists public.newsletter_subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_message_logs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  subject text,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_message_logs_email_created_at
  on public.contact_message_logs (email, created_at desc);

create or replace function public.increment_site_metric(p_metric text, p_slug text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_metrics (id)
  values (1)
  on conflict (id) do nothing;

  if p_metric = 'visits' then
    update public.site_metrics
      set visits = visits + 1,
          updated_at = now()
      where id = 1;
  elsif p_metric = 'tool_uses' then
    update public.site_metrics
      set tool_uses = tool_uses + 1,
          updated_at = now()
      where id = 1;
  elsif p_metric = 'article_reads' then
    update public.site_metrics
      set article_reads = article_reads + 1,
          updated_at = now()
      where id = 1;
  else
    raise exception 'Unsupported site metric: %', p_metric;
  end if;

  if p_slug is not null and p_metric in ('tool_uses', 'article_reads') then
    insert into public.site_counter_breakdowns (metric_type, slug, count, updated_at)
    values (p_metric, p_slug, 1, now())
    on conflict (metric_type, slug)
    do update set
      count = public.site_counter_breakdowns.count + 1,
      updated_at = now();
  end if;
end;
$$;

revoke all on public.site_metrics from anon, authenticated;
revoke all on public.site_counter_breakdowns from anon, authenticated;
revoke all on public.newsletter_subscribers from anon, authenticated;
revoke all on public.contact_message_logs from anon, authenticated;
