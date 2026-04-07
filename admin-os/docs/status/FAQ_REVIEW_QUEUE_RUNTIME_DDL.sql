create table if not exists public.faq_review_queue_op (
  review_id text primary key,
  question text not null,
  reason text not null,
  priority text not null check (priority in ('high', 'normal')),
  queue_status text not null default 'prepared',
  customer_id text null,
  kb_scope text null,
  channel text null,
  confidence numeric null,
  created_at timestamptz not null default now(),
  draft_answer text null,
  citations jsonb not null default '[]'::jsonb,
  customer_context text null,
  source_capability text null default 'capability.faq_qa_review'
);

create index if not exists faq_review_queue_op_created_at_idx
  on public.faq_review_queue_op (created_at desc);

create index if not exists faq_review_queue_op_reason_idx
  on public.faq_review_queue_op (reason);

create index if not exists faq_review_queue_op_scope_idx
  on public.faq_review_queue_op (kb_scope);

alter table if exists public.faq_review_queue_op
  add column if not exists customer_id text null;

create index if not exists faq_review_queue_op_customer_idx
  on public.faq_review_queue_op (customer_id);

alter table if exists public.faq_review_queue_op
  add column if not exists customer_policy_audit jsonb not null default '{}'::jsonb;
