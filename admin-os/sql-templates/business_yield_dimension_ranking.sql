WITH scoped AS (
  SELECT
    CASE
      WHEN {{dimension}} = 'chain' THEN COALESCE(chain, 'unknown')
      ELSE COALESCE(protocol, 'unknown')
    END AS dimension_value,
    CASE
      WHEN abs(COALESCE(net_apy, base_apy, 0)) <= 1 THEN COALESCE(net_apy, base_apy, 0) * 100
      ELSE COALESCE(net_apy, base_apy, 0)
    END AS apy_pct
  FROM market_metrics
  WHERE created_at >= now() - ({{days}}::int * interval '1 day')
)
SELECT
  dimension_value,
  ROUND(avg(apy_pct)::numeric, 4) AS avg_apy_pct,
  ROUND(max(apy_pct)::numeric, 4) AS max_apy_pct,
  count(*)::int AS sample_count
FROM scoped
GROUP BY dimension_value
ORDER BY avg_apy_pct DESC, sample_count DESC
LIMIT {{limit}}
