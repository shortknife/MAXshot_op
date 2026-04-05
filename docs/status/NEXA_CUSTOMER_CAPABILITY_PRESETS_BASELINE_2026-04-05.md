# Nexa Customer Capability Presets Baseline

- Date: 2026-04-05
- Status: accepted
- Scope: customer-specific workspace presets, chat preset routing hints, customer workspace visibility, session-kernel attachment

## Decision
Add filesystem-managed customer workspace presets so each customer gets a distinct default working posture without introducing a heavy tenant dashboard or separate product shells.

## What Changed
1. Added filesystem customer workspace assets under:
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/maxshot/workspace.md`
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/nexa-demo/workspace.md`
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/customer-assets/ops-observer/workspace.md`
2. Added runtime loader:
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/workspace.ts`
3. Added API surface:
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/customers/workspace/route.ts`
4. Updated chat surface:
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/chat/page.tsx`
5. Updated customer workspace page:
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/customers/page.tsx`
6. Extended session kernel and interaction-log evidence:
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/session-kernel.ts`
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-ask-service.ts`
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/interaction-learning/extract.ts`
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/interaction-log/interaction-log-surface.tsx`

## Runtime Shape
Each customer preset now defines:
- `primary_plane`
- `default_entry_path`
- `preferred_capabilities`
- `focused_surfaces`
- `recommended_route_order`
- `summary`
- `quick_queries`

## Product Effect
- `/chat` now renders customer-specific start copy and quick queries.
- `/customers` now shows workspace preset posture next to memory, boundary, and wallet posture.
- `session_kernel` now records customer workspace hints so runtime traces can be interpreted in customer context.

## Validation
- Focused tests: passed
- Production build: passed
- Loader runtime check: passed

## Freeze Judgment
Freeze now.

This is the right baseline for customer-specific product posture. The next layer, if needed, should refine customer preset enforcement in routing or capability prioritization, not introduce a heavy dashboard model.
