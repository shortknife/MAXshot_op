create table if not exists interaction_learning_log_op (
  log_id text primary key,
  created_at timestamptz not null default now(),
  session_id text null,
  requester_id text null,
  entry_channel text null,
  raw_query text not null,
  effective_query text null,
  intent_type text null,
  intent_type_canonical text null,
  primary_capability_id text null,
  matched_capability_ids jsonb not null default '[]'::jsonb,
  source_plane text null,
  answer_type text null,
  success boolean not null,
  status_code integer not null,
  fallback_required boolean not null default false,
  review_required boolean not null default false,
  clarification_required boolean not null default false,
  confidence numeric null,
  summary text null,
  query_mode text null,
  scope text null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_interaction_learning_log_created_at on interaction_learning_log_op (created_at desc);
create index if not exists idx_interaction_learning_log_session_id on interaction_learning_log_op (session_id);
create index if not exists idx_interaction_learning_log_capability on interaction_learning_log_op (primary_capability_id);
create index if not exists idx_interaction_learning_log_plane on interaction_learning_log_op (source_plane);
