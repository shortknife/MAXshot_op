# A1 术语表 v1.0

> **负责人**：LEO  
> **状态**：v1.0  
> **关联**：`00_Read_First/00.3_Glossary_Concept_Map.md` 为核心来源；本附录为扩展与速查

---

## 一、与 00.3 的关系

**00.3** 为 FSD 入口术语，必读。**A1** 在 00.3 基础上补充 Appendix 及跨文档引用常用术语，便于速查。

---

## 二、核心术语（与 00.3 一致）

| 术语 | 定义 |
|------|------|
| Task | 任务定义（元数据、Schedule、Config）。可变。 |
| Execution | 执行记录（状态、结果、审计）。不可变。 |
| Snapshot | Execution 启动时冻结的完整上下文。 |
| Entry | 输入模块，负责 Gate 判定与封印。 |
| Router | 确定性调度器，只认 execution_id，编排 Capability Chain。 |
| Capability | 被认证可编排的产品能力，Runtime 唯一公民。 |
| Skill | 实现来源（代码/Prompt/Workflow），Capability 的内部填充物。 |
| Working Mind | 针对当前 Task 实时合成的认知上下文（Soul + Memory 原子）。 |
| Memory Atom | Foundation（规则）/ Experience（经验）/ Insight（洞察）的原子单元。 |
| Soul | 价值观与风格的滤镜。横切，无 API。 |
| Evolution Engine | 目标→假设→行动→归因→反思的闭环，产出 Insight。 |
| Recommendation | Evolution 对 Router 的影响形式，必须可审计。 |

---

## 三、入口与输入

| 术语 | 定义 |
|------|------|
| EntryRequest | 统一输入协议，含 entry_type、payload、meta、idempotency_key 等。 |
| raw_query | Telegram / Chat UI 文本，必走 Intent Analyzer。 |
| structured | 定时任务、Notion、webhook 等，跳过 Intent Analyzer。 |
| timeline | publishing_timeline 到期扫描，防重锁 + 分发。 |
| session_context | Context Load 生成的一次性快照，供 Intent Analyzer 指代消解；不跨 turn 演化。 |
| memory_refs | Router 在 Task Decomposition 时生成的 Memory 原子引用，供 Capability 使用。 |

---

## 四、拒绝与审计

| 术语 | 定义 |
|------|------|
| Entry Reject | 不在职责范围，不接单。 |
| Capability Reject | 无法胜任，不执行。 |
| Soul Reject | 价值/安全/冒犯，不允许输出。 |
| Continue Chat | 信息不足，澄清而非拒绝。 |
| Grey Area | 策略未明确定义的情形；默认 Require Confirmation，禁止 LLM 自判风险。 |
| pending_confirmation | 需人工确认后才执行的 Execution 状态。 |

---

## 五、技术实现相关

| 术语 | 定义 |
|------|------|
| Intent Analyzer | 函数式能力，将 raw_query 转为 intent + extracted_slots；严禁输出 capability_chain。 |
| Sealer | 写入 Task + Execution，返回 execution_id。 |
| Context Load | 为 raw_query 路径提供 session_context。 |
| execution_id | Router 唯一入口；贯穿 Audit、Replay。 |
| **Degraded Mode** | Context Load 失败时的降级模式；**仅只读/咨询型能力**，禁止 side_effect；见 06.5 § 二。 |

---

**更新**：术语变更须与 00.3 及产品架构 v5.0 一致。
