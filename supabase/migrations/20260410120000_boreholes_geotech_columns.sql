-- Geotechnical fields for borehole samples (PI, GWT, unit weight, soil behavior).
-- Apply in Supabase SQL editor or via: supabase db push / migration run.

alter table public.boreholes
  add column if not exists pi_value double precision,
  add column if not exists gwt_depth double precision,
  add column if not exists unit_weight double precision,
  add column if not exists soil_behavior text;

comment on column public.boreholes.pi_value is 'Plasticity index (%) where applicable.';
comment on column public.boreholes.gwt_depth is 'Groundwater table depth (m).';
comment on column public.boreholes.unit_weight is 'Soil unit weight.';
comment on column public.boreholes.soil_behavior is 'cohesive | granular for tool gating.';
