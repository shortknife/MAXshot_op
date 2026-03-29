# 技术选型 v3.0（已确认）

> **版本**: v3.0  
> **创建日期**: 2026-02-05  
> **状态**: ✅ 已确认  
> **重要说明**: **不受之前产品（MAXshot/）技术选择的影响，完全基于 FSD 产品文档重新选型**
> **约束条件**: Router 必须是确定性调度器

---

## 🎯 核心架构要求（基于 FSD）

| 组件 | FSD 要求 | 技术约束 |
|-------|----------|----------|
| **Router** | 确定性调度器 | ❌ 不能用 LLM 直接调度<br>✅ 必须用 Code（确定性逻辑）实现 |
| **Capability** | 可编排能力链 | ✅ 支持 capability_chain 顺序执行 |
| **Intent Analyzer** | 语义理解 | ✅ Natural Language → Intent + Slots |
| **Memory Layer** | 原子化组装 | ✅ Foundation/Experience/Insight 三类记忆 |
| **Admin OS** | 审计 UI | ✅ 可查看 Execution 日志 |

---

## ✅ 决策记录（已确认）

| 决策项 | 决策结果 | 决策日期 | 负责人 |
|---------|----------|----------|--------|
| Router 技术选型 | **Next.js Server Actions** | 2026-02-05 | LEO |
| Capability 技术选型 | **Next.js Server Actions** | 2026-02-05 | LEO |
| Intent Analyzer 模型 | **DeepSeek** (后期优化) | 2026-02-05 | John |
| Memory 技术选型 | **Supabase 方案 B** (新建 + _op 后缀) | 2026-02-05 | Mike |
| Admin OS 技术选型 | **Next.js (App Router)** | 2026-02-05 | Sam |
| 整体架构 | **Next.js 全栈（自包含）** | 2026-02-05 | LEO |

---

## 📊 技术栈总结

| 层级 | 技术选型 | 说明 |
|-------|----------|------|
| **前端** | Next.js (App Router) | ✅ 已 copy admin-os |
| **Router** | **Next.js Server Actions** | ✅ 确定性调度，TypeScript 原生 |
| **Capability** | **Next.js Server Actions** | ✅ 与 Router 统一 |
| **Intent Analyzer** | **DeepSeek** | ✅ 成本优化，后期可切换到 GPT-4 |
| **Memory** | **Supabase 方案 B** (新建 + _op 后缀) | ✅ 结构化存储 + 向量搜索 + RLS |
| **Admin OS** | Next.js + Shadcn/ui | ✅ 已 copy，直接复用 |

---

## 🏗️ 最终技术栈架构

```
┌─────────────────────────────────────────┐
│        MAXshot_opencode v1.0        │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────────┐
        │                           │
    Frontend                 Backend & Logic
    Next.js                  Next.js Server Actions
   App Router                 (Router + Capability)
        │                           │
        └───────────┬───────────────┘
                    │
            ┌────────┴────────┐
            │                 │
        DeepSeek          Supabase
   (Intent Analyzer)    (PostgreSQL + pgvector)
                        │
                 方案 B：新建 + _op 后缀
```

---

## 📋 开发优势

### 1. 技术栈统一
- ✅ 全栈 TypeScript
- ✅ Next.js 统一（前端 + 后端）
- ✅ 无需切换技术上下文

### 2. 开发效率
- ✅ Server Actions 开发效率高
- ✅ TypeScript 类型安全
- ✅ 热重载
- ✅ 自包含（无需外部平台）

### 3. 部署简单
- ✅ Next.js 部署到 Vercel
- ✅ Supabase 数据库托管
- ✅ 无需维护多平台

### 4. 成本控制
- ✅ 无 外部编排（已禁用） 平台费用
- ✅ DeepSeek 成本优化
- ✅ Supabase 免费层足够 MVP

### 5. 完全控制
- ✅ 无外部平台依赖
- ✅ 代码完全自主可控
- ✅ 部署灵活

---

## 🔄 与之前产品对比

| 维度 | 之前产品（MAXshot/） | 新产品（MAXshot_opencode/） |
|-------|----------------------|-----------------------------|
| Router | 外部编排（已禁用） Code Node | Next.js Server Actions |
| Capability | 外部编排（已禁用） Workflow | Next.js Server Actions |
| Intent Analyzer | OpenAI API (GPT-4) | DeepSeek |
| Memory | Supabase | Supabase (方案 B，新建 + _op 后缀) |
| 外部依赖 | 外部编排（已禁用） 平台 | ❌ 无外部平台依赖 |
| 复杂度 | 高（依赖 外部编排（已禁用）） | 低（自包含） |
| 控制权 | 受限于 外部编排（已禁用） | ✅ 完全控制 |

---

## 📝 决策理由

### 1. Router：Next.js Server Actions

**理由**:
- ✅ 完全确定性（TypeScript 代码）
- ✅ 与前端技术栈统一（Next.js）
- ✅ 无需外部依赖（自包含）
- ✅ 开发效率高
- ✅ 易于部署

---

### 2. Capability：Next.js Server Actions

**理由**:
- ✅ 与 Router 技术栈统一
- ✅ 确定性调度
- ✅ 简单直接
- ✅ 开发效率高

---

### 3. Intent Analyzer：DeepSeek

**理由**:
- ✅ 成本优化
- ✅ 性能好
- ⚠️ 语义理解弱于 GPT-4，但 MVP 阶段可接受
- ✅ 后期可切换到 GPT-4 优化质量

---

### 4. Memory：Supabase 方案 B（新建 + _op 后缀）

**理由**:
- ✅ 完全控制数据库结构
- ✅ 使用 `_op` 后缀清晰区分本地/云端数据库
- ✅ 与前端技术栈统一（已有集成）
- ✅ 支持 RLS 策略（有 RLS helper skill）

---

### 5. 整体架构：Next.js 全栈（自包含）

**理由**:
- ✅ 无外部平台依赖
- ✅ 完全控制
- ✅ 部署简单
- ✅ 成本可控
- ✅ 技术栈统一

---

## ✅ 开发准备就绪

**所有决策已确认**，可以开始按照 DEVELOPMENT_PLAN.md 执行开发。

**下一步**:
1. 执行 Copy 清单（COPY_CHECKLIST.md）
2. 创建 Supabase 新项目（方案 B）
3. 配置数据库表（使用 _op 后缀）
4. 开始 Phase 0：环境准备
