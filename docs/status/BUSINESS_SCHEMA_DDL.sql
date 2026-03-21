-- Auto-generated business schema (public)

CREATE TABLE market_metrics (
  id uuid NOT NULL,
  execution_id uuid NOT NULL,
  chain text,
  protocol text,
  market_name text,
  base_apy numeric,
  reward_apy jsonb,
  net_apy numeric,
  tvl numeric,
  est_deposit_gas numeric,
  protocol_market_id text,
  is_available boolean,
  created_at timestamp with time zone,
  market_id integer,
  vault_id integer
);

CREATE TABLE allocation_snapshots (
  id uuid NOT NULL,
  execution_id uuid NOT NULL,
  vault_name text NOT NULL,
  chain_name text,
  protocol_name text,
  market text NOT NULL,
  asset text,
  total_allocated numeric,
  idle_liquidity numeric,
  created_at timestamp with time zone,
  user_id uuid
);

CREATE TABLE executions (
  id uuid NOT NULL,
  workflow_id text,
  vault_name text,
  status text,
  start_time timestamp with time zone,
  stop_time timestamp with time zone,
  duration_ms integer,
  total_gas_cost_usd numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  n8n_execution_id text
);

CREATE TABLE rebalance_decisions (
  id uuid NOT NULL,
  execution_id uuid NOT NULL,
  vault_name text NOT NULL,
  rebalance_needed boolean NOT NULL,
  rebalance_reason text,
  action_summary jsonb,
  trigger_snapshot_id uuid,
  decision_timestamp timestamp with time zone,
  is_blocked boolean NOT NULL,
  threshold_details jsonb,
  user_id uuid
);

CREATE TABLE execution_logs_rag (
  id uuid NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  embedding vector
);

CREATE TABLE data_query_logs (
  id uuid NOT NULL,
  user_id bigint NOT NULL,
  question_text text NOT NULL,
  question_type text,
  time_range jsonb,
  data_sources jsonb,
  response_text text,
  created_at timestamp with time zone NOT NULL,
  query_type text,
  execution_id text,
  requester_id text,
  answer_id uuid
);

