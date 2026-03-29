# A5 MemU 参考与实现提示

> **创建日期**：2026-02  
> **性质**：附录参考文档，**非 FSD 规格变更**  
> **来源**：https://github.com/NevaMind-AI/MemU  
> **定位**：供 Technical Architecture / Integration Spec 设计时选择性采纳，不改变 FSD 已定义规格。

---

## 1. 文档定位

- **本附录是「实现参考」**，不是新的产品需求。
- FSD 00–09 定义的是 **What**（行为、边界、拒绝路径等），已冻结。
- 本附录提供 **How** 的实现思路，供 Cat 在技术设计时评估、采纳或 defer。
- **FSD 主体文档无需因本附录而修改。**

---

## 2. MemU 项目简述

| 维度 | 内容 |
|------|------|
| **定位** | 24/7 proactive memory framework for AI agents（面向 OpenClaw / Moltbot / Clawdbot） |
| **核心价值** | 降低长期运行 Agent 的 LLM token 成本；记忆结构化、可搜索、可扩展 |
| **与 MAXshot 关系** | 同为 OpenClaw 生态；MemU 偏「用户记忆」，MAXshot 偏「产品能力记忆」 |

---

## 3. 可借鉴的机制（供技术设计参考）

| MemU 能力 | MAXshot 对应 | 借鉴建议 |
|-----------|--------------|----------|
| **Memory as File System 隐喻** | Atomic Memory（Foundation / Experience / Insight） | 可用「目录 + 文件」隐喻辅助理解：Foundation ≈ 固定规则目录，Experience / Insight ≈ 可扩展事实与洞察。可在 Technical Architecture 的 Memory 章节作说明性补充。 |
| **retrieve() 双模式** | Working Mind Synthesis | Router 合成 memory_refs 时可区分：① 快速路径（embedding + weight 过滤）；② 深度路径（冲突裁决、复杂归因时用 LLM）。具体是否采用由技术设计决定。 |
| **Cost efficiency 策略** | Evolution Engine、Context 装配 | 缓存 Insight、避免 redundant LLM 调用；Attribution 能 rule-based / 统计完成的优先，必要时再用 LLM。 |
| **Main Agent ↔ MemU Bot 分离** | Router ↔ Evolution Engine | 保持 Evolution 与 Router 解耦；Evolution 产出 Recommendation，Router 决定是否采纳。已与 FSD 04.5 一致，可作架构说明补充。 |
| **Proactive context loading** | memory_refs 预加载 | 对高权重、高置信度 Insight 做「意图预测预加载」，在 Task Decomposition 时优先召回。可选实现优化。 |
| **Cross-references** | Insight 间关联 | `agent_memories` 表可考虑 `related_insight_ids` 或等价字段，支持 Insight 推理链。与 Mike 的 DB 设计讨论时参考。 |

---

## 4. 不建议直接照搬

| MemU 能力 | 原因 |
|-----------|------|
| **User Intention Capture** | MemU 围绕「理解用户意图、偏好」；MAXshot 围绕「产品能力进化」，不做用户记忆演化。 |
| **memU Bot 作为独立 sidecar** | MAXshot 的 Evolution 是 Working Mind 的时间延伸，不是独立服务。 |
| **直接集成 MemU 运行时** | 与 OpenClaw 策略一致：**借机制，不借 Runtime**。 |

---

## 5. 技术设计时的使用方式（给 Cat）

1. **Technical Architecture**：在设计 Working Mind / memory_refs / Evolution 相关章节时，可查阅 § 3 作为实现选项。
2. **Integration Spec**：在 Router ↔ Evolution、Context 装配、成本控制策略等部分，可选择性引用本附录的思路。
3. **DB 设计（与 Mike 协作）**：`agent_memories` 的扩展（如 cross-reference 字段）可参考 § 3 最后一项。
4. **本附录不触发 FSD 变更**：采纳与否由技术设计决定，无需更新 FSD 00–09。

---

**附录结束**
