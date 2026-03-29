# Release Checklist (MVP)

## 1) Environment
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
cat .env.local
```

Required keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- `WRITE_CONFIRM_TOKEN`
- `NEXT_PUBLIC_READ_ONLY_DEMO=false`
- `NEXT_PUBLIC_WRITE_ENABLE=true`

## 2) One-shot Preflight
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
BASE_URL=http://127.0.0.1:3003 npm run release:preflight
```

Expected:
- `Overall: PASS`
- report file exists:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/RELEASE_PREFLIGHT_REPORT.md`

## 3) Optional E2E Gate
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
BASE_URL=http://127.0.0.1:3003 RUN_E2E=true npm run release:preflight
```

## 4) Artifact Check
Verify these files are up-to-date:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/PHASE_ALL_SMOKE_REPORT.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/UAT_FINAL_REPORT.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/RELEASE_PREFLIGHT_REPORT.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_FINAL_HANDOFF.md`

## 5) Demo Ready Routes
- `/chat`
- `/ops`
- `/operations`
- `/outcome`
- `/audit`
- `/marketing`

