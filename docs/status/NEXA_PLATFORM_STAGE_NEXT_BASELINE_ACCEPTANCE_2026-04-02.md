# Nexa Platform Stage-Next Baseline Acceptance

Date: 2026-04-02
Status: accepted

## Scope

This acceptance closes the current platform-deepening baseline across three priority tracks:

1. `interaction learning log`
2. `KB mutation workflow`
3. `customer / tenant baseline`

This is not a full tenant system. It is the minimum runtime baseline that proves the platform is no longer only documented semantically, but is carrying customer-bound runtime state in core workflows.

## Accepted Capabilities

### 1. Interaction Learning Log

Accepted runtime capability:
- structured interaction writes after `/api/chat/ask`
- runtime-backed interaction log page
- customer-bound interaction records via `customer_id`

Key files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/chat/ask/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/interaction-learning/extract.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/interaction-learning/runtime.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/interaction-log/page.tsx`

### 2. KB Mutation Workflow

Accepted runtime capability:
- draft KB source registration
- bounded source lifecycle transitions
- runtime-backed KB inventory
- KB management surface with mutation controls

Key files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/kb-source/action/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/source-inventory.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/kb-management/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/kb-management/kb-management-surface.tsx`

### 3. Customer / Tenant Baseline

Accepted runtime capability:
- customer registry exists as a platform-level runtime source
- FAQ review queue can persist `customer_id`
- KB source inventory can persist `customer_id`
- interaction learning log can persist `customer_id`
- runtime pages expose customer-bound state

Key files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/configs/customers/customer_registry_v1.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/customers/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/review-queue.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/source-inventory.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/interaction-learning/runtime.ts`

## Runtime Acceptance Evidence

A live acceptance run was executed against the current Supabase-backed environment.

Observed results:

### KB Source Registration
- `status = 200`
- `source_status = draft`
- `inventory_source = supabase`

### KB Source Inventory Lookup
- runtime source = `supabase`
- registered source found
- `customer_id = maxshot`
- post-register state = `draft`

### KB Source Accept Transition
- `status = 200`
- `previous_status = draft`
- `source_status = accepted`

### KB Source Inventory After Transition
- runtime source = `supabase`
- accepted source found
- `customer_id = maxshot`
- post-transition state = `accepted`

### FAQ Review Queue Write
- runtime write succeeded
- `queue_source = supabase`
- inserted review item found
- `customer_id = maxshot`

### Interaction Learning Log Write
- runtime write succeeded
- runtime source = `supabase`
- inserted log item found
- `customer_id = maxshot`

## Acceptance Standard

This stage is accepted because all of the following are now true:

1. platform-level customer identity is represented in runtime artifacts
2. customer-bound KB mutation is no longer only a UI concept
3. customer-bound FAQ review persistence is real
4. customer-bound interaction learning persistence is real
5. the existing FAQ / KB Plane and learning plane now share a common customer-bound baseline

## What This Stage Does Not Claim

This acceptance does not imply:
- full multi-tenant isolation
- customer auth / IAM
- customer-scoped capability exposure policies
- billing or provisioning workflows
- customer admin suite completeness

Those remain future platform work.

## Freeze Judgment

Judgment: freeze this baseline now.

Reason:
- the three stage-next priorities are now materially implemented
- runtime acceptance is complete
- further work should move upward into policy, access control, stronger memory, and runtime evolution
- further baseline churn here would create low leverage

## Recommended Next Priorities

1. stronger memory layer
2. customer-bound capability exposure rules
3. verification-aware runtime stage design
4. cost/accounting instrumentation
5. customer access and operator boundary formalization
