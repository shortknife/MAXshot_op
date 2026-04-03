create table if not exists public.runtime_write_lanes_op (
  lane_key text primary key,
  lease_id text not null,
  capability_id text not null,
  mutation_scope text not null,
  customer_id text null,
  operator_id text not null,
  acquired_at timestamp with time zone not null default now()
);

create index if not exists idx_runtime_write_lanes_customer_id
  on public.runtime_write_lanes_op (customer_id);

create index if not exists idx_runtime_write_lanes_capability_id
  on public.runtime_write_lanes_op (capability_id);
