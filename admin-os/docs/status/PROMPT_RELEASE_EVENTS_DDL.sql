create table if not exists public.prompt_release_events_op (
  event_id text primary key,
  slug text not null,
  action text not null check (action in ('release', 'rollback')),
  target_version text not null,
  previous_version text null,
  operator_id text not null,
  release_note text null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists prompt_release_events_op_slug_idx
  on public.prompt_release_events_op (slug, created_at desc);
