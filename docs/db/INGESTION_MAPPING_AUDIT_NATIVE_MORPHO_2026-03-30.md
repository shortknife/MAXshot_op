# Native / Morpho 数据入库映射审计

Date: 2026-03-30  
Workspace: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode`
Reference workflows:
- `/Users/alexzheng/Downloads/18_Native_Clean_Execution_Log_deploy.json`
- `/Users/alexzheng/Downloads/19_Morpho_Clean_Execution_Log_deploy (1).json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/18_Native_Clean_Execution_Log_deploy_v2_结构事实_v1.0.json`

## 1. 审计结论

结论分两层：

1. 现有入库骨架是统一的，问题不在“Native 和 Morpho 是两套完全不同体系”。
2. 当前数据库质量问题主要来自 ingestion gate 不够硬，而不是调度器本身。

对当前产品的直接判断：
- 覆盖度：基本够用
- 质量：不够好，不能视为已经治理完成的统一真相源

最核心的问题是 4 个：
- 生产 / staging / testnet 事实混库
- 核心事实字段存在空值或空字符串污染
- `executions` 表语义有漂移迹象
- 原始日志层 `execution_logs` 不稳定或缺失，导致追溯链不完整

## 2. 两个工作流的结构结论

虽然两个工作流的源日志结构不同，但主干几乎一致：

1. 接收原始执行日志
2. `Step8_AnalyzeDataStructure`
3. `Step9_CleanBasedOnAnalysis`
4. `Step10_PrepareDatabaseData`
5. `Step11_PrepareRPCJSONData`
6. `Step12_CallRPCProcessLogData`
7. `Step13_ExtractExecutionID`
8. `Step14_BuildRAGDocument`
9. 写 Vector Store

这说明工程方向应该是：
- 一套 shared ingestion contract
- 两个 source adapter
- 不应该继续维护两套各自演化的入库逻辑哲学

## 3. 当前工作流职责分层

### 3.1 `Step9_CleanBasedOnAnalysis`
职责：对原始执行日志做瘦身，保留少量业务关键节点。

保留重点：
- 主执行元信息：`id / workflowId / status / createdAt / startedAt / stoppedAt / finished`
- 子执行元信息：`id / workflowId / status / createdAt / startedAt / stoppedAt / parentExecution`
- 关键节点：
  - `Summary`
  - `Rebalance Check`
  - `Current Info`
  - `lastRebalancerInfo`

风险：
- 这是第一次强裁剪。
- 一旦这里丢字段，后面 RPC 已无法恢复。

### 3.2 `Step10_PrepareDatabaseData`
职责：构建 execution 级基础记录。

输出重点：
- `execution_log.execution_id`
- `workflow_id`
- `status`
- `is_success`
- `created_at`
- `started_at`
- `stopped_at`
- `finished`
- `execution_duration_ms`
- 清洗压缩统计

风险：
- 这里仍然保留了 `execution_log` 概念，但数据库中对应 raw 层目前并不稳定。

### 3.3 `Step11_PrepareRPCJSONData`
职责：把 cleaned log 规整成 `process_log_data_v4` 所需 JSON。

输出重点：
- 顶层：
  - `workflowId`
  - `status`
  - `createdAt`
  - `startedAt`
  - `stoppedAt`
  - `vaultName`
- `markets[]`
- `allocationData[]`
- `rebalanceDecision`
- `is_critical_event`

这个节点是事实表写入的真正 authority。

### 3.4 `Step14_BuildRAGDocument`
职责：只对重要事件构建 narrative / metadata 文档，写入 RAG 库。

关键事实：
- RAG 不是全量日志镜像
- RAG 只承载“重要因果与解释文本”
- 这和当前 `execution_logs_rag` 数量远小于 `executions` 是一致的

## 4. Source -> Cleaned -> RPC -> DB 映射

### 4.1 执行级字段

| 原始 / cleaned 来源 | RPC 字段 | 目标表 / 字段 | 当前判断 |
|---|---|---|---|
| `data.workflowId` | `workflowId` | `executions.workflow_id` | 应为必填，但库中存在空值 |
| `data.status` | `status` | `executions.status` | 有值，但语义混杂风险存在 |
| `data.createdAt` | `createdAt` | `executions.created_at` | 应稳定 |
| `data.startedAt` | `startedAt` | `executions.start_time` 或等价字段 | 需确认映射名 |
| `data.stoppedAt` | `stoppedAt` | `executions.stop_time` 或等价字段 | 需确认映射名 |
| `summary.name` | `vaultName` | `executions.vault_name` | 理论上可提取，库中仍有极少空值 |

### 4.2 市场快照字段

| cleaned 来源 | RPC 字段 | 目标表 / 字段 | 当前判断 |
|---|---|---|---|
| `market.chain` / `currentInfo.chainName` | `markets[].chain` | `market_metrics.chain` | 存在 staging/testnet 污染 |
| `market.protocolName` | `markets[].protocolName` | `market_metrics.protocol` | 基本稳定 |
| `market.market` | `markets[].market` | `market_metrics.market_name` | 空字符串污染明显 |
| `market.totalSupplied` | `markets[].tvl` | `market_metrics.tvl` | 基本存在 |
| `market.supplyApy` | `markets[].baseApy/netApy` | `market_metrics.base_apy/net_apy` | 基本存在 |
| `strategies[0].workflowParams.gasCost` | `markets[].estDepositGas` | `market_metrics.est_deposit_gas` | 可能非全量 |

### 4.3 分配快照字段

| cleaned 来源 | RPC 字段 | 目标表 / 字段 | 当前判断 |
|---|---|---|---|
| `alloc.chain` / `currentInfo.chainName` | `allocationData[].chain` | `allocation_snapshots.chain_name` | 存在 staging/testnet 污染 |
| `alloc.protocolName` | `allocationData[].protocolName` | `allocation_snapshots.protocol_name` | 基本稳定 |
| `alloc.market` | `allocationData[].market` | `allocation_snapshots.market` | 空字符串污染明显 |
| `alloc.asset` | `allocationData[].asset` | `allocation_snapshots.asset` | 基本稳定 |
| `alloc.totalAllocated` | `allocationData[].totalAllocated` | `allocation_snapshots.total_allocated` | 基本稳定 |
| `alloc.idleLiquidity` | `allocationData[].idleLiquidity` | `allocation_snapshots.idle_liquidity` | 基本稳定 |

### 4.4 再平衡决策字段

| cleaned 来源 | RPC 字段 | 目标表 / 字段 | 当前判断 |
|---|---|---|---|
| `rebalanceCheck.rebalanceNeeded` | `rebalanceDecision.rebalanceNeeded` | `rebalance_decisions.rebalance_needed` | 基本稳定 |
| `rebalanceCheck.reason` | `rebalanceDecision.rebalanceReason` | `rebalance_decisions.rebalance_reason` | 基本稳定 |
| `conditions.waitingPeriodBlocked` / reason fallback | `rebalanceDecision.is_blocked` | `rebalance_decisions.is_blocked` | 基本稳定 |
| `conditions.thresholdsMet / waitingPeriod` | `rebalanceDecision.threshold_details` | `rebalance_decisions.threshold_details` | 基本稳定 |

### 4.5 RAG 字段

| 来源 | 写入目标 | 当前判断 |
|---|---|---|
| `Step14_BuildRAGDocument` narrative | `execution_logs_rag.content` | selective 写入，符合设计 |
| `execution_id` / chain / vault / tags | `execution_logs_rag.metadata` | 基本合理 |

## 5. 当前数据库质量观察

### 5.1 行数覆盖

| 表 | 当前量级 |
|---|---:|
| `executions` | 36,652 |
| `market_metrics` | 577,870 |
| `allocation_snapshots` | 819,955 |
| `rebalance_decisions` | 36,489 |
| `execution_logs_rag` | 6,710 |
| `dim_vaults` | 6 |

判断：
- 事实表覆盖度已足够支撑当前产品主查询
- `execution_logs_rag` 明显是 selective RAG，不是全量镜像

### 5.2 明显质量问题

#### A. 环境污染

| 检查项 | 数量 |
|---|---:|
| `market_metrics` 中 testnet/staging-like | 49,364 |
| `allocation_snapshots` 中 testnet/staging-like | 379,337 |
| `rebalance_decisions` 中 testnet/staging-like | 14,916 |

判断：
- 查询层虽然可过滤，但数据层并不干净
- 这是 ingestion gate 缺失，不是产品查询本身的问题

#### B. 核心字段空值 / 空串

| 检查项 | 数量 |
|---|---:|
| `executions.workflow_id IS NULL` | 163 |
| `executions.vault_name IS NULL` | 2 |
| `market_metrics.market_name = ''` | 29,575 |

判断：
- `workflow_id` 和 `market_name` 这些字段不应直接进入 canonical fact 表而不做隔离

#### C. raw 层不完整

- workflow / 文档都指向 `execution_logs` + `execution_logs_rag`
- 实库中 `execution_logs` 当前不可用 / 不存在
- 只剩 `execution_logs_rag`

判断：
- 这会削弱回放、追溯、重清洗能力
- 目前缺一个稳定的 bronze/raw 层

#### D. `executions` 语义漂移

最新样本中可见：
- `workflow_id = null`
- `status = "200"`
- `vault_name = null`
- `created_at = null`

判断：
- 这不像纯粹的 workflow execution fact
- 说明 `executions` 可能混入了不同语义来源或异常写入路径

## 6. 关键判断：问题到底出在哪里

当前最可能的问题层次如下：

### 6.1 不是主要问题的层
- 调度器本身
- 定时触发机制

原因：
- 即使把调度器从历史工作流迁到脚本/cron，坏数据仍会坏
- 当前问题本质不是“触发方式不对”，而是“清洗和入库 gate 不够硬”

### 6.2 真正的问题层
- source adapter 没有显式 contract
- cleaned 层没有字段保真审计
- RPC 入参没有足够严格的必填校验
- 事实表前没有 quarantine / reject gate
- 环境标签没有在 canonical facts 里显式分层

## 7. 建议的工程方向

## 7.1 短期建议
继续保留现有工作流做触发，但不要再把核心质量逻辑埋在工作流代码节点里。

应该做：
1. 定义 shared ingestion contract
2. 明确 `Native adapter` 和 `Morpho adapter`
3. 把 normalize / validate / write 的核心逻辑代码化
4. 工作流只负责触发和编排

## 7.2 中期建议
建立事实分层：
- `raw archive`：原始日志或最小原始归档
- `cleaned canonical payload`：统一的 RPC 前 JSON
- `fact tables`：`executions / market_metrics / allocation_snapshots / rebalance_decisions`
- `rag documents`：仅重要事件

## 7.3 必须补的质量 gate

至少要加这几项：
1. `workflow_id` 必填
2. `vault_name` 对 execution 必须可解析，否则隔离
3. `market_name` 空字符串不得直接进 canonical fact 表
4. `environment` 必须明确：`prod | staging | test`
5. test/staging 数据不得直接混入 prod 统计面
6. 入库失败或字段不完整的 payload 进入 quarantine，而不是静默写入事实表

## 7.4 RAG 策略判断
当前“只把重大决策写 RAG”这个策略本身没有问题。

理由：
- 执行日志更新频率高
- 事实重复度大
- 大量日志没有新信息增量
- narrative / vector store 本来就不适合做全量时序镜像

所以 RAG 这里不建议改成全量写入。真正要改的是：
- 重大事件判定规则要代码化、可测试
- RAG 和 facts 要共享同一 execution authority

## 8. n8n 还是脚本

不建议现在把问题简化成二选一。

更准确的工程决策是：

### 方案 A：短期推荐
- 保留工作流做定时触发 / 接收输入
- 但把清洗、校验、入库逻辑抽成独立脚本或服务模块

优点：
- 不打断现有触发方式
- 最快提升质量
- 逻辑可测试、可 diff、可 review

### 方案 B：中期可行
- 完全改成脚本 + cron / systemd timer / GitHub Actions / server scheduler

优点：
- 运行时更简单
- 部署边界更清晰

但注意：
- 如果 ingestion contract 不先做好，换成脚本也只会把脏逻辑搬家

## 9. 我的明确建议

当前最优顺序是：

1. 先完成 shared ingestion contract
2. 再完成 `source -> cleaned -> RPC -> DB` 差异补齐
3. 再加 quarantine / environment / required-field gate
4. 最后再决定触发层是否继续保留 n8n 风格工作流，还是迁到脚本定时

也就是说：
- 先修“数据质量系统”
- 再决定“调度外壳”

## 10. 下一步执行项

建议直接进入这三项：

1. 写 `INGESTION_CONTRACT_V1`
   - 定义 Native / Morpho 的统一 cleaned payload
2. 写 `DATA_QUALITY_GATE_SPEC_V1`
   - 必填字段、环境标签、quarantine 策略、RAG 判定
3. 实现 shared ingestion core
   - `normalize -> validate -> classify environment -> write facts -> write rag`

如果只做一件事，优先做第 1 项。
