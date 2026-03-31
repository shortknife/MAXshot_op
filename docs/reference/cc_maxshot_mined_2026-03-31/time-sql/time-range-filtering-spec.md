# 时间范围过滤功能规范

> **创建时间**: 2026-03-21
> **优先级**: P0
> **状态**: 待实现（Phase 9）

---

## 📋 需求背景

用户查询历史数据时，系统应该：
1. **正确理解时间范围**：默认使用当前年份
2. **准确过滤数据**：只返回指定时间范围内的数据
3. **友好提示**：无数据时明确告知用户

---

## 🎯 功能需求

### 1. 时间范围提取（Intent Analyzer）

**当前状态**: ✅ 已修复
- 用户说 "3月2日到3月16日" → 提取为 `2026-03-02 to 2026-03-16`
- 默认使用当前年份（2026）

**实现位置**: `lib/intent-analyzer/deepseek-client.ts`
- System Prompt 中添加了时间处理规则
- 关键词匹配也支持时间提取

### 2. 时间范围过滤（Capability - 待实现）

**当前状态**: ❌ Mock 数据未实现
- Mock 数据返回所有记录，未按时间过滤

**Phase 9 实现方案**:

```typescript
// CC-02_DataFactQuery Capability
async capabilityExecute(input: CapabilityExecuteInput) {
  const { query, intent_type, context } = input

  // 提取时间范围
  const timeRange = this.extractTimeRange(query)

  // 构建带时间过滤的查询
  const sqlQuery = `
    SELECT
      vault_id,
      vault_name,
      chain,
      apy_percentage,
      total_value_usd,
      created_at
    FROM vault
    WHERE 1=1
      AND created_at BETWEEN '${timeRange.start}' AND '${timeRange.end}'
    ORDER BY apy_percentage DESC
    LIMIT ${input.top_n || 10}
  `

  // 执行查询
  const results = await this.executeQuery(sqlQuery)

  // 检查是否有结果
  if (results.length === 0) {
    return {
      success: true,
      data: [],
      message: `时间范围 ${timeRange.start} 到 ${timeRange.end} 内无数据`,
      time_range: timeRange,
      data_count: 0
    }
  }

  return {
    success: true,
    data: results,
    time_range: timeRange,
    data_count: results.length
  }
}
```

### 3. 时间范围响应格式

**标准响应结构**:

```json
{
  "success": true,
  "exit_type": "completed",
  "data": {
    "intent_name": "ops_query",
    "extracted_slots": {
      "entity": "vault",
      "time_range": "2026-03-02 to 2026-03-16",
      "comparison": "highest"
    },
    "time_range_info": {
      "query_start": "2026-03-02",
      "query_end": "2026-03-16",
      "data_start": "2026-03-11",
      "data_end": "2026-03-16",
      "coverage": "部分覆盖（3/11-3/16有数据）"
    },
    "final_result": {
      "data": [...],
      "metadata": {
        "time_range_applied": true,
        "filtered_count": 6,
        "total_available": 10
      }
    }
  }
}
```

### 4. 无数据场景处理

**查询历史无数据时间段**:

```json
{
  "success": true,
  "exit_type": "completed",
  "data": {
    "intent_name": "ops_query",
    "extracted_slots": {
      "time_range": "2024-03-02 to 2024-03-16"
    },
    "final_result": {
      "data": [],
      "message": "2024-03-02 到 2024-03-16 期间无数据",
      "suggestions": [
        "尝试查询最近30天的数据",
        "查看数据可用时间范围：2026-03-01 至今"
      ]
    }
  }
}
```

---

## 🔧 技术实现

### Phase 9 实现清单

- [ ] **P0 - CC-02 添加时间过滤**
  - [ ] 修改 `lib/capabilities/data-fact-query.ts`
  - [ ] 实现 `extractTimeRange()` 方法
  - [ ] 在 SQL 查询中添加 `WHERE created_at BETWEEN ...`

- [ ] **P0 - 时间范围响应增强**
  - [ ] 添加 `time_range_info` 字段到响应
  - [ ] 显示数据覆盖范围
  - [ ] 显示过滤后的记录数

- [ ] **P1 - 无数据场景处理**
  - [ ] 检测空结果
  - [ ] 返回友好的提示信息
  - [ ] 提供建议的查询范围

- [ ] **P1 - 数据库时间索引优化**
  - [ ] 在 `vault` 表的 `created_at` 字段添加索引
  - [ ] 优化时间范围查询性能

---

## 📊 测试用例

### 测试用例 1：有数据的时间段
```
输入: "3月2日到3月16日之间最高的APY"
期望: 返回该时间范围内的数据（如3/11-3/16）
时间范围: 2026-03-02 to 2026-03-16
过滤后: 6条记录
```

### 测试用例 2：无数据的历史时间段
```
输入: "2024年3月的APY数据"
期望: 返回空数组 + 提示信息
时间范围: 2024-03-01 to 2024-03-31
结果: 0条记录
提示: "该时间范围内无数据"
```

### 测试用例 3：当前月份默认值
```
输入: "本月最高的APY"
期望: 自动使用当前月份（2026-03）
时间范围: 2026-03-01 to 2026-03-31
```

---

## 🎯 验收标准

- ✅ Intent Analyzer 正确提取时间范围（默认当前年份）
- ✅ Capability 根据时间范围过滤数据
- ✅ 无数据时返回友好提示
- ✅ 响应包含 `time_range_info` 元数据
- ✅ 测试通过率 100%

---

**文档版本**: v1.0
**最后更新**: 2026-03-21
