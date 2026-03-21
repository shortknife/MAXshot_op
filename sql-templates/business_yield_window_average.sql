WITH scoped AS (
  SELECT
    m.chain,
    m.protocol,
    COALESCE(NULLIF(m.market_name, ''), NULLIF(m.market, ''), 'Unknown Market') AS market_name,
    m.created_at,
    CASE
      WHEN abs(COALESCE(m.net_apy, m.base_apy, 0)) <= 1 THEN COALESCE(m.net_apy, m.base_apy, 0) * 100
      ELSE COALESCE(m.net_apy, m.base_apy, 0)
    END AS apy_pct,
    COALESCE(m.tvl, 0) AS tvl
  FROM market_metrics m
  WHERE m.created_at >= now() - ({{days}}::int * interval '1 day')
    AND (
      {{vault_keyword}} IS NULL OR EXISTS (
        SELECT 1
        FROM allocation_snapshots a
        WHERE a.execution_id = m.execution_id
          AND a.vault_name ILIKE ('%' || {{vault_keyword}} || '%')
      )
    )
),
latest_market_snapshot AS (
  SELECT DISTINCT ON (chain, protocol, market_name)
    chain,
    protocol,
    market_name,
    tvl,
    created_at
  FROM scoped
  ORDER BY chain, protocol, market_name, created_at DESC
)
SELECT
  s.chain,
  s.protocol,
  s.market_name,
  ROUND(avg(s.apy_pct)::numeric, 4) AS avg_apy_pct,
  ROUND(max(s.apy_pct)::numeric, 4) AS max_apy_pct,
  ROUND(min(s.apy_pct)::numeric, 4) AS min_apy_pct,
  ROUND(COALESCE(l.tvl, 0)::numeric, 4) AS tvl,
  l.created_at,
  count(*)::int AS sample_count
FROM scoped s
LEFT JOIN latest_market_snapshot l
  ON l.chain = s.chain
 AND l.protocol = s.protocol
 AND l.market_name = s.market_name
GROUP BY
  s.chain,
  s.protocol,
  s.market_name,
  l.tvl,
  l.created_at
ORDER BY avg_apy_pct DESC, s.chain ASC, s.protocol ASC, s.market_name ASC
