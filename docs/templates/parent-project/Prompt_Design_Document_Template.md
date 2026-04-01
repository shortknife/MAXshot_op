# Prompt设计文档模板（Skill-First Architecture）

> **创建日期**: 2025-01-30  
> **创建人**: Lucy (Skill Architect / Asset Governor)  
> **状态**: 🚀 正式启用  
> **版本**: v1.0  
> **优先级**: P0

---

## 📋 模板说明

本文档定义了Prompt设计文档的标准格式，包含`used_skills`声明，符合Skill-First Execution Architecture Rule v2.0要求。

**核心要求**:
- ✅ 所有Prompt设计文档必须声明使用的Skill（`used_skills`）
- ✅ 未声明Skill使用的Prompt设计文档不予合并
- ✅ Prompt/Content Skill必须通过Gateway名称调用
- ✅ Skill使用声明必须符合Skill Registry要求

---

## 📊 Prompt设计文档标准格式

### 基本结构

```markdown
# [Prompt名称] - [功能描述]

> **创建日期**: YYYY-MM-DD  
> **创建人**: [角色名] ([角色描述])  
> **状态**: 🚀 正式启用 / 📋 设计中  
> **版本**: v[版本]  
> **优先级**: P0/P1/P2

---

## 📋 Prompt概述

[Prompt功能描述]

---

## Used Skills

### 使用的Skill清单

- `[category]/[skill-name]` (v[版本]) - [Skill描述]
  - **用途**: [用途说明]
  - **调用方式**: [调用方式说明]
  - **Gateway名称**: [如果是Prompt/Content Skill，必须通过Gateway名称调用]
  - **输出字段**: 包含`_skill_id`、`_skill_version`、`_invocation_source`

---

## [其他章节...]
```

---

## 🔴 Used Skills声明格式（强制要求）

### 标准格式

```markdown
## Used Skills

### 使用的Skill清单

- `[category]/[skill-name]` (v[版本]) - [Skill描述]
  - **用途**: [用途说明]
  - **调用方式**: [调用方式说明]
  - **Gateway名称**: [如果是Prompt/Content Skill，必须通过Gateway名称调用]
  - **输出字段**: 包含`_skill_id`、`_skill_version`、`_invocation_source`
```

---

### 字段说明

**Skill清单项**:
- **Skill ID**: `[category]/[skill-name]`
  - 格式：`[category]/[skill-name]`
  - 示例：`prompt/four-layer-prompt-architecture`
  - 要求：必须与Skill Registry中的Skill ID一致

- **Skill版本**: `v[版本]`
  - 格式：`v[主版本].[次版本]`
  - 示例：`v1.0`、`v2.1`
  - 要求：必须与Skill Registry中的Skill版本一致
  - **版本管理规范**：所有Skill更新必须升级`skill_version`，旧版本仍可追溯，确保Skill Registry历史版本可追踪，便于回滚和审计

- **Skill描述**: [Skill描述]
  - 说明：Skill的简要描述
  - 要求：清晰说明Skill的功能

- **用途**: [用途说明]
  - 说明：在Prompt设计中使用该Skill的具体用途
  - 要求：明确说明使用场景

- **调用方式**: [调用方式说明]
  - 说明：如何调用该Skill
  - 要求：明确说明调用步骤

- **Gateway名称**: [Gateway名称]（仅Prompt/Content Skill需要）
  - 说明：Prompt/Content Skill必须通过Gateway名称调用
  - 已确认的Gateway名称：
    - `four_layer_prompt_executor` - 四层架构Prompt执行器
    - `prompt_template_resolver` - Prompt模板解析器
  - 要求：必须明确指定Gateway名称

- **输出字段**: 包含`_skill_id`、`_skill_version`、`_invocation_source`
  - 说明：Skill输出必须包含的留痕字段
  - 要求：明确说明输出字段

---

## 📝 完整示例

### 示例1：使用单个Prompt Skill的Prompt设计文档

```markdown
# Weekly Report Prompt v1.0

> **创建日期**: 2025-01-30  
> **创建人**: John (Prompt Expert)  
> **状态**: 🚀 正式启用  
> **版本**: v1.0  
> **优先级**: P0

---

## 📋 Prompt概述

每周报告生成Prompt，用于生成透明度和进度报告。

---

## Used Skills

### 使用的Skill清单

- `prompt/four-layer-prompt-architecture` (v1.0) - 四层架构Prompt设计
  - **用途**: 设计符合四层架构的Prompt（Persona Core、Style & Voice、Behavior Rules、Dynamic Context）
  - **调用方式**: 按照Skill文档的Step执行（Step 1-7）
  - **Gateway名称**: `four_layer_prompt_executor`
  - **输出字段**: 包含`_skill_id`、`_skill_version`、`_invocation_source`

---

## [其他章节...]
```

---

### 示例2：使用多个Skill的Prompt设计文档

```markdown
# Content Generation Prompt v1.0

> **创建日期**: 2025-01-30  
> **创建人**: John (Prompt Expert)  
> **状态**: 🚀 正式启用  
> **版本**: v1.0  
> **优先级**: P0

---

## 📋 Prompt概述

内容生成Prompt，用于生成社交媒体内容。

---

## Used Skills

### 使用的Skill清单

- `prompt/four-layer-prompt-architecture` (v1.0) - 四层架构Prompt设计
  - **用途**: 设计符合四层架构的Prompt
  - **调用方式**: 按照Skill文档的Step执行
  - **Gateway名称**: `four_layer_prompt_executor`
  - **输出字段**: 包含`_skill_id`、`_skill_version`、`_invocation_source`

- `prompt/prompt-template-resolver` (v1.0) - Prompt模板解析器
  - **用途**: 解析和替换Prompt模板中的变量
  - **调用方式**: 按照Skill文档的Step执行
  - **Gateway名称**: `prompt_template_resolver`
  - **输出字段**: 包含`_skill_id`、`_skill_version`、`_invocation_source`

---

## [其他章节...]
```

---

### 示例3：未使用Skill的Prompt设计文档（必须声明）

```markdown
# Simple Prompt v1.0

> **创建日期**: 2025-01-30  
> **创建人**: John (Prompt Expert)  
> **状态**: 🚀 正式启用  
> **版本**: v1.0  
> **优先级**: P0

---

## 📋 Prompt概述

简单的Prompt，不涉及复杂架构。

---

## Used Skills

### 使用的Skill清单

**无** - 本Prompt设计未使用任何Skill。

**说明**: 本Prompt设计为简单Prompt，不涉及复杂架构或模板解析，因此未使用任何Skill。

---

## [其他章节...]
```

**说明**: 即使Prompt设计文档未使用任何Skill，也必须声明`Used Skills`章节，并明确说明未使用Skill的原因，以明确表示已进行Skill使用评估。

---

## 🔴 系统级法条

### Rule 1：Skill是唯一入口（强制）

> **所有新Prompt必须声明使用了哪些Skill，否则不予合并。**

**执行方式**:
- ✅ 在Prompt设计文档中声明`Used Skills`章节
- ✅ Lucy负责审查Skill使用声明
- ❌ 未声明Skill使用的Prompt设计文档不予合并

---

### Rule 2：Prompt/Content Skill Gateway名称确认（系统级法条）

> **所有Prompt/Content Skill必须通过Gateway名称调用，确保统一入口。**

**已确认的Gateway名称**:
- `four_layer_prompt_executor` - 四层架构Prompt执行器
- `prompt_template_resolver` - Prompt模板解析器

**执行机制**:
- ✅ 所有Prompt/Content Skill必须通过Gateway名称调用
- ✅ 禁止绕过Gateway直接调用Skill实现
- ✅ 违反规则的工作流/Agent/Prompt将被标记为"不合规"

**作用**: 系统执行一致性，防止绕过Skill的实现

---

### Rule 3：Skill Manifest的最终Owner

> **所有Skill的Input/Output契约必须由Lucy（Skill Architect）最终注册，未注册Skill不得在Prompt设计中使用。**

**执行机制**:
- ✅ 所有Skill必须通过Lucy注册到Skill Registry
- ✅ 未注册的Skill不得在Prompt设计中使用
- ✅ 违反规则的Prompt设计文档将被标记为"不合规"

---

## 📋 检查清单

### Prompt设计文档创建/更新前检查

- [ ] Prompt设计文档包含`Used Skills`章节
- [ ] 每个Skill包含`skill_id`、`skill_version`、`invocation_source`
- [ ] `skill_id`格式正确（`[category]/[skill-name]`）
- [ ] `skill_version`格式正确（`v[主版本].[次版本]`）
- [ ] 所有使用的Skill已在Skill Registry中注册
- [ ] Prompt/Content Skill已明确指定Gateway名称
- [ ] Skill输出字段说明包含`_skill_id`、`_skill_version`、`_invocation_source`
- [ ] 未使用Skill的Prompt设计文档已明确说明原因
- [ ] Skill版本号与Skill Registry一致，版本更新时已升级`skill_version`

---

## 🔗 相关文档

### 核心文档
- **Skill-First Execution Architecture Rule v2.0**: `LEO_ProductManager/5.Collaboration/LEO-团队_Skill-First Execution Architecture Rule v2.0发布通知_2025-01-30.md`
- **分工确认文档v2.0**: `LEO_ProductManager/3.Design/分工确认文档_v2.0.md`
- **Skill Registry**: `Knowledgebase/Lucy_n8nWorkflowAuditor/2.Knowledge/Skill_Registry_v1.0.json`

### 系统级规则
- **.cursorrules**: 根目录下的Skill-First Execution Architecture规则

---

**文档版本**: v1.0  
**创建时间**: 2025-01-30  
**维护者**: Lucy (Skill Architect / Asset Governor)  
**状态**: 🚀 正式启用  
**优先级**: P0
