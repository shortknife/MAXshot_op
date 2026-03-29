# CC-04 ContentGenerator — 产品级契约

> **Owner**: LEO  
> **版本**: v1.0 | **阶段**: P1  
> **依据**: MAXshot_产品架构设计_v5.1 §2.4 Capability Layer

---

## 1. 产品定义

ContentGenerator 根据 Soul（品牌声音）、渠道模板和当前数据上下文，生成可发布的内容草稿，并为每条内容打上完整标签，支撑后续归因分析。

**一句话**：有灵魂的内容生成 + 结构化标签，为归因闭环打地基。

---

## 2. 内容类型支持

| 类型 | 说明 | 渠道 |
|------|------|------|
| `single_tweet` | 单条推文 | Twitter/X |
| `thread` | 线程/教育内容 | Twitter/X |
| `notion_doc` | Notion 文档 | Notion |
| `reply` | 被动/主动回复 | Twitter/X |

---

## 3. 标签系统（强制输出）

每条生成内容**必须**携带完整的四维标签：

| 维度 | 字段 | 枚举示例 |
|------|------|---------|
| 风格 | `tag_style` | `educational` / `narrative` / `data_driven` |
| 时间 | `tag_time_slot` | `morning` / `afternoon` / `evening` |
| 话题 | `tag_topic` | `defi` / `yield` / `market_update` |
| 渠道 | `tag_channel` | `twitter_main` / `notion` |

标签在内容生成时**同步写入**，不能事后补打。

---

## 4. 输入

```
content_type: string            // 内容类型
prompt_context: object          // 数据上下文（来自 DataFactQuery 或 ContextAssembler）
soul_config: object             // Soul 品牌声音配置
channel_template_id: string     // 渠道模板 ID
user_id: string
execution_id: string
```

---

## 5. 输出

```
content_id: string
content_draft: string           // 生成的内容文本
content_type: string
tags: {
  style: string,
  time_slot: string,
  topic: string,
  channel: string
}
attribution_ready: boolean      // 标签是否完整，可进入归因
prompt_id_used: string          // 使用的 Prompt ID（可追溯）
generation_metadata: object     // 模型、版本等生成元数据
```

---

## 6. Soul 约束

- 生成内容必须通过 Soul 校验（品牌声音检查）
- 若不符合品牌声音，返回 `soul_check_failed: true`，内容不进入发布队列
- Soul 配置来源：`Static Soul`（v5.1 主要模式），不使用动态 Soul 生成

---

## 7. Side Effect 规则

- ContentGenerator 本身**不发布**内容，只生成草稿
- 生成完成后写入：`content_attribution`（标签+归因基础）
- 发布操作必须由 Publisher Capability 独立触发（含确认流程）

---

## 8. 验收标准

- [ ] 每条生成内容都携带完整四维标签（无空值）
- [ ] `prompt_id_used` 字段存在，可追溯到 `prompt_library` 中的具体记录
- [ ] Soul 校验失败时不进入发布队列
- [ ] 生成内容不直接调用发布 API
- [ ] `attribution_ready = true` 时表示标签完整，可进入归因分析

---

## 9. 场景对话示例（验收基线 & 跨角色共识）

**场景 A：生成单条推文**
```
用户: 帮我写一条关于 DeFi 收益策略的推文
系统: [草稿] Yield isn't luck—it's discipline. Our vaults run 24/7 so you don't have to.
      标签: style=data_driven / time=morning / topic=yield / channel=twitter_main
      attribution_ready: true
```

**场景 B：生成教育 Thread**
```
用户: 用教育风格写一条 Thread，讲金库运作原理
系统: [Thread 草稿]
      1/5 你知道 DeFi 金库是怎么帮你赚钱的吗？
      2/5 简单说，金库把你的资金自动分配到收益最高的协议...
      ...
      标签: style=educational / topic=defi / channel=twitter_main
```

**场景 C：Soul 校验失败**
```
用户: 写一条推文说我们的收益保证 100% 无风险
系统: 内容未通过品牌声音校验——「保证无风险」违反诚实原则。请调整表述后重试。
      soul_check_failed: true（不进入发布队列）
```

**场景 D：边界外拒绝**
```
用户: 帮我查一下 USDC 金库的 APY
系统: 数据查询请直接问「USDC 金库 APY 多少？」，我会帮你走数据事实查询。
```

---

## 10. 不在本 Capability 范围内

- 内容发布（属于 Publisher）
- 内容归因分析（属于 Evolution Engine）
- 反馈数据收集（属于 Feedback Recorder，Publisher 触发）

---

**契约版本**: v1.0 | **最后更新**: 2026-02-19
