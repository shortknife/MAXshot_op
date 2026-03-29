# A4 架构决策历史 v1.0

> **负责人**：LEO  
> **状态**：v1.0  
> **用途**：记录影响 FSD 与技术架构的关键决策，便于回溯与审计

---

## 一、宪法级约束

| 决策 | 内容 | 出处 |
|------|------|------|
| **Router = 确定性** | Router 必须由代码逻辑实现；LLM 仅作建议，不做调度。 | 产品架构 2.3.1、Architecture Guardrails |
| **Task / Execution 分离** | Task 可变，Execution 不可变；Router 只认 execution_id。 | 产品架构 2.2、FSD 03 |
| **Snapshot 冻结** | Execution 启动时上下文冻结，禁止 lazy join 最新表。 | FSD 03.3 Immutable Snapshot Model |
| **不留痕 = Bug** | 所有决策必须可审计、可回放。 | FSD 02.3、00.1 |

---

## 二、入口与 Intent

| 决策 | 内容 | 出处 |
|------|------|------|
| **输入形态驱动** | Intent Analyzer 调用依据是 entry_type（raw/structured/timeline），不是语义。 | FSD 06.1、架构 2.1.1 |
| **raw_query 独走 Intent Analyzer** | 仅 raw_query 经 Intent Analyzer；structured / timeline 直接封印。 | FSD 06.1 备忘录 |
| **session_context ≠ memory_refs** | session_context 用于指代消解；memory_refs 由 Router 生成，不跨 turn 隐式演化。 | FSD 06.1、06.3 |
| **Intent Analyzer 禁止 capability_chain** | 任务分解权 100% 归属 Router。 | FSD 06.1 |

---

## 三、Soul 与 Evolution

| 决策 | 内容 | 出处 |
|------|------|------|
| **Soul 无 Runtime API** | Soul 仅影响文案/边界清单，不新增调用点。 | LEO-Cat 讨论 § 八 |
| **Evolution = Recommendation Only** | Evolution 对 Router 只能通过 Recommendation；禁止黑箱；必须审计。 | 产品架构 2.7.2、FSD 04.5 |
| **Grey Area 默认 Require Confirmation** | 禁止 LLM 自判风险；风险等级仅来自 Policy/Code。 | FSD 05.3、LEO-Cat 讨论 § 八 |

---

## 四、集成与兼容

| 决策 | 内容 | 出处 |
|------|------|------|
| **借纪律不借运行时** | 兼容 OpenClaw 资产形态（SOUL/USER/AGENTS）；不兼容 Gateway、Agent Loop。 | FSD 07 |
| **不新建 Gateway** | Router 即调度核心；n8n 作为工作流编排层。 | FSD 08 |
| **FSD 唯一存放** | 产品执行级规格以 FSD 为准，技术框架引用 FSD。 | LEO-Cat 讨论 § 7.3 |

---

## 五、宪法条款补充（2026-02）

| 决策 | 内容 | 出处 |
|------|------|------|
| **Soul 治理** | Soul 来源（文档/配置、可版本化）；定义权归属产品/运营；可热更新但须留痕；Meta-Soul 冲突裁决（法律 > 企业 > 产品） | 00.5 § 六 |
| **Grey Area 产品级确认** | 向谁确认（用户/管理员/外部）由 Policy 定义；同一 Grey 不自动学习；Confirmation 可经 Evolution 归因进 Experience | 05.3 § 三 |
| **Degraded Mode 能力上限** | 禁止 side_effect；仅只读/咨询型；须白名单过滤 | 06.5 § 二 |

---

## 六、MVP 架构补全（2026-02）

| 决策 | 内容 | 出处 |
|------|------|------|
| **Intent 溢出/LLM 失败回退** | 明确回退路径：明确失败提示→可选关键词匹配→Continue Chat；审计记录 intent_analyzer_failed | 06.5 § 一 |
| **模型降级路径** | Intent Analyzer 配置 fallback model；主模型不可用时自动切换；可记录 model_used / fallback_occurred | 06.5 § 四 |
| **产品 Skill 与 audit 约束** | audit.used_skills 仅引用 LEO 圈定的产品 Skill 库；MVP 试点 = summarize | 产品架构 4.2.1、大票 §5 |
| **Memory 闭环架构留位** | memory_refs 注入点、Experience 写入契约、检索注入时机已留位；实现 Phase 1.5/2 | 04.2 § 三 |

---

## 七、未来拓展（非 MVP，按需引入）

以下能力**不作为 MVP 交付标准**，在 Phase 1.5/2 或后续版本按 Ops 主链路与 Admin OS 需求再评估引入。详见 `借鉴产品库_Reference_Product_Library_v1.0.md` 及 `MVP架构补全与未来拓展_复盘沉淀_2026-02.md` §三。

| 拓展项 | 来源 | 建议阶段 |
|--------|------|----------|
| Steer / Message Buffer | OpenClaw | Phase 1.5/2 |
| Execution Queue / Lane 隔离 | OpenClaw | Phase 2 |
| 3 级上下文守卫 | OpenClaw | Phase 2 |
| Interrupt 模式 | OpenClaw | Phase 2 |
| 可观测性增强（queue_wait_time、model_used、fallback_count） | 借鉴产品库 | Phase 2 |
| DAG 可视化编排 / Admin OS Playground | Langflow | 未来 Admin OS 迭代 |
| 消息合并器 | OpenDeepWiki | Phase 1.5/2 |

---

## 八、后续决策记录

（新决策在此追加，格式：日期 | 决策摘要 | 出处/讨论）

---

**更新**：决策变更须经 P0 级架构评审。
