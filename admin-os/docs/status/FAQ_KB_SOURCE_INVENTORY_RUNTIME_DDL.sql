create table if not exists faq_kb_source_inventory_op (
  source_id text primary key,
  title text not null,
  customer_id text null,
  kb_scope text null,
  source_type text not null,
  source_ref text not null,
  source_status text not null default 'draft',
  qc_status text not null default 'needs_review',
  document_count integer not null default 0,
  chunk_count integer not null default 0,
  qc_flags jsonb not null default '[]'::jsonb,
  uploaded_by text null,
  customer_context text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_faq_kb_source_inventory_updated_at on faq_kb_source_inventory_op (updated_at desc);
create index if not exists idx_faq_kb_source_inventory_scope on faq_kb_source_inventory_op (kb_scope);
create index if not exists idx_faq_kb_source_inventory_status on faq_kb_source_inventory_op (source_status);

alter table if exists faq_kb_source_inventory_op
  add column if not exists customer_id text null;

create index if not exists idx_faq_kb_source_inventory_customer on faq_kb_source_inventory_op (customer_id);

alter table if exists faq_kb_source_inventory_op
  add column if not exists customer_policy_audit jsonb not null default '{}'::jsonb;
