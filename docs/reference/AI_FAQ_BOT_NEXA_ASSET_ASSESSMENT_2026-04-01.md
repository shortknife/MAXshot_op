# AI_FAQ_BOT / Nexa 资产评估（2026-04-01）

## 1. 结论

`/Users/alexzheng/Documents/JOB/AI_Project/AI_FAQ_BOT` 适合并入当前项目，但只适合以 **产品定义与 FAQ 能力资产** 的形式并入，不适合整体作为代码基线合并。

结论判断：
- **适合并购产品资产**
- **不适合整体并购历史实现**
- **应作为 Nexa 平台的 FAQ / KB Plane 并入当前仓库**

---

## 2. 它真正提供的价值

这套项目最有价值的不是代码，而是清晰的 FAQ 产品定义：
- B2B SaaS FAQ 平台定位
- 客户知识库上传与质检
- FAQ answering / fallback / QA review 能力划分
- 多端接入产品面
- 客户端/API 交付思路
- Dashboard / 计费 / 安全事件等扩展面

这些内容与当前仓库是互补关系：
- 当前仓库强在 runtime / harness / facts / ops / audit
- Nexa FAQ 项目强在 customer-facing FAQ product plane

---

## 3. 已识别的高价值资产

### 3.1 产品主文档

已导入：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/product/Product_Requirements_Document_2025-11-06.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/product/Product_Overview_2025-11-23.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/product/Architecture_Design_2025-11-23.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/product/M2_FAQ_Engine_FSD_2025-11-10.md`

价值：
- 给当前项目补上了 FAQ 平台的产品平面
- 明确了 FAQ 引擎的模块边界
- 明确了客户知识库、问答、fallback、QA review 这些能力的结构

### 3.2 FAQ 技能/能力文档

已导入：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/skills/faq-answering.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/skills/faq-fallback.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/skills/faq-qa-review.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/docs/reference/nexa-faq-mined-2026-04-01/skills/kb-upload-qc.md`

价值：
- 这些文档天然适合映射到当前 capability 体系
- 最可用的 4 个目标能力就是：
  1. `kb-upload-qc`
  2. `faq-answering`
  3. `faq-fallback`
  4. `faq-qa-review`

---

## 4. 不建议合并的部分

1. 整个历史角色工作区
2. 旧实现环境与过程文档
3. 历史编排实现细节
4. 整个仓库里的旧协作治理系统
5. 零散脚本、旧版配置、历史阶段归档

这些内容和当前仓库的收敛方向不一致，整体并入只会增加噪音。

---

## 5. 建议的合并方式

### 5.1 产品层命名重构

建议采用：
- **Nexa** = 平台名 / 架构名
- **MAXshot** = Nexa 之下的客户样板项目

也就是：
- 当前仓库不再只代表一个客户项目
- 而是逐步演化为 Nexa platform workspace
- MAXshot 保留为客户 solution / sample deployment

### 5.2 模块层并入方式

建议把 Nexa FAQ 项目吸收到当前平台的一个新层：

- `Nexa Core`
  - harness
  - router
  - capability runtime
  - audit
  - thin memory

- `Nexa Ops/Data Plane`
  - facts ingestion
  - execution / rebalance / yield query

- `Nexa FAQ / KB Plane`
  - kb upload & qc
  - faq answering
  - faq fallback
  - faq qa review
  - customer-facing faq api

- `Customer Solutions`
  - MAXshot
  - future tenants / sample projects

---

## 6. 当前不该做的事

1. 不要直接把整个 `AI_FAQ_BOT` 目录搬进来
2. 不要立刻做全仓物理 rename
3. 不要把历史实现当成当前平台主线代码

这些操作会把已经收敛的主线重新打散。

---

## 7. 下一步建议

### P0
1. 写一份 **Nexa 平台重定义文档**
2. 写一份 **MAXshot 作为客户样板项目的定位文档**
3. 把 FAQ 能力抽象成当前 capability 体系下的新模块草案

### P1
4. 设计 FAQ / KB Plane 的目录结构
5. 评估哪些页面/API 应进入当前仓库
6. 再决定是否做仓库语义层 rename

---

## 8. 最终判断

AI_FAQ_BOT / Nexa 项目对当前仓库的价值是真实存在的，而且方向正确。

但正确吸收方式不是“项目合并”，而是：

**把它作为 Nexa 平台的 FAQ 产品平面并入当前架构，把 MAXshot 从平台名降级为客户样板项目名。**
