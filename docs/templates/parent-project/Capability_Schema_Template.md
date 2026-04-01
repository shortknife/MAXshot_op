# Capability Schema 模板

> **创建日期**: 2025-01-30  
> **创建人**: LEO (Product Manager) + 团队（实战演练产出）  
> **状态**: ✅ **标准模板**  
> **版本**: v1.0  
> **说明**: 本模板基于实战演练Schema手写模拟会的对齐结果，定义了CapabilityInput/Output Envelope的标准格式

---

## 📋 使用说明

**何时使用本模板**:
- 开发新的Capability时，参考本模板定义I/O Schema
- 实现Router时，参考本模板组装CapabilityInput/Output Envelope
- 审查Capability实现时，验证是否符合本模板标准格式
- 遇到Schema相关问题时，参考本模板进行对齐

**如何使用本模板**:
1. 严格按照CapabilityInput/Output Envelope标准格式定义Schema
2. 确保所有必需字段都存在（即使值为null，结构必须存在）
3. 特别注意`audit`字段的完整性（特别是`capability_logic_type`字段）
4. 确保`evidence`字段结构存在（避免"没有证据也输出确定结论"）

**参考文档**:
- `MAXshot_产品架构设计_v3.0_Capability-Network.md` - Capability契约定义
- `LEO_ProductManager/4.Working/实战演练_Schema手写模拟会_2025-01-30.md` - 完整演练过程
- `LEO_ProductManager/4.Working/实战演练_Schema手写模拟会_总结报告_2025-01-30.md` - 演练总结

---

## 🎯 CapabilityInput Envelope标准格式

### 标准结构

```json
{
  "task": {
    "task_id": "task_YYYYMMDD_XXX",
    "channel": "telegram|admin_os|notion|system",
    "intent": "ops|marketing|mixed",
    "requester": "user_id",
    "created_at": "ISO8601格式"
  },
  "context": {
    "memory_refs": [],
    "doc_refs": [],
    "constraints": {}
  },
  "payload": {
    // 各Capability自定义的业务输入
  }
}
```

### 字段说明

#### task对象（必需）

- **task_id** (string, 必需): 任务唯一标识符
  - 格式：`task_YYYYMMDD_XXX` 或 UUID
  - 示例：`"task_20250130_001"`

- **channel** (string, 必需): 入口渠道
  - 枚举值：`telegram` | `admin_os` | `notion` | `system`
  - 示例：`"telegram"`

- **intent** (string, 必需): 任务意图
  - 枚举值：`ops` | `marketing` | `mixed`
  - 示例：`"ops"`

- **requester** (string, 必需): 请求者标识
  - 格式：用户ID或系统标识
  - 示例：`"user_12345"`

- **created_at** (string, 必需): 任务创建时间
  - 格式：ISO 8601格式
  - 示例：`"2025-01-30T10:00:00Z"`

#### context对象（必需）

- **memory_refs** (array, 必需): 记忆引用列表
  - 格式：`[]`（当前为空，但结构必须存在）
  - 用途：传递前置Capability的记忆引用

- **doc_refs** (array, 必需): 文档引用列表
  - 格式：`[]`（当前为空，但结构必须存在）
  - 用途：传递前置Capability的文档引用

- **constraints** (object, 必需): 约束条件
  - 格式：`{}`（当前为空，但结构必须存在）
  - 用途：传递业务约束条件

#### payload对象（必需）

- **各Capability自定义的业务输入**
  - 格式：根据具体Capability的I/O Schema定义
  - 示例：`capability.data_fact_query`的payload包含`query_intent`、`filters`、`time_range`

---

## 🎯 CapabilityOutput Envelope标准格式

### 标准结构

```json
{
  "result": {
    // 各Capability自定义的业务输出
  },
  "evidence": {
    "sources": [],
    "sql_refs": null,
    "doc_quotes": null
  },
  "audit": {
    "capability_id": "capability.xxx",
    "capability_version": "vX.Y",
    "invocation_source": "task:[task_id]",
    "elapsed_ms": 123,
    "status": "success|failure",
    "error": null,
    "capability_logic_type": "llm_generated|deterministic_code"
  },
  "next_actions": []
}
```

### 字段说明

#### result对象（必需）

- **各Capability自定义的业务输出**
  - 格式：根据具体Capability的I/O Schema定义
  - 示例：`capability.data_fact_query`的result包含`facts`和`fact_summary`

#### evidence对象（必需）

- **sources** (array, 必需): 数据来源列表
  - 格式：`[]`或`["source1", "source2"]`
  - 用途：标识数据来源（如视图名、表名）

- **sql_refs** (string|null, 必需): SQL查询引用
  - 格式：SQL查询语句字符串或`null`
  - 用途：`deterministic_code`类型必须包含实际SQL查询
  - 示例：`"SELECT ... FROM v_ops_vault_live_status ..."`

- **doc_quotes** (array|null, 必需): 文档引用
  - 格式：`[]`或`null`
  - 用途：`llm_generated`类型可能需要文档引用

**关键要求**:
- ✅ 结构必须存在，即使部分字段为`null`
- ✅ 避免"没有证据也输出确定结论"
- ✅ `deterministic_code`类型必须包含`sql_refs`

#### audit对象（必需）

- **capability_id** (string, 必需): Capability唯一标识符
  - 格式：`capability.xxx`
  - 示例：`"capability.data_fact_query"`

- **capability_version** (string, 必需): Capability版本号
  - 格式：`vX.Y`
  - 示例：`"v0"`或`"v1.0"`

- **invocation_source** (string, 必需): 调用来源
  - 格式：`task:[task_id]`
  - 示例：`"task:task_20250130_001"`

- **elapsed_ms** (number, 必需): 执行耗时（毫秒）
  - 格式：整数
  - 示例：`145`

- **status** (string, 必需): 执行状态
  - 枚举值：`success` | `failure`
  - 示例：`"success"`

- **error** (string|null, 必需): 错误信息
  - 格式：错误信息字符串或`null`（成功时）
  - 示例：`null`或`"查询失败：数据库连接超时"`

- **capability_logic_type** (string, 必需): Capability逻辑类型 ⭐ **关键字段**
  - 枚举值：`llm_generated` | `deterministic_code`
  - 说明：
    - `deterministic_code`: 纯代码/SQL/RPC执行的结果（确定性查询）
    - `llm_generated`: LLM生成的结果（概率性生成）
  - 示例：`"deterministic_code"`（data_fact_query）或`"llm_generated"`（product_doc_qna）

#### next_actions数组（必需）

- **格式**: `[]`（当前为空，但结构必须存在）
- **用途**: 指示Router是否需要调用下一个Capability

---

## 📝 完整链路示例

### 场景：Telegram用户查询"USDC金库收益率是多少？"

#### Step 1: Telegram原始输入

```json
{
  "channel": "telegram",
  "user_id": "user_12345",
  "chat_id": "chat_67890",
  "message_id": "msg_001",
  "text": "USDC金库收益率是多少？",
  "timestamp": "2025-01-30T10:00:00Z"
}
```

#### Step 2: Router识别后的task对象 + capability_chain

```json
{
  "task_id": "task_20250130_001",
  "channel": "telegram",
  "intent": "ops",
  "requester": "user_12345",
  "created_at": "2025-01-30T10:00:00Z",
  "capability_chain": ["capability.data_fact_query"]
}
```

#### Step 3: Router传递给data_fact_query的CapabilityInput Envelope

```json
{
  "task": {
    "task_id": "task_20250130_001",
    "channel": "telegram",
    "intent": "ops",
    "requester": "user_12345",
    "created_at": "2025-01-30T10:00:00Z"
  },
  "context": {
    "memory_refs": [],
    "doc_refs": [],
    "constraints": {}
  },
  "payload": {
    "query_intent": "查询USDC金库收益率",
    "filters": {
      "vault_name": "USDC"
    },
    "time_range": null
  }
}
```

#### Step 4: data_fact_query返回的CapabilityOutput Envelope

```json
{
  "result": {
    "facts": {
      "vault_name": "dForce USDC - Morpho - arbitrum",
      "chain_name": "arbitrum",
      "protocol": "Morpho",
      "current_apy": 5.21,
      "net_apy": 5.21,
      "base_apy": 5.21,
      "total_tvl": 94189879.14,
      "success_rate_24h_pct": 100.0,
      "last_update_time": "2025-01-30T10:00:00Z",
      "markets": [
        {
          "chain": "arbitrum",
          "protocol": "Morpho",
          "market_name": "wstETH/USDC",
          "base_apy": 5.21,
          "net_apy": 5.21,
          "tvl": 94189879.14
        }
      ]
    },
    "fact_summary": "USDC金库（dForce USDC - Morpho - arbitrum）当前APY为5.21%，部署在Arbitrum链上的Morpho协议，总锁定价值（TVL）为$94,189,879.14，24小时执行成功率为100.0%。"
  },
  "evidence": {
    "sources": ["v_ops_vault_live_status", "market_metrics"],
    "sql_refs": "SELECT v.vault_name, v.chain_name, v.total_tvl, v.success_rate_24h_pct, v.last_update_time, m.protocol, m.base_apy, m.net_apy, m.reward_apy, m.tvl FROM v_ops_vault_live_status v LEFT JOIN market_metrics m ON m.execution_id = (SELECT id FROM executions WHERE vault_name = v.vault_name ORDER BY start_time DESC LIMIT 1) WHERE v.vault_name ILIKE '%USDC%' ORDER BY v.total_tvl DESC LIMIT 1;",
    "doc_quotes": null
  },
  "audit": {
    "capability_id": "capability.data_fact_query",
    "capability_version": "v0",
    "invocation_source": "task:task_20250130_001",
    "elapsed_ms": 145,
    "status": "success",
    "error": null,
    "capability_logic_type": "deterministic_code"
  },
  "next_actions": []
}
```

#### Step 5: Router组装后返回给Telegram的最终回复

```json
{
  "message": {
    "text": "USDC金库（dForce USDC - Morpho - arbitrum）当前APY为5.21%，部署在Arbitrum链上的Morpho协议，总锁定价值（TVL）为$94,189,879.14，24小时执行成功率为100.0%。",
    "format": "text"
  },
  "audit_summary": {
    "task_id": "task_20250130_001",
    "channel": "telegram",
    "intent": "ops",
    "capability_chain": ["capability.data_fact_query"],
    "capability_versions": {
      "capability.data_fact_query": "v0"
    },
    "execution_status": "success",
    "total_elapsed_ms": 145,
    "invocation_source": "task:task_20250130_001"
  },
  "evidence_refs": {
    "sql_refs": "SELECT ... FROM v_ops_vault_live_status ...",
    "sources": ["v_ops_vault_live_status", "market_metrics"]
  }
}
```

---

## 🔍 关键对齐点

### 1. capability_logic_type字段 ⭐ **关键字段**

**标准定义**:
- `deterministic_code`: 纯代码/SQL/RPC执行的结果（确定性查询）
- `llm_generated`: LLM生成的结果（概率性生成）

**使用规则**:
- ✅ `capability.data_fact_query` → `"deterministic_code"`（通过SQL/RPC实现）
- ✅ `capability.product_doc_qna` → `"llm_generated"`（通过LLM生成）
- ✅ `capability.content_generator` → `"llm_generated"`（通过LLM生成）

**验证要求**:
- ✅ 所有CapabilityOutput必须包含此字段
- ✅ 字段值必须正确（不能错误设置为`llm_generated`当实际是`deterministic_code`）

### 2. evidence字段结构完整性

**关键要求**:
- ✅ 结构必须存在，即使部分字段为`null`
- ✅ 避免"没有证据也输出确定结论"
- ✅ `deterministic_code`类型必须包含`sql_refs`（实际SQL查询语句）
- ✅ `llm_generated`类型可能需要`doc_quotes`（文档引用）

### 3. audit字段完整性

**必需字段**（全部必须存在）:
- ✅ `capability_id`: Capability唯一标识符
- ✅ `capability_version`: Capability版本号
- ✅ `invocation_source`: 调用来源（格式：`task:[task_id]`）
- ✅ `elapsed_ms`: 执行耗时（毫秒）
- ✅ `status`: 执行状态（`success` | `failure`）
- ✅ `error`: 错误信息（成功时为`null`）
- ✅ `capability_logic_type`: Capability逻辑类型 ⭐ **关键字段**

### 4. Router职责理解

**三条产品级硬约束**:
1. ✅ **任何入口输入必须映射为Admin OS Task**（task_id已生成）
2. ✅ **Router不产出业务事实**（只做调度和组装，业务事实来自Capability的result.fact_summary）
3. ✅ **任何对外输出必须附带审计摘要**（audit_summary已包含）

### 5. capability_chain编排

**编排规则**:
- ✅ 根据`intent`和查询类型，合理编排capability链
- ✅ 当前场景只需`data_fact_query`，不需要`product_doc_qna`（数据已足够清晰）
- ✅ 如果后续需要文档补充，可以追加`["capability.product_doc_qna"]`
- ✅ `context`字段可以传递前置Capability的结果

---

## ⚠️ 注意事项

### 1. Schema结构完整性

- ✅ **所有必需字段必须存在**，即使值为`null`，结构必须存在
- ✅ **不允许省略字段**，即使字段为空，也要显式声明
- ✅ **字段类型必须正确**，严格按照标准格式定义

### 2. capability_logic_type字段

- ⭐ **这是关键字段，必须正确设置**
- ✅ `deterministic_code`: 用于SQL/RPC实现的确定性查询
- ✅ `llm_generated`: 用于LLM生成的概率性结果
- ❌ **禁止错误设置**（如将SQL查询设置为`llm_generated`）

### 3. evidence字段

- ✅ **结构必须存在**，避免"没有证据也输出确定结论"
- ✅ `deterministic_code`类型必须包含`sql_refs`（实际SQL查询语句）
- ✅ `llm_generated`类型可能需要`doc_quotes`（文档引用）

### 4. audit字段

- ✅ **所有必需字段必须存在**，不能省略任何字段
- ✅ `invocation_source`格式必须正确：`task:[task_id]`
- ✅ `status`枚举值必须正确：`success` | `failure`

### 5. 开发要求

- ✅ **严格按照本次对齐的Schema标准执行**
- ✅ **Skill的I/O Schema必须严格对齐Capability契约**
- ✅ **遇到Schema相关问题，优先参考本模板**

---

## 📚 相关文档

**核心文档**:
- `MAXshot_产品架构设计_v3.0_Capability-Network.md` - Capability契约定义
- `LEO_ProductManager/4.Working/实战演练_Schema手写模拟会_2025-01-30.md` - 完整演练过程
- `LEO_ProductManager/4.Working/实战演练_Schema手写模拟会_总结报告_2025-01-30.md` - 演练总结

**规则文档**:
- `.cursorrules` Rule 9.1-9.3 - Skill触发和使用规则
- `02.Templates/Skill_Template.md` - Skill定义模板

---

**文档版本**: v1.0  
**创建时间**: 2025-01-30  
**创建人**: LEO (Product Manager) + 团队（实战演练产出）  
**状态**: ✅ **标准模板**  
**维护者**: LEO (Product Manager)

---

**本模板基于实战演练Schema手写模拟会的对齐结果，所有团队成员已确认理解一致。** ✅
