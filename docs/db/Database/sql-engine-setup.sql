-- ========================================
-- SQL Engine Database Schema
-- Version: 1.0
-- Date: 2026-02-16
-- Purpose: SQL Template Engine and Query History for Text-to-SQL
-- ========================================

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables (for development - remove in production)
DROP TABLE IF EXISTS sql_query_history_op CASCADE;
DROP TABLE IF EXISTS sql_templates_op CASCADE;

-- Create sql_templates_op table
CREATE TABLE sql_templates_op (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('data_validation', 'analytics')),
  template_sql TEXT NOT NULL,
  schema_signature JSONB NOT NULL DEFAULT '{}',
  parameters JSONB NOT NULL DEFAULT '{}',
  success_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT name_unique UNIQUE (name)
);

-- Create sql_query_history_op table
CREATE TABLE sql_query_history_op (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT REFERENCES tasks_op(task_id) ON DELETE CASCADE,
  natural_query TEXT NOT NULL,
  generated_sql TEXT NOT NULL,
  tier_used TEXT NOT NULL CHECK (tier_used IN ('template', 'llm_generated', 'deposited_template')),
  execution_time_ms INTEGER,
  result_rows INTEGER,
  success BOOLEAN NOT NULL,
  confidence_score DECIMAL(3,2),
  embedding VECTOR(1536),
  sql_hash TEXT NOT NULL,
  error_message TEXT,
  execution_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for sql_templates_op
CREATE INDEX idx_sql_templates_op_category ON sql_templates_op(category);
CREATE INDEX idx_sql_templates_op_success_count ON sql_templates_op(success_count DESC);
CREATE INDEX idx_sql_templates_op_last_used ON sql_templates_op(last_used_at DESC);

-- Create indexes for sql_query_history_op
CREATE INDEX idx_sql_query_history_op_task_id ON sql_query_history_op(task_id);
CREATE INDEX idx_sql_query_history_op_tier_used ON sql_query_history_op(tier_used);
CREATE INDEX idx_sql_query_history_op_success ON sql_query_history_op(success);
CREATE INDEX idx_sql_query_history_op_created_at ON sql_query_history_op(created_at DESC);
CREATE INDEX idx_sql_query_history_op_sql_hash ON sql_query_history_op(sql_hash);

-- Create vector index for RAG similarity search (ivfflat for cosine similarity)
CREATE INDEX idx_sql_query_history_op_embedding ON sql_query_history_op
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable RLS
ALTER TABLE sql_templates_op ENABLE ROW LEVEL SECURITY;
ALTER TABLE sql_query_history_op ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sql_templates_op
CREATE POLICY "Authenticated users can view sql templates"
ON sql_templates_op
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage sql templates"
ON sql_templates_op
FOR ALL
TO service_role
USING (true);

-- RLS Policies for sql_query_history_op
CREATE POLICY "Authenticated users can view query history"
ON sql_query_history_op
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage query history"
ON sql_query_history_op
FOR ALL
TO service_role
USING (true);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at
CREATE TRIGGER update_sql_templates_op_updated_at
  BEFORE UPDATE ON sql_templates_op
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial SQL templates (Tier 1)

-- Data Validation: Check data completeness
INSERT INTO sql_templates_op (name, description, category, template_sql, schema_signature, parameters) VALUES
('check_data_completeness',
 'Check if a column has missing or null values within a date range',
 'data_validation',
 'SELECT
  {{table_name}} as table_name,
  COUNT(*) as total_records,
  COUNT({{column_name}}) as filled_records,
  ROUND(100.0 * COUNT({{column_name}}) / NULLIF(COUNT(*), 0), 2) as completeness_percentage
 FROM {{table_name}}
 WHERE {{date_filter}}
 GROUP BY 1
 HAVING COUNT({{column_name}}) / NULLIF(COUNT(*), 0) < {{threshold}}',
 '{"required_tables": ["any"], "required_columns": ["date_column"]}',
 '{"table_name": "text", "column_name": "text", "date_filter": "text", "threshold": "numeric"}'
);

-- Data Validation: Duplicate detection
INSERT INTO sql_templates_op (name, description, category, template_sql, schema_signature, parameters) VALUES
('find_duplicates',
 'Find duplicate records based on a column or combination of columns',
 'data_validation',
 'WITH duplicates AS (
  SELECT
    {{columns}},
    COUNT(*) as duplicate_count
  FROM {{table_name}}
  WHERE {{date_filter}}
  GROUP BY {{columns}}
  HAVING COUNT(*) > 1
 )
 SELECT * FROM duplicates ORDER BY duplicate_count DESC LIMIT {{limit}}',
 '{"required_tables": ["any"], "required_columns": ["date_column"]}',
 '{"table_name": "text", "columns": "text", "date_filter": "text", "limit": "numeric"}'
);

-- Analytics: KPI trend over time
INSERT INTO sql_templates_op (name, description, category, template_sql, schema_signature, parameters) VALUES
('calculate_kpi_trend',
 'Calculate the trend of a metric over time with percentage change',
 'analytics',
 'SELECT
  DATE({{date_column}}) as date,
  {{metric_column}} as value,
  LAG({{metric_column}}) OVER (ORDER BY DATE({{date_column}})) as prev_value,
  ROUND(
    ({{metric_column}} - LAG({{metric_column}}) OVER (ORDER BY DATE({{date_column}}))) * 100.0 /
    NULLIF(LAG({{metric_column}}) OVER (ORDER BY DATE({{date_column}})), 0),
    2
  ) as percentage_change
 FROM {{table_name}}
 WHERE {{date_filter}}
 ORDER BY DATE({{date_column}}) DESC
 LIMIT {{limit}}',
 '{"required_tables": ["any"], "required_columns": ["date_column", "metric_column"]}',
 '{"table_name": "text", "date_column": "text", "metric_column": "text", "date_filter": "text", "limit": "numeric"}'
);

-- Analytics: Compare metrics between time periods
INSERT INTO sql_templates_op (name, description, category, template_sql, schema_signature, parameters) VALUES
('compare_periods',
 'Compare a metric between two time periods',
 'analytics',
 'WITH period1 AS (
  SELECT
    SUM({{metric_column}}) as total,
    COUNT(*) as count
  FROM {{table_name}}
  WHERE {{date_filter_1}}
 ),
 period2 AS (
  SELECT
    SUM({{metric_column}}) as total,
    COUNT(*) as count
  FROM {{table_name}}
  WHERE {{date_filter_2}}
 )
 SELECT
  ''{{period1_name}}'' as period_name,
  p1.total as total,
  p1.count as record_count,
  ''{{period2_name}}'' as period_name,
  p2.total as total,
  p2.count as record_count,
  ROUND(
    (p2.total - p1.total) * 100.0 / NULLIF(p1.total, 0),
    2
  ) as percentage_change
 FROM period1 p1, period2 p2',
 '{"required_tables": ["any"], "required_columns": ["metric_column", "date_column"]}',
 '{"table_name": "text", "metric_column": "text", "date_filter_1": "text", "date_filter_2": "text", "period1_name": "text", "period2_name": "text"}'
);

-- Analytics: Top values ranking
INSERT INTO sql_templates_op (name, description, category, template_sql, schema_signature, parameters) VALUES
('top_values_ranking',
 'Get top N values for a column (e.g., top products, top users)',
 'analytics',
 'SELECT
  {{group_column}},
  COUNT(*) as count,
  {{metric_column}}
 FROM {{table_name}}
 WHERE {{date_filter}}
 GROUP BY {{group_column}}, {{metric_column}}
 ORDER BY {{metric_column}} DESC
 LIMIT {{limit}}',
 '{"required_tables": ["any"], "required_columns": ["date_column"]}',
 '{"table_name": "text", "group_column": "text", "metric_column": "text", "date_filter": "text", "limit": "numeric"}'
);

-- Analytics: Distribution analysis
INSERT INTO sql_templates_op (name, description, category, template_sql, schema_signature, parameters) VALUES
('distribution_analysis',
 'Analyze distribution of a metric (e.g., by buckets or percentiles)',
 'analytics',
 'SELECT
  NTILE({{buckets}}) OVER (ORDER BY {{metric_column}}) as bucket,
  MIN({{metric_column}}) OVER (PARTITION BY NTILE({{buckets}}) OVER (ORDER BY {{metric_column}}))) as min_value,
  MAX({{metric_column}}) OVER (PARTITION BY NTILE({{buckets}}) OVER (ORDER BY {{metric_column}}))) as max_value,
  COUNT(*) OVER (PARTITION BY NTILE({{buckets}}) OVER (ORDER BY {{metric_column}}))) as count
 FROM {{table_name}}
 WHERE {{date_filter}}
 GROUP BY bucket, min_value, max_value, count
 ORDER BY bucket',
 '{"required_tables": ["any"], "required_columns": ["metric_column"]}',
 '{"table_name": "text", "metric_column": "text", "date_filter": "text", "buckets": "numeric"}'
);

-- Data Validation: Outlier detection
INSERT INTO sql_templates_op (name, description, category, template_sql, schema_signature, parameters) VALUES
('detect_outliers',
 'Detect outliers in a metric using standard deviation',
 'data_validation',
 'WITH stats AS (
  SELECT
    AVG({{metric_column}}) as mean,
    STDDEV({{metric_column}}) as stddev
  FROM {{table_name}}
  WHERE {{date_filter}}
 )
 SELECT
  id,
  {{metric_column}},
  s.mean,
  s.stddev,
  ABS({{metric_column}} - s.mean) / NULLIF(s.stddev, 0) as z_score
 FROM {{table_name}}, stats s
 WHERE {{date_filter}}
  AND ABS({{metric_column}} - s.mean) / NULLIF(s.stddev, 0) > {{threshold}}
 ORDER BY z_score DESC
 LIMIT {{limit}}',
 '{"required_tables": ["any"], "required_columns": ["metric_column"]}',
 '{"table_name": "text", "metric_column": "text", "date_filter": "text", "threshold": "numeric", "limit": "numeric"}'
);

-- Analytics: Daily aggregation
INSERT INTO sql_templates_op (name, description, category, template_sql, schema_signature, parameters) VALUES
('daily_aggregation',
 'Aggregate a metric by day',
 'analytics',
 'SELECT
  DATE({{date_column}}) as date,
  {{aggregation}}({{metric_column}}) as {{metric_alias}},
  COUNT(*) as record_count
 FROM {{table_name}}
 WHERE {{date_filter}}
 GROUP BY DATE({{date_column}})
 ORDER BY date DESC
 LIMIT {{limit}}',
 '{"required_tables": ["any"], "required_columns": ["date_column", "metric_column"]}',
 '{"table_name": "text", "date_column": "text", "metric_column": "text", "aggregation": "text", "metric_alias": "text", "date_filter": "text", "limit": "numeric"}'
);

-- Add comments to tables
COMMENT ON TABLE sql_templates_op IS 'SQL templates for Tier 1 deterministic query execution';
COMMENT ON TABLE sql_query_history_op IS 'Query execution history for RAG-based few-shot learning';

COMMENT ON COLUMN sql_templates_op.schema_signature IS 'JSONB containing required tables, columns for intent matching';
COMMENT ON COLUMN sql_templates_op.parameters IS 'JSONB containing parameter definitions and types';
COMMENT ON COLUMN sql_query_history_op.embedding IS '1536-dimension vector for similarity search (pgvector)';

-- ============================================================================
-- SQL RPC Functions
-- ============================================================================

-- RPC: Search similar queries using pgvector
CREATE OR REPLACE FUNCTION search_similar_queries(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  min_confidence float DEFAULT 0.0,
  tier_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  task_id text,
  natural_query text,
  generated_sql text,
  tier_used text,
  execution_time_ms int,
  result_rows int,
  success boolean,
  confidence_score numeric,
  embedding vector(1536),
  sql_hash text,
  error_message text,
  execution_metadata jsonb,
  created_at timestamptz
)
LANGUAGE sql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.task_id,
    q.natural_query,
    q.generated_sql,
    q.tier_used,
    q.execution_time_ms,
    q.result_rows,
    q.success,
    q.confidence_score,
    q.embedding,
    q.sql_hash,
    q.error_message,
    q.execution_metadata,
    q.created_at
  FROM sql_query_history_op q
  WHERE
    q.embedding IS NOT NULL
    AND (match_threshold IS NULL OR 1 - (q.embedding <=> query_embedding) >= match_threshold)
    AND (min_confidence IS NULL OR q.confidence_score >= min_confidence)
    AND (tier_filter IS NULL OR q.tier_used = tier_filter)
  ORDER BY (q.embedding <=> query_embedding)
  LIMIT match_count;
END;
$$;

-- RPC: Increment template success count
CREATE OR REPLACE FUNCTION increment_template_success(
  template_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE sql_templates_op
  SET
    success_count = success_count + 1,
    last_used_at = NOW()
  WHERE id = template_id;
END;
$$;

-- RPC: Execute SQL template with parameters
CREATE OR REPLACE FUNCTION sql_template_query(
  sql text,
  params anyarray
)
RETURNS setof anyelement
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY EXECUTE sql USING params;
END;
$$ SECURITY DEFINER;

-- RPC: Explain SQL template (for validation)
CREATE OR REPLACE FUNCTION sql_template_explain(
  sql text,
  params anyarray
)
RETURNS setof jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY EXECUTE 'EXPLAIN (FORMAT JSON, ANALYZE) ' || sql USING params;
END;
$$ SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION search_similar_queries TO authenticated;
GRANT EXECUTE ON FUNCTION increment_template_success TO authenticated;
GRANT EXECUTE ON FUNCTION sql_template_query TO authenticated;
GRANT EXECUTE ON FUNCTION sql_template_explain TO authenticated;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION search_similar_queries TO service_role;
GRANT EXECUTE ON FUNCTION increment_template_success TO service_role;
GRANT EXECUTE ON FUNCTION sql_template_query TO service_role;
GRANT EXECUTE ON FUNCTION sql_template_explain TO service_role;
