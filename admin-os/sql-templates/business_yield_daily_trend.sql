WITH scoped AS (
  SELECT
    DATE(timezone({{timezone}}, m.created_at)) AS day_local,
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
)
SELECT
  day_local,
  ROUND(avg(apy_pct)::numeric, 4) AS avg_apy_pct,
  ROUND(max(apy_pct)::numeric, 4) AS max_apy_pct,
  ROUND(min(apy_pct)::numeric, 4) AS min_apy_pct,
  count(*)::int AS sample_count
FROM scoped
GROUP BY day_local
ORDER BY day_local DESC
