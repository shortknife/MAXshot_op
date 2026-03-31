WITH metric_scoped AS (
  SELECT
    DATE(timezone({{timezone}}, m.created_at)) AS day_local,
    m.execution_id,
    CASE
      WHEN abs(COALESCE(m.net_apy, m.base_apy, 0)) <= 1 THEN COALESCE(m.net_apy, m.base_apy, 0) * 100
      ELSE COALESCE(m.net_apy, m.base_apy, 0)
    END AS apy_pct
  FROM market_metrics m
  WHERE (
      ({{date_from}} IS NOT NULL AND {{date_to}} IS NOT NULL AND m.created_at >= {{date_from}}::date AND m.created_at < ({{date_to}}::date + interval '1 day'))
      OR
      ({{date_from}} IS NULL AND {{date_to}} IS NULL AND m.created_at >= now() - ({{days}}::int * interval '1 day'))
    )
    AND ({{chain}} IS NULL OR m.chain ILIKE {{chain}})
    AND ({{protocol}} IS NULL OR m.protocol ILIKE {{protocol}})
    AND (
      {{vault_keyword}} IS NULL OR EXISTS (
        SELECT 1
        FROM allocation_snapshots a
        WHERE a.execution_id = m.execution_id
          AND (
            a.vault_name ILIKE ('%' || {{vault_keyword}} || '%')
            OR a.market ILIKE ('%' || {{vault_keyword}} || '%')
          )
      )
    )
),
daily_apy AS (
  SELECT
    day_local,
    ROUND(avg(apy_pct)::numeric, 4) AS avg_apy_pct
  FROM metric_scoped
  GROUP BY day_local
),
daily_reason AS (
  SELECT
    DATE(timezone({{timezone}}, rd.decision_timestamp)) AS day_local,
    rd.rebalance_reason,
    count(*)::int AS reason_count
  FROM rebalance_decisions rd
  WHERE (
      ({{date_from}} IS NOT NULL AND {{date_to}} IS NOT NULL AND rd.decision_timestamp >= {{date_from}}::date AND rd.decision_timestamp < ({{date_to}}::date + interval '1 day'))
      OR
      ({{date_from}} IS NULL AND {{date_to}} IS NULL AND rd.decision_timestamp >= now() - ({{days}}::int * interval '1 day'))
    )
    AND ({{chain}} IS NULL OR rd.chain ILIKE {{chain}})
    AND ({{protocol}} IS NULL OR rd.protocol ILIKE {{protocol}})
    AND (
      {{vault_keyword}} IS NULL
      OR rd.vault_name ILIKE ('%' || {{vault_keyword}} || '%')
      OR rd.market_name ILIKE ('%' || {{vault_keyword}} || '%')
    )
  GROUP BY 1, 2
),
daily_top_reason AS (
  SELECT DISTINCT ON (day_local)
    day_local,
    rebalance_reason
  FROM daily_reason
  ORDER BY day_local, reason_count DESC, rebalance_reason ASC
),
ranked AS (
  SELECT
    d.day_local,
    d.avg_apy_pct,
    tr.rebalance_reason AS top_reason
  FROM daily_apy d
  LEFT JOIN daily_top_reason tr USING (day_local)
),
highest AS (
  SELECT day_local, avg_apy_pct, COALESCE(top_reason, '无明确决策原因') AS top_reason
  FROM ranked
  ORDER BY avg_apy_pct DESC, day_local DESC
  LIMIT 1
),
lowest AS (
  SELECT day_local, avg_apy_pct, COALESCE(top_reason, '无明确决策原因') AS top_reason
  FROM ranked
  ORDER BY avg_apy_pct ASC, day_local DESC
  LIMIT 1
)
SELECT
  h.day_local AS highest_day,
  h.avg_apy_pct AS highest_avg_apy_pct,
  h.top_reason AS highest_top_reason,
  l.day_local AS lowest_day,
  l.avg_apy_pct AS lowest_avg_apy_pct,
  l.top_reason AS lowest_top_reason
FROM highest h
CROSS JOIN lowest l
