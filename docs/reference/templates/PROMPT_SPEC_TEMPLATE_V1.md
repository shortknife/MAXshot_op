# Prompt Spec Template V1

## 文档信息
- Step：
- Prompt 名称：
- Prompt slug：
- 状态：`proposed | approved | active | deprecated | retired`
- 对应代码模块：

---

## 1. 目标
- 这个 Prompt 解决什么问题
- 属于哪个 Step
- 不解决什么问题

## 2. 输入 Contract
- 输入字段
- 字段来源
- 哪些是必填
- 哪些是可选

## 3. 输出 Contract
- 输出字段
- JSON schema
- 哪些字段必须存在
- 哪些字段不得输出

## 4. System Prompt
```text
...
```

## 5. User Prompt Template
```text
...
```

## 6. 边界
- 这个 Prompt 的职责边界
- 不允许越界到哪个 Step

## 7. 正例
- Query
- 期望输出

## 8. 反例
- Query
- 不允许的错误输出

## 9. 运行时接入点
- 文件路径
- 依赖模块

## 10. 验收标准
- 哪些测试通过后才能标记 `approved`
