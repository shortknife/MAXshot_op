create table if not exists public.runtime_cost_events_op (
  event_id text primary key,
  created_at timestamptz not null default now(),
  session_id text null,
  customer_id text null,
  requester_id text null,
  entry_channel text null,
  raw_query text not null,
  intent_type text null,
  intent_type_canonical text null,
  primary_capability_id text null,
  matched_capability_ids text[] not null default '{}',
  source_plane text null,
  answer_type text null,
  verification_outcome text null,
  fallback_required boolean not null default false,
  review_required boolean not null default false,
  success boolean not null default false,
  status_code integer not null default 0,
  model_source text null,
  model_prompt_slug text null,
  tokens_used integer not null default 0,
  estimated_cost_usd numeric(18,6) not null default 0,
  duration_ms integer not null default 0,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_runtime_cost_events_created_at on public.runtime_cost_events_op (created_at desc);
create index if not exists idx_runtime_cost_events_customer_id on public.runtime_cost_events_op (customer_id);
create index if not exists idx_runtime_cost_events_source_plane on public.runtime_cost_events_op (source_plane);
