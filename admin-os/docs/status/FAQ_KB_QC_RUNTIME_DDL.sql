create table if not exists public.faq_kb_qc_snapshot_op (
  source_id text primary key,
  title text not null,
  kb_scope text null,
  source_type text not null,
  ingest_status text not null check (ingest_status in ('accepted', 'needs_review', 'rejected')),
  document_count integer not null default 0,
  chunk_count integer not null default 0,
  qc_flags jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists faq_kb_qc_snapshot_op_generated_at_idx
  on public.faq_kb_qc_snapshot_op (generated_at desc);

create index if not exists faq_kb_qc_snapshot_op_scope_idx
  on public.faq_kb_qc_snapshot_op (kb_scope);
