# Final Acceptance Commands (2026-02-23)

## 0) Workspace
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
```

## 1) One-shot technical gate (recommended)
```bash
BASE_URL=http://127.0.0.1:3003 npm run release:preflight
```

Expected:
- `Overall: PASS`
- report generated:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/RELEASE_PREFLIGHT_REPORT.md`

## 2) One-shot technical gate + E2E
首次运行前先安装浏览器：
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
npm run test:e2e:install
```

```bash
BASE_URL=http://127.0.0.1:3003 RUN_E2E=true npm run release:preflight
```

## 3) Manual API sanity (business data plane)
```bash
curl -s -X POST http://127.0.0.1:3003/api/chat/ask \
  -H "Content-Type: application/json" \
  -d '{"raw_query":"MAXshot 有哪些 vault 可以用？"}'
```

```bash
curl -s -X POST http://127.0.0.1:3003/api/chat/ask \
  -H "Content-Type: application/json" \
  -d '{"raw_query":"当前 vault APY 怎么样？"}'
```

## 4) Manual rejection semantics
```bash
curl -s -X POST http://127.0.0.1:3003/api/chat/ask \
  -H "Content-Type: application/json" \
  -d '{"raw_query":"MAXshot 品牌故事是什么？"}'
```

Expected:
- `success=false`
- `error=out_of_business_scope`
- `meta.next_actions` exists

## 5) UI routes for demo walkthrough
- `/chat`
- `/ops`
- `/operations`
- `/outcome`
- `/audit`
- `/marketing`

## 6) Final artifacts to attach
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/PHASE_ALL_SMOKE_REPORT.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/UAT_FINAL_REPORT.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/RELEASE_PREFLIGHT_REPORT.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/FINAL_DELIVERY_STATUS_2026-02-23.md`
