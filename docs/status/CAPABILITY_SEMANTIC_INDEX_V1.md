# Capability Semantic Index v1

- 版本：v1.0
- 日期：2026-03-07
- 适用范围：MAXshot `Router -> Capability` 调度层，首个落地对象为 `business_data_query`

## 1. 定义

`Capability Semantic Index` 不是数据库索引，也不是 SQL 模板集合。

它是一个能力的结构化语义描述层，用来回答三个问题：

1. Router 看到用户 Query 后，为什么应该调用这个 capability
2. capability 收到 Query 后，应该补哪些槽位、默认哪些口径
3. 槽位齐备后，应该走哪条 SQL 计划，而不是让模型从零猜 SQL

一句话定义：

- `Skill` 描述能力边界
- `Semantic Index` 描述能力如何被稳定调用
- `Capability Runtime` 真正执行

## 2. 为什么要引入这一层

当前 `Text-to-SQL` 直接生成的问题：

- 对固定业务库来说，开放式 SQL 生成错误率仍然偏高
- 数据库表少、字段稳定，但系统没有把这种确定性吃满
- 用户自然语言多样，但最终落到的查询维度其实有限
- 若没有中间语义层，Router 只能靠规则和 prompt 硬拼

MAXshot 当前数据库特征：

- 核心业务表少，约 4-5 张
- 字段相对稳定
- 数据按固定频率写入
- 高价值问题集中在少数业务主题：`vault / yield / execution / rebalance`

因此更合理的方案不是“完全开放式 Text-to-SQL”，而是：

`自然语言 -> Semantic Index -> 槽位补全 -> SQL Plan -> 执行`

Vanna 这类 provider 仍然保留，但角色降为：

- `主路径`：Index 驱动的受控 SQL 计划
- `兜底路径`：Index 无法覆盖时，再走 Vanna provider

## 3. 与现有架构的关系

### 3.1 Router

Router 不直接理解数据库。

Router 只需要：

- 判断用户 Query 属于哪个业务能力
- 把 Query 交给对应 capability
- 依赖 capability 的 semantic index 做后续结构化

### 3.2 Capability

每个 capability 应拆为三层：

1. `Contract`
   - 输入输出协议
   - 安全边界
   - 审计要求
2. `Semantic Index`
   - 意图类型
   - 槽位
   - 默认值
   - 执行计划
3. `Runtime`
   - 查询 / 调用 / 生成 / 回写的真实执行逻辑

### 3.3 Skill

Skill 更偏“能力说明书”。

Semantic Index 更偏“机器可执行说明书”。

所以准确关系是：

- Skill 是上层语义资产
- Semantic Index 是结构化执行面
- Capability 是运行时能力

## 4. Semantic Index 最小结构

一个 capability index 至少应包含：

### 4.1 Source Profile

- 可使用的表 / 视图 / RPC 白名单
- 字段的业务含义
- 指标字段是状态值还是事件值
- 时间字段定义

### 4.2 Intent Catalog

- 该 capability 支持哪些问题类型
- 每类问题有哪些典型问法

### 4.3 Slot Schema

- required slots
- optional slots
- default values
- clarification order

### 4.4 Semantics

- 指标口径
- 聚合规则
- 去重规则
- 默认时区

### 4.5 SQL Plan Binding

- 对应哪条 SQL 模板 / planner
- fallback provider 是谁

## 5. Data Query 的第一性原则

对 `business_data_query`，当前产品定义应固定为：

1. 用户先用自然语言提问
2. 系统先补足关键槽位
3. 槽位不全时，先澄清，不先写 SQL
4. 槽位齐备后，再生成或组装 SQL
5. 返回结果时必须说明系统当前理解口径

这意味着：

- `当前 vault APY 怎么样？`
  - 不是直接执行
  - 应先确认时间范围
- `最近7天`
  - 默认口径应理解为：`最近7天平均 APY`
- `TVL`
  - 是状态值，不是流量值
  - 默认应取最新快照，再汇总

## 6. business_data_query 的首批标准意图

建议先固定 6 类：

1. `vault_list`
2. `yield_summary`
3. `yield_trend`
4. `yield_ranking`
5. `execution_detail`
6. `execution_summary`

这 6 类已经覆盖当前 MVP 绝大多数高频查询。

## 7. 默认语义规则（v1）

以下规则建议收敛为系统标准：

### 7.1 APY

- 用户只说 `最近7天 APY`
- 默认解释为：`最近7天平均 APY`

### 7.2 TVL

- `TVL` 为状态值
- 默认口径：`最新快照 TVL`
- 汇总口径：按最新快照汇总，不累计历史样本

### 7.3 时间

- 默认时区：`Asia/Shanghai`
- 未给时间范围且问题依赖时间时，必须先澄清

### 7.4 追问

- `下一步建议` 不是按钮流程
- 它只是示例追问
- 真正的交互入口仍然是自然语言输入框

## 8. 为什么它适合泛化到其他数据库

你提出的核心判断是成立的：

- 多数业务数据库 schema 变化不频繁
- 表和字段是可以被扫描的
- 可先生成 index draft，再人工校准

因此未来泛化能力的重点不应该是“泛化 SQL 猜测”，而应该是：

1. 扫描 schema
2. 生成 `schema profile`
3. 生成 `semantic index draft`
4. 人工确认语义
5. 上线 capability

这样复用的是：

- Index 生成流程
- Contract
- Runtime 框架

而不是复用某个单一 SQL prompt。

## 9. 与 Vanna 的边界

Vanna 仍然有价值，但角色应该后退一层。

### 9.1 不再让 Vanna 负责

- 多轮澄清
- 业务默认口径
- 结果解释
- Router 选路

### 9.2 让 Vanna 负责

- 在槽位清晰后生成候选 SQL
- 作为 planner / fallback provider

所以最终关系应是：

`Router -> Capability Semantic Index -> SQL Plan / Vanna Provider -> Gate -> Execution`

## 10. 落地建议

当前阶段建议分两步：

### Step 1

先为 `business_data_query` 建第一版 index 文件：

- 固定 sources
- 固定 intent types
- 固定 slot schema
- 固定默认口径
- 固定 SQL plan id

### Step 2

后续逐步把现有 if/else 分支收敛到：

- `intent -> slot filling`
- `slot state -> plan selection`
- `plan selection -> runtime execution`

## 11. 当前结论

对于 MAXshot 现阶段：

- 完全开放式 Text-to-SQL 不是主路径
- `Capability Semantic Index` 才是主路径
- Vanna 应作为 fallback / planner provider

这条路线比继续堆硬规则更稳定，也比纯模型猜 SQL 更适合固定业务库。
