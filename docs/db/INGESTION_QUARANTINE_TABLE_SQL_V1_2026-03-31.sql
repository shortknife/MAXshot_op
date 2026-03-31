create table if not exists ingestion_quarantine (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_execution_ref text not null,
  workflow_id text null,
  environment text not null,
  gate_outcome text not null,
  reasons jsonb not null,
  raw_archive_ref text null,
  source_workflow_name text null,
  critical_event boolean not null default false,
  critical_reason text null,
  payload_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingestion_quarantine_source_execution_ref
  on ingestion_quarantine (source_system, source_execution_ref);

create index if not exists idx_ingestion_quarantine_created_at
  on ingestion_quarantine (created_at desc);

create index if not exists idx_ingestion_quarantine_environment
  on ingestion_quarantine (environment);
