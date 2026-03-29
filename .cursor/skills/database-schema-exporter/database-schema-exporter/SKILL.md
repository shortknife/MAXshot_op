---
name: database-schema-exporter
description: 将 Supabase/Postgres 数据库 Schema 导出为 JSON 或类型定义，供 QA 快照、文档或类型安全使用。当需要「导出表结构给 QA」「Schema 快照」「生成 TypeScript 类型」「Schema 文档」时使用。
metadata:
  version: "1.0.0"
  tags: [Mike, Sam, Supabase, Schema, QA, Entry Module 复盘迁入]
---

# Database Schema Exporter — Schema 导出与 QA 快照

为 Supabase/Postgres 项目导出数据库 Schema，生成 JSON 快照或 TypeScript 类型，便于 QA 校验、文档对齐与类型安全开发。

## When to Use

- 需要将 **Supabase 数据库 Schema** 导出为 **JSON 快照**供 QA 或文档使用时。
- 需要为前端/API 生成 **TypeScript 类型**（与 DB 表结构一致）时。
- Mike/Sam 在做 **Schema 变更**后需留档或给 QA 做回归校验时。
- **关键词**：导出 Schema、Schema 快照、supabase schema export、gen types、QA 快照、表结构 JSON。

**不触发**：仅查数据、不涉及 Schema 导出或类型生成的请求。

## Instructions

### 方式 A：supabase-schema-exporter（推荐，JSON + Cursor 集成）

- **安装**：`npm install -g supabase-schema-exporter` 或项目内 `npm install supabase-schema-exporter`。
- **前置**：在 Supabase 项目的 SQL Editor 中执行 [schema_function.sql](https://github.com/PiotrDynia/supabase-schema-exporter/blob/main/schema_function.sql)（该仓库提供）。
- **环境变量**（可选）：在项目根建 `.env`，设置 `SUPABASE_URL`、`SUPABASE_KEY`（Service Role Key）。
- **命令**：
  - 使用参数：`supabase-schema-export -u "项目URL" -k "service_role_key"`
  - 使用环境变量：`export SUPABASE_URL=... SUPABASE_KEY=...` 后执行 `supabase-schema-export -u $SUPABASE_URL -k $SUPABASE_KEY`
  - 自定义输出目录（默认 `.cursor`）：`-o ".cursor-custom"`
- **产出**：
  - `.cursor/supabase-schema.json`：表定义、列类型、约束、外键、索引、Row/Insert/Update 类型等。
  - `.cursor/config.json`：Cursor 配置（Schema 路径等）。
- **用途**：QA 可将 `supabase-schema.json` 作为「当前 Schema 快照」做回归对比；前端可依据其中类型信息做类型安全开发。

### 方式 B：Supabase CLI（类型生成与 dump）

- **生成 TypeScript 类型**（与 DB 一致）：
  ```bash
  npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public
  ```
  或从 Dashboard 生成并下载。
- **数据库导出/备份**：`supabase db dump`（见 [Supabase CLI](https://supabase.com/docs/reference/cli/supabase-db-dump)）。
- **用途**：类型安全 API、Flutter/JS 模型类、防止手写模型与 DB 不一致。

### 3. 与 QA 的约定（可选）

- 若团队约定「QA 回归用 JSON 快照」：每次 Schema 变更后运行方式 A，将生成的 `supabase-schema.json` 提交或归档到约定路径，QA 按版本对比。
- 若需「仅表结构列表/简要说明」：可从 `supabase-schema.json` 的 `definitions` 抽取表名与关键字段，或由本 Skill 指导生成一份简短 Markdown 表结构说明。

### 4. 类型映射参考（Postgres → JSON Schema）

- integer / bigint → integer；numeric → number；text / varchar → string；boolean → boolean；json/jsonb → object；timestamp / date / uuid → string。

## 参考来源

- [supabase-schema-exporter](https://github.com/PiotrDynia/supabase-schema-exporter)
- [Supabase CLI: db dump](https://supabase.com/docs/reference/cli/supabase-db-dump)、[gen types](https://supabase.com/docs/reference/cli/supabase-gen-types)
- [Supabase: Generating TypeScript Types](https://supabase.com/docs/guides/api/rest/generating-types)
