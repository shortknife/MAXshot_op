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
  WHERE (
      ({{date_from}} IS NOT NULL AND {{date_to}} IS NOT NULL AND created_at >= {{date_from}}::date AND created_at < ({{date_to}}::date + interval '1 day'))
      OR
      ({{date_from}} IS NULL AND {{date_to}} IS NULL AND created_at >= now() - ({{days}}::int * interval '1 day'))
    )
    AND ({{chain}} IS NULL OR chain ILIKE {{chain}})
    AND ({{protocol}} IS NULL OR protocol ILIKE {{protocol}})
    AND ({{vault_keyword}} IS NULL OR market_name ILIKE ('%' || {{vault_keyword}} || '%'))
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
