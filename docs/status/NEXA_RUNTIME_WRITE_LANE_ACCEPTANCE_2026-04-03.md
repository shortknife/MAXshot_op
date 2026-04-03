# Nexa Runtime Write-Lane Acceptance (2026-04-03)

## Result

Accepted. Freeze now.

## Runtime acceptance summary

A real Supabase-backed acceptance run validated both serialized mutation families.

### KB source mutation

- pre-acquired lane: `kb_source_inventory:maxshot`
- concurrent register request result: `409 write_lane_busy`
- post-release register request result: `200`
- runtime inventory persisted to Supabase

### FAQ review mutation

- pre-acquired lane: `faq_review_queue:maxshot`
- concurrent approve request result: `409 write_lane_busy`
- post-release approve request result: `200`
- runtime queue transition persisted to Supabase

### Lane cleanup

After both acceptance paths completed, `runtime_write_lanes_op` had no active rows for:
- `kb_source_inventory:maxshot`
- `faq_review_queue:maxshot`

## Meaning

The platform now enforces real runtime serialization for non-concurrency-safe FAQ / KB mutations instead of only declaring serialized intent in capability metadata.

## Deferred

Still out of scope:
- lease expiry / takeover
- durable background mutation queue
- router-wide execution lanes
- cost-aware write scheduling
