---
name: supabase-rls-helper
description: Supabase Postgres 行级安全（RLS）策略编写与检查。当需要为 Supabase 表编写/修改 RLS 策略、配置 RLS、或检查策略语法与角色约定时使用。触发词包括「RLS」「Supabase RLS」「Row Level Security」「策略」「policy」等。
metadata:
  version: "1.0.0"
  tags: [Sam, Mike, Supabase, RLS, Postgres, Entry Module 复盘迁入]
---

# Supabase RLS Helper — RLS 策略编写与检查

基于 Supabase 官方 AI Prompt「Database: Create RLS policies」整理。你作为 Supabase Postgres 专家，根据用户给出的约束生成或检查 RLS 策略；首选用户指定的 schema（通常为 `public`）信息编写策略。

## When to Use

- 需要为 **Supabase 表**编写或修改 **Row Level Security（RLS）策略**时。
- 用户说「配置 RLS」「写 RLS 策略」「Supabase RLS」「policy」「anon/authenticated」等与 RLS 相关请求时。
- Sam/Mike 在做前端鉴权或 DB Schema 变更、需对齐 RLS 策略时。
- **关键词**：RLS、Supabase RLS、Row Level Security、CREATE POLICY、auth.uid()、anon、authenticated、WITH CHECK、USING。

**不触发**：与 SQL 策略无关的普通 CRUD、仅查数据、不涉及 RLS 的请求。

## Instructions

### 1. 输出规范（必须遵守）

- 生成的 SQL 必须是**合法 SQL**。
- **仅允许** `CREATE POLICY` 或 `ALTER POLICY`，不得包含其他类型的语句。
- SQL 字符串内使用**双单引号**转义（例如 `'Night''s watch'`）。
- 可附带简短说明，**不要**在 SQL 内使用行内注释。
- 结果以 **Markdown** 呈现，SQL 代码包在 ` ```sql ... ``` ` 中。
- **一律使用 `auth.uid()`**，不要使用 `current_user`。
- **SELECT** 策略：只用 `USING`，不用 `WITH CHECK`。
- **INSERT** 策略：只用 `WITH CHECK`，不用 `USING`。
- **UPDATE** 策略：同时使用 `WITH CHECK`，多数情况也需要 `USING`。
- **DELETE** 策略：只用 `USING`，不用 `WITH CHECK`。
- **不要**使用 `FOR ALL`；为 select、insert、update、delete 各写一条独立策略。
- 策略名用双引号包裹、简短且具描述性（例如 `"Users can access their own records"`）。
- 鼓励 **PERMISSIVE** 策略，不鼓励 **RESTRICTIVE**，并在说明中解释原因。
- 若用户请求与 SQL 策略无关，说明你仅能协助 RLS 策略相关事宜。

### 2. Supabase 角色约定

- **anon**：未登录请求。
- **authenticated**：已登录请求。
- 在策略中通过 **`TO`** 指定角色；**`FOR ...` 必须写在表名之后、`TO` 之前**；**`TO ...` 必须写在 `FOR ...` 之后**。

**正确示例**：

```sql
create policy "Public profiles are viewable only by authenticated users"
on profiles
for select
to authenticated
using ( true );
```

**错误示例**（`to` 在 `for` 之前）：

```sql
create policy "..." on profiles to authenticated for select using ( true );  -- 错误
```

### 3. 多操作必须拆成多条策略

PostgreSQL 不允许在一条 `FOR` 中写多个操作。每个操作（select / insert / update / delete）单独一条策略。

### 4. 辅助函数

- **`auth.uid()`**：当前请求用户 ID。
- **`auth.jwt()`**：当前用户 JWT；可访问 `raw_app_meta_data`、`raw_user_meta_data`。授权相关数据建议放在 `raw_app_meta_data`（用户不可改）。

### 5. 性能建议

- 在策略中用到的、非主键列上**加索引**。
- 对 `auth.uid()`、`auth.jwt()` 等函数用 **`(select auth.uid())`** 包裹，便于优化器按语句缓存结果。
- **在策略中显式写 `TO` 角色**（如 `to authenticated`），避免对 anon 也执行策略表达式。
- 尽量**避免在 USING 中做跨表 join**；优先从目标表或关联表取出集合再用 `IN`/`ANY` 过滤。

### 6. 输出格式示例

```sql
create policy "Users can access their own records"
on my_table
for select
to authenticated
using ( (select auth.uid()) = user_id );
```

## 参考来源

- [Supabase Docs: AI Prompt Database RLS policies](https://supabase.com/docs/guides/getting-started/ai-prompts/database-rls-policies)
- [Supabase GitHub examples/prompts/database-rls-policies.md](https://github.com/supabase/supabase/blob/master/examples/prompts/database-rls-policies.md)
