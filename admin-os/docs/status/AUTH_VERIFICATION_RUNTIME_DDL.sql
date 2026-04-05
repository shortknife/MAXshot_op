create table if not exists public.auth_verification_challenges_op (
  challenge_id text primary key,
  identity_id text not null,
  customer_id text null,
  operator_id text null,
  auth_method text not null,
  verification_method text not null,
  challenge_status text not null default 'issued',
  email text null,
  wallet_address text null,
  code_hash text null,
  challenge_nonce text null,
  challenge_message text null,
  expires_at timestamptz not null,
  verified_at timestamptz null,
  consumed_at timestamptz null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_verification_challenges_identity on public.auth_verification_challenges_op(identity_id, created_at desc);
create index if not exists idx_auth_verification_challenges_customer on public.auth_verification_challenges_op(customer_id, created_at desc);
create index if not exists idx_auth_verification_challenges_status on public.auth_verification_challenges_op(challenge_status, expires_at);

create table if not exists public.auth_identity_events_op (
  event_id text primary key,
  identity_id text null,
  customer_id text null,
  operator_id text null,
  auth_method text not null,
  verification_method text null,
  outcome text not null,
  challenge_id text null,
  reason text null,
  email text null,
  wallet_address text null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_identity_events_identity on public.auth_identity_events_op(identity_id, created_at desc);
create index if not exists idx_auth_identity_events_customer on public.auth_identity_events_op(customer_id, created_at desc);
create index if not exists idx_auth_identity_events_outcome on public.auth_identity_events_op(outcome, created_at desc);
