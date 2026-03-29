# MAXshot v5.2 开发计划（Harness First）

> 版本: v5.2-plan-harness
> 更新日期: 2026-03-25
> 对齐文档:
> - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
> - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MAXSHOT_HARNESS_GAP_MAP_2026-03-25.md`

---

## 1. 当前唯一主线

当前开发不再以“继续加 capability”为主线，而以“补 harness” 为主线。

执行哲学补充：
- LLM-first for semantics
- Harness-enforced for reliability
- Code 仅作为工程约束执行层，不作为用户语义主判断器

本阶段唯一正确顺序：
1. Session Harness
2. Intent Harness
3. Query Contract
4. CriticDecision
5. Canonical Source Rules
6. 再扩 capability

---

## 2. 当前目标

### P0
让真实用户多轮对话稳定，不再出现：
- 新问题被旧澄清吞掉
- 产品问法误进业务 capability
- 结果技术上成功、语义上答错
- 数据失败语义与真实原因不一致

### P1
让 `data_fact_query` 形成 contract-first、source-aware、critic-guarded 的稳定链路。

### P2
在 harness 稳定后再恢复 capability 扩展和产品 UX 深化。

---

## 3. 工作包

### WP1 - Session Harness

目标:
- 正式完成 Step 2，并把多轮关系判断从规则补丁迁移为 LLM 主判断 + harness 约束

交付:
- `ContextPacket` contract
- turn relation taxonomy
- session reset / inheritance / recall policy
- TG / Web 一致行为基线

完成标准:
- follow-up/new-topic/correction/history-callback 可区分
- 旧澄清不再污染新问题
- 不允许再以正则枚举/关键词硬编码作为主关系判断路径

### WP2 - Intent Harness

目标:
- registry-first capability match 成为唯一主匹配路径，且 capability 判断以 LLM 为主

交付:
- `IntentIR` contract
- capability-aware clarification contract
- out_of_scope / unknown / matched 的严格输出
- 清理热路径上的 legacy intent fallback

完成标准:
- 产品定义问法不再误进 business query
- 绝对时间 query 不再被粗暴改写成相对窗口澄清
- 规则枚举只能作为 contract fallback，不得成为主识别器

### WP3 - Query Contract

目标:
- data query 不再边猜边查

交付:
- `QueryContract` schema
- execution / vault / yield / allocation 等 query class 规则
- clarification completeness gate

完成标准:
- contract 不完整则澄清
- contract 完整后才允许 capability execute

### WP4 - CriticDecision

目标:
- capability 结果在返回用户前必须经过独立质检

交付:
- `CriticDecision` schema
- semantic fit checks
- failure taxonomy checks
- retry / reclarify / reject decision rules

完成标准:
- 错 capability 的结果不再直接暴露给用户
- 错误文案与真实失败原因一致

### WP5 - Canonical Source Rules

目标:
- 高频业务查询不再因 source/freshness 不清而漂移

交付:
- top query classes 的 canonical source mapping
- freshness keys
- completeness rules
- fallback / reject rules

完成标准:
- `latest execution`、`vault list`、`apy summary` 等主查询有固定数据口径

---

## 4. 当前不做项

本阶段明确不优先：
- 扩新 capability 类别
- 激活 publisher
- 深化 Notion 入口
- 做复杂 UI 美化优先于 harness 稳定
- 用 prompt patch 代替结构修复
- 用规则枚举替代 LLM 的语义理解

---

## 5. 交付顺序

### 第一批
1. Session Harness 文档 / contract / code 对齐
2. Intent Harness 文档 / contract / code 对齐

### 第二批
3. Query Contract 落地
4. CriticDecision 落地

### 第三批
5. Canonical Source Rules 落地
6. 回归与验收文档升级

---

## 6. 验收标准

### 系统级
1. TG / Web 都可作为稳定输入端
2. 主链问题优先在 harness 层被识别，而不是在能力执行后被动暴露
3. 端到端回答必须可追溯到 source contract

### 查询级
1. 完整 query 不误澄清
2. 不完整 query 只问真正缺的槽位
3. 结果错误时有正确 failure semantics
4. 结果正确时能说明“我的理解是 ...”且允许纠偏

### 工程级
1. 9 步主流程每步都有可验证 artifact
2. regression 不只看 end-to-end pass，也看中间 contract
3. 生产部署与回归检查尽量脚本化

---

## 7. 进度口径更新

现阶段不再使用“功能完成百分比”作为主进度，而改用 harness readiness：

1. Step 2 Session Harness
2. Step 3 Intent Harness
3. Query Contract
4. CriticDecision
5. Canonical Source Rules

只有这五项过关，才认为 v5.2 主线完成。
