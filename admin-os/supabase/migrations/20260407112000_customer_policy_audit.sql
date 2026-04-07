alter table if exists public.faq_review_queue_op
  add column if not exists customer_policy_audit jsonb not null default '{}'::jsonb;

alter table if exists public.faq_kb_source_inventory_op
  add column if not exists customer_policy_audit jsonb not null default '{}'::jsonb;
