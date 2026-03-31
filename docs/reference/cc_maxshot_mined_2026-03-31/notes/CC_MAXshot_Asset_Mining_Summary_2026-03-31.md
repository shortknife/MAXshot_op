# CC_MAXshot Asset Mining Summary

Date: 2026-03-31
Source: `/Users/alexzheng/Documents/JOB/AI_Project/CC_MAXshot`
Target Workspace: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode`

## 1. Purpose

This folder preserves the only parts of `CC_MAXshot` that remain useful to the current project after the mainline architecture diverged.

The source project should be treated as a reference mine, not as an implementation base.

## 2. Imported Asset Classes

### 2.1 Time Range and SQL Safety

Imported files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/time-sql/time-range-filtering-spec.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/time-sql/cc_time_expression_parser.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/time-sql/cc_time_where_generator.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/time-sql/cc_whitelist_validator.ts`

Intended use:
- fallback rules for Chinese time phrase parsing
- UX reference for no-data-in-range responses
- SQL safety policy reference if controlled SQL generation or SQL review returns later

Do not do:
- do not directly adopt the old Text-to-SQL execution path
- do not assume these files match current schema contracts

### 2.2 Test Phrasing Corpus

Imported file:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/test-corpus/cc_accuracy_test_set.ts`

Intended use:
- query wording inventory
- regression seed set for future business-query evaluation
- source of paraphrase variants for vault / APY / list / comparison style asks

Do not do:
- do not reuse its old expected template ids as current truth
- do not treat its old intent taxonomy as authoritative

### 2.3 Database History and Field Inventory

Imported files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/database-history/database-schema.sql`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/database-history/20260318_execute_cc_tables.sql`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/database-history/20260318_execute_cc_tables_v2.sql`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/cc_maxshot_mined_2026-03-31/database-history/DEPLOY_SQL_SCRIPT_20260322.sql`

Intended use:
- historical field naming cross-check
- migration archaeology
- old table purpose lookup during future cleanup or compatibility work

Do not do:
- do not run these SQL files blindly
- do not assume they are consistent with production state

## 3. Current Integration Judgment

What should be reused later:
1. phrase-level time parsing rules
2. no-data-in-range response patterns
3. SQL whitelist ideas
4. query phrasing corpus for regression expansion
5. schema history for one-off field investigations

What should not be reused:
1. old Router implementation
2. old `DataFactQuery` capability implementation
3. old Tier 1 / Tier 2 / Tier 3 SQL engine architecture as a mainline
4. most of the old phase reports and process docs

## 4. Deletion Recommendation

After confirming this import exists in the current repo, deleting the original `CC_MAXshot` folder is reasonable.

Condition:
- only if you no longer need its screenshots, PDFs, or non-imported historical notes

For the current engineering mainline, these imported files are the useful remainder.
