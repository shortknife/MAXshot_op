# CC-06 ContextAssembler — 产品级契约

> **Owner**: LEO  
> **版本**: v1.0 | **阶段**: P1  
> **依据**: MAXshot_产品架构设计_v5.1 §2.5 Memory Layer

---

## 1. 产品定义

ContextAssembler 在每次 Capability 执行前，从 Memory Layer 中加载相关的上下文信息（品牌指南、渠道模板、历史洞察），为内容生成和查询提供一致的背景。

**一句话**：执行前的上下文装配器，让每次生成都记得"我是谁、我在哪"。

---

## 2. Memory 类型

| 类型 | 说明 | v5.1 状态 |
|------|------|---------|
| `Foundation` | 品牌声音、渠道模板、产品定义 | ✅ P1 实现 |
| `Experience` | 历史执行记录、成功模式 | ⚠️ 仅离线分析，不参与运行时推断 |
| `Insight` | Evolution Engine 产出的策略建议 | ⚠️ Recommendation Only，不自动注入 |

**v5.1 约束**：`Experience` 和 `Insight` 在 MVP 阶段不参与实时推断，仅供离线分析和人工查阅。

---

## 3. 输入

```
capability_name: string         // 调用方 Capability
session_id: string
user_id: string
memory_types: string[]          // 需要加载的 Memory 类型，如 ['Foundation']
context_keys: string[]          // 需要加载的具体配置键，如 ['brand_voice', 'channel.twitter']
```

---

## 4. 输出

```
memory_refs: string[]           // 已加载的 Memory 引用 ID 列表
context: {
  brand_guidelines: object,     // 品牌声音配置
  channel_templates: object,    // 渠道模板
  soul_config: object           // Static Soul 配置
}
memory_type: string             // 主要 Memory 类型
loaded_at: string               // 加载时间戳
```

---

## 5. Side Effect 规则

- ContextAssembler 是**只读**操作，不写入任何数据
- 禁止在运行时根据 Insight 自动修改生成参数（Recommendation Only 原则）
- 品牌指南的写入/更新通过 Admin OS 配置界面独立操作，不经过此 Capability

---

## 6. 调用时机

ContextAssembler 不被 Router 直接调度，而是由 ContentGenerator 在生成前**主动调用**：

```
ContentGenerator 执行流程：
1. 调用 ContextAssembler → 获取 context
2. 将 context 注入 Prompt
3. 调用 LLM 生成内容
4. Soul 校验 → 输出草稿
```

---

## 7. 验收标准

- [ ] `brand_guidelines` 和 `channel_templates` 正确从 Memory Layer 加载
- [ ] `memory_refs` 在输出中存在（可追溯）
- [ ] `Experience` 类型的 Memory 不在运行时注入（仅离线可见）
- [ ] `Insight` 类型的 Memory 不自动修改 Prompt（只读展示）
- [ ] 加载失败时有明确降级行为（使用默认配置，记录 audit_log）

---

## 8. 不在本 Capability 范围内

- Memory 数据的写入和更新（属于 Admin OS 配置操作）
- Soul 内容的生成（属于 ContentGenerator + Soul Layer）
- Evolution Insight 的生成（属于 Evolution Engine）

---

**契约版本**: v1.0 | **最后更新**: 2026-02-19
