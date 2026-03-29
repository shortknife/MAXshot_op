# Intent Analyzer Setup Guide

> **Purpose**: Configuration and testing for MAXshot Intent Analyzer (Phase 3)
> **Components**: DeepSeek API integration, Session Management, Intent Parsing

---

## 🔑 Required Configuration

### 1. DeepSeek API Key

**Get API Key**: https://platform.deepseek.com/api-keys

```bash
# Add to admin-os/.env.local or server-actions/.env.local
DEEPSEEK_API_KEY=sk-your-key-here
```

### 2. Supabase Credentials

**Required for**: Session persistence, execution tracking

```bash
# Already added from database setup
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## 🧪 Testing Intent Analyzer

### Unit Tests

```bash
# Create test file: server-actions/intent-analyzer/__tests__/intent-parsing.test.ts

# Run tests
cd server-actions
npx jest intent-analyzer/__tests__
```

### Integration Test

```bash
# Start Next.js dev server
cd admin-os
npm run dev

# Test API endpoint (create one first)
curl -X POST http://localhost:3000/api/test-intent \
  -H "Content-Type: application/json" \
  -d '{"raw_query": "查询金库 APY"}'
```

---

## 📊 Verification Checklist

### Intent Parsing

- [ ] DeepSeek API responds successfully
- [ ] Intent type is valid (ops_query, content_generation, general_qna)
- [ ] Slots are extracted correctly
- [ ] Confidence is in range (0.0-1.0)
- [ ] No `capability_chain` in output
- [ ] Output is valid JSON

### Session Management

- [ ] Session is created correctly
- [ ] User messages are added to history
- [ ] Session expires after 30 minutes
- [ ] Expired sessions are cleaned up

### Integration with Router

- [ ] Intent is passed to Router via `execution.payload`
- [ ] Session context is available for anaphora resolution
- [ ] Execution status is updated to `in_progress`

---

## 🐛 Troubleshooting

### DeepSeek API Errors

**401 Unauthorized**:
- Check API key validity
- Verify key is not expired

**429 Rate Limit**:
- Implement retry logic with exponential backoff
- Add queue for pending requests

**500 Internal Server Error**:
- Check DeepSeek status page
- Log error details for debugging

### TypeScript Errors

**Module not found**:
- Check import paths in `tsconfig.json`
- Verify all files exist

**Type errors**:
- Run `npx tsc --noEmit`
- Fix strict type errors

---

## 📚 Next Steps

Once Intent Analyzer is configured and tested:

1. **Phase 4**: Implement real capabilities (replace stubs)
2. **Phase 5**: Create Admin OS pages
3. **Integration**: Connect Entry → Intent Analyzer → Router → Capabilities

---

## 📝 Files Reference

- `server-actions/intent-analyzer/deepseek-client.ts` - API client
- `server-actions/intent-analyzer/session-context.ts` - Session manager
- `server-actions/intent-analyzer/intent-parsing.ts` - Intent parser
- `server-actions/intent-analyzer/index.ts` - Exports

---

**Status**: 📖 **Ready for Testing** (awaiting credentials)
