# 上下文重建指南 · {Role Name}

> **创建日期**: {YYYY-MM-DD}  
> **创建人**: {创建人}  
> **状态**: 📖 上下文重建指南  
> **用途**: 在新对话框中快速恢复工作状态

---

## 📋 使用说明

**何时使用**:
- 重建新对话框时，先阅读此文档恢复上下文
- 发现工作衔接问题时，参考此文档快速定位关键信息

**阅读顺序**:
1. 快速浏览"角色定位"和"当前工作状态"
2. 阅读"必读文档清单"中的关键文档
3. **阅读工作目录中的Status.md和TODO.md**（了解当前任务状态）
4. 参考"关键结论摘要"了解历史决策
5. 如有问题，查看"关联文档索引"

---

## 🎯 角色定位

**角色名称**: {Role Name} - {Role Title}

**核心职责**:
- ✅ {核心职责1}
- ✅ {核心职责2}
- ✅ {核心职责3}

**技术栈**（如适用）:
- {技术栈1}
- {技术栈2}
- {技术栈3}

**详细角色定义**: `/{Role}/PERSONA.md`

---

## 📚 必读文档清单

### 核心文档（必须阅读）

1. **PERSONA.md** - 角色定义和工作风格
   - 位置: `/{Role}/PERSONA.md`
   - 作用: 了解角色定位、核心特性、工作流程框架

2. **RULE.md** - 工作规则和边界约束
   - 位置: `/{Role}/RULE.md`
   - 作用: 了解职责边界、禁止事项、工作原则

3. **SOP.md** - 标准操作流程
   - 位置: `/{Role}/SOP.md`
   - 作用: 了解工作流程框架（{简要描述SOP的主要阶段}）

4. **Chat_Summary_{日期}.md** - 聊天结论摘要（如有）
   - 位置: `/{Role}/2.Knowledge/Chat_Summary_{日期}.md`
   - 作用: 快速了解历史关键结论和决策

### 知识库文档（建议阅读）

5. **Best_Practices.md** - 最佳实践
   - 位置: `/{Role}/2.Knowledge/Best_Practices.md`
   - 作用: 了解项目实践经验和成功模式

6. **Lessons_Learned.md** - 经验教训
   - 位置: `/{Role}/2.Knowledge/Lessons_Learned.md`
   - 作用: 了解项目教训和避免方法

### 顶层标准文档（参考）

7. **Development_Paradigm_Standard.md** - 开发范式标准
   - 位置: `/MAXshot/3.Design/Development_Paradigm_Standard.md`
   - 作用: 了解四层文档体系、OUTPUT_STANDARD强制引用规则

8. **OUTPUT_STANDARD.md** - 产出规范标准
   - 位置: `/MAXshot/3.Design/OUTPUT_STANDARD.md`
   - 作用: 了解{产出物类型}等产出规范

### 工作目录文档（必须阅读）

9. **Status.md** - 当前工作状态
   - 位置: `/{Role}/4.Working/Status.md`
   - 作用: 了解当前任务状态、进行中的工作、阻塞问题

10. **TODO.md** - 待办事项
    - 位置: `/{Role}/4.Working/TODO.md`
    - 作用: 了解当前待办任务和优先级

11. **最近的工作日志** - 工作记录
    - 位置: `/{Role}/6.WorkLog/`（查看最新日期的工作日志）
    - 作用: 了解最近的工作内容和进展

12. **开发日志** - 开发记录（如有）
    - 位置: `/{Role}/4.Working/Development_Log_*.md`
    - 作用: 了解开发过程中的关键决策和问题

---

## 📖 阅读顺序

### 第一步：快速恢复身份

1. 阅读 `/{Role}/PERSONA.md` - 确认角色定位和工作风格
2. 阅读 `/{Role}/RULE.md` - 确认工作边界和约束

### 第二步：引用关键文档

3. 阅读 `/{Role}/SOP.md` - 了解工作流程框架
4. 阅读 `/{Role}/2.Knowledge/Chat_Summary_{日期}.md` - 了解历史关键结论（如有）

### 第三步：说明当前工作状态

5. 阅读 `/{Role}/4.Working/Status.md` - 了解当前状态和进行中的任务
6. 阅读 `/{Role}/4.Working/TODO.md` - 了解待办事项和优先级
7. 阅读 `/{Role}/6.WorkLog/{最新日期}_Daily.md` - 了解最近的工作内容

### 第四步：了解项目上下文

8. 阅读 `/MAXshot/3.Design/Development_Paradigm_Standard.md` - 了解开发范式标准
9. 阅读 `/MAXshot/3.Design/OUTPUT_STANDARD.md` - 了解产出规范标准

---

## 🎯 当前工作状态

### 当前里程碑

- {里程碑名称}: {状态说明}
  - {任务1} - {状态}
  - {任务2} - {状态}
  - {任务3} - {状态}

### 当前任务

- {任务1} - {状态说明}
- {任务2} - {状态说明}
- {任务3} - {状态说明}

### 关键依赖

- {依赖1} - {说明}
- {依赖2} - {说明}

---

## 🤝 对接方式

### 与{协作角色1}的对接方式

**对接流程**:
1. {步骤1}
2. {步骤2}
3. {步骤3}

**协作文档位置**: `/{Role}/5.Collaboration/{协作角色}_{主题}_YYYY-MM-DD.md`

### 与{协作角色2}的对接方式

{同上格式}

---

## 📝 关键结论摘要

### 结论1: {结论标题}

**内容**: {结论内容}

**日期**: {YYYY-MM-DD}

**参考文档**: `/{Role}/2.Knowledge/Chat_Summary_{日期}.md` §{章节}

---

### 结论2: {结论标题}

{同上格式}

---

## 🔗 关联文档索引

### 设计文档

- `/{Role}/3.Design/{文档名称}.md` - {文档说明}

### 协作文档

- `/{Role}/5.Collaboration/{文档名称}.md` - {文档说明}

### 知识库文档

- `/{Role}/2.Knowledge/{文档名称}.md` - {文档说明}

---

## ✅ 上下文恢复检查清单

### 身份恢复

- [ ] 已阅读PERSONA.md，确认角色定位
- [ ] 已阅读RULE.md，确认工作边界
- [ ] 已阅读SOP.md，了解工作流程

### 状态恢复

- [ ] 已阅读Status.md，了解当前状态
- [ ] 已阅读TODO.md，了解待办事项
- [ ] 已阅读最近的工作日志，了解工作进展

### 上下文恢复

- [ ] 已阅读Chat_Summary（如有），了解历史结论
- [ ] 已阅读相关设计文档，了解当前项目状态
- [ ] 已了解关键依赖和阻塞问题

---

## 📖 相关文档

### 核心文档
- `/{Role}/PERSONA.md` - 角色身份定义
- `/{Role}/RULE.md` - 工作规则和边界约束
- `/{Role}/SOP.md` - 工作流程框架

### 工作目录文档
- `/{Role}/4.Working/Status.md` - 当前工作状态
- `/{Role}/4.Working/TODO.md` - 待办事项

### 知识库文档
- `/{Role}/2.Knowledge/Chat_Summary_{日期}.md` - 聊天结论摘要
- `/{Role}/2.Knowledge/Best_Practices.md` - 最佳实践
- `/{Role}/2.Knowledge/Lessons_Learned.md` - 经验教训

---

**文档版本**: v1.0  
**创建时间**: {YYYY-MM-DD}  
**维护者**: {Role Name} ({Role Title})  
**状态**: 📖 上下文重建指南

