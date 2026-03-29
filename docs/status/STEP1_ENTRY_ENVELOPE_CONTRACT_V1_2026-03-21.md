# Step 1 Entry Envelope Contract v1

- Date: 2026-03-21
- Status: Frozen / Accepted for MVP
- Scope: `Step 1 - Entry（多通道归一）`
- Role: 主流程测试与后续整体回归的统一依据
- MVP baseline: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
- Workflow subset: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`
- Freeze sync: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_FREEZE_SYNC_2026-03-28.md`

## 1. 定义

Step 1 的职责是：

- 接收任意 channel 的原始输入
- 统一收敛为标准 JSON 结构
- 无损传递给后续流程

Step 1 不负责：

- 新问题 / 补充问题判断
- 业务语义识别
- capability 匹配
- gate 决策
- clarification 判断

这些职责应在后续步骤处理，尤其是 `Step 2 - Context Load` 与 `Step 3 - Intent 识别`。

## 2. 标准输出结构

Step 1 输出必须满足以下 JSON Contract：

```json
{
  "entry_channel": "web_chat",
  "session_id": "session_xxx",
  "request_id": "req_xxx",
  "raw_query": "当前 vault APY 怎么样？",
  "received_at": "2026-03-21T03:20:00.000Z",
  "requester_id": null,
  "entry_meta": {}
}
```

## 3. 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `entry_channel` | `string` | 是 | 入口来源，如 `web_chat`、`telegram`、`notion`、`system` |
| `session_id` | `string \| null` | 是 | 会话标识；没有则显式传 `null` |
| `request_id` | `string` | 是 | 单次请求唯一标识 |
| `raw_query` | `string` | 是 | 用户原始输入，必须无损保留 |
| `received_at` | `string` | 是 | ISO8601 时间戳 |
| `requester_id` | `string \| null` | 是 | 请求者标识；未知则 `null` |
| `entry_meta` | `object` | 是 | channel 附加信息；无则 `{}` |

## 4. 允许值与约束

- `raw_query`
  - 必须保留用户原始文本
  - 不允许在 Step 1 改写为业务解释文本
- `entry_channel`
  - 必须反映真实来源
  - 当前最稳定入口是 `web_chat`
- `entry_meta`
  - 允许为空对象
  - 用于存放 channel 原生附加字段
- `session_id`
  - 可以为 `null`
  - 不能因为缺失而阻止请求进入后续主链

## 5. Step 1 禁止输出字段

以下字段不得在 Step 1 作为“已判断结果”输出：

- `is_follow_up`
- `is_new_question`
- `intent_type`
- `matched_capability_ids`
- `primary_capability_id`
- `scope`
- `need_clarification`
- `gate_result`

原因：这些都不是纯入口标准化职责。

## 6. 当前实现与目标架构差异

当前代码中，入口附近仍有少量“新问题 vs 旧澄清”防串场逻辑。

这属于现阶段工程补丁，用于避免明显错误：

- 新问题被旧 APY 澄清吞掉
- 产品定义问题误被当成业务补充

但从产品分层定义看，这部分最终应迁移到：

- `Step 2 - Context Load`

因此，本 Contract 作为后续测试与架构收口的目标依据：

- 允许当前实现存在临时补丁
- 但验收口径仍以“Step 1 是纯 Entry 标准化层”为准

## 7. 验收标准

Step 1 通过标准：

1. 任意 channel 输入可收敛成统一 JSON 结构
2. `raw_query` 无损保留
3. 缺少 `session_id` 不阻断后续流程
4. 不在 Step 1 产出业务语义判断结果

## 8. 用途

本文件作为以下工作的统一依据：

- 后续整体测试
- 9 步主流程验收
- Step 1 / Step 2 职责边界讨论
- 架构收口时的分层判断
