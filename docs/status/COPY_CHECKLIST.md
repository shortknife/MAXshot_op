# Copy 清单（一次性执行）

> **创建日期**: 2026-02-05  
> **状态**: ⏳ 待执行  
> **目的**: 从 MAXshot/ copy 所有必要资源到 MAXshot_opencode/

---

## 📦 Copy 操作清单

### 从 MAXshot/ copy 资源

#### 1. 前端项目 - admin-os

```bash
# 源路径
SOURCE="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os"
# 目标路径
DEST="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os"

# 执行 copy
cp -r "$SOURCE" "$DEST"

# 验证
ls "$DEST/app" | head -10
echo "✅ admin-os copy 完成"
```

**验证标准**:
- [ ] admin-os/ 目录完整复制
- [ ] app/ 目录存在
- [ ] lib/ 目录存在
- [ ] package.json 存在
- [ ] components/ 目录存在
- [ ] e2e/ 目录存在

---

#### 2. Database Skills

```bash
# Copy database-schema-exporter
SOURCE="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/.cursor/skills/database-schema-exporter"
DEST="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/.cursor/skills/database-schema-exporter"

mkdir -p "$DEST"
cp -r "$SOURCE" "$DEST"
echo "✅ database-schema-exporter copy 完成"

# Copy supabase-rls-helper
SOURCE="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/.cursor/skills/supabase-rls-helper"
DEST="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/.cursor/skills/supabase-rls-helper"

mkdir -p "$DEST"
cp -r "$SOURCE" "$DEST"
echo "✅ supabase-rls-helper copy 完成"
```

**验证标准**:
- [ ] database-schema-exporter/SKILL.md 存在
- [ ] supabase-rls-helper/SKILL.md 存在

---

#### 3. Database Docs (Mike 的知识库)

```bash
# Copy Mike_DatabaseExpert
SOURCE="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Mike_DatabaseExpert"
DEST="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/Mike_DatabaseExpert"

cp -r "$SOURCE" "$DEST"
echo "✅ Mike_DatabaseExpert copy 完成"

# 验证关键文件
ls "$DEST/2.Knowledge/Database_Constraints_Reference_2025-01-30.md"
echo "✅ Database Constraints Reference copy 完成"
```

**验证标准**:
- [ ] SOP.md 存在
- [ ] PERSONA.md 存在
- [ ] 2.Knowledge/ 目录存在
- [ ] Database Constraints Reference 存在

---

#### 4. 外部编排（已禁用） Workflow Skills

```bash
# Copy 外部编排（已禁用）-workflow-patterns
SOURCE="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/.cursor/skills/外部编排（已禁用）-workflow-patterns"
DEST="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/.cursor/skills/外部编排（已禁用）-workflow-patterns"

mkdir -p "$DEST"
cp -r "$SOURCE" "$DEST"
echo "✅ 外部编排（已禁用）-workflow-patterns copy 完成"

# 验证 SKILL.md
ls "$DEST/SKILL.md"
echo "✅ 外部编排（已禁用）-workflow-patterns SKILL.md copy 完成"
```

**验证标准**:
- [ ] 外部编排（已禁用）-workflow-patterns/SKILL.md 存在

---

#### 5. AGENTS.md 参考

```bash
# Copy AGENTS.md
SOURCE="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/AGENTS.md"
DEST="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/AGENTS_REFERENCE.md"

cp "$SOURCE" "$DEST"
echo "✅ AGENTS.md reference copy 完成"
```

**验证标准**:
- [ ] AGENTS_REFERENCE.md 存在

---

#### 6. FSD 产品文档

```bash
# Copy FSD
SOURCE="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/FSD"
DEST="/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/FSD"

cp -r "$SOURCE" "$DEST"
echo "✅ FSD copy 完成"

# 验证关键章节
ls "$DEST/00_Read_First/"
ls "$DEST/07_Skills_Compatibility/"
echo "✅ FSD key directories copy 完成"
```

**验证标准**:
- [ ] FSD/00_Read_First 存在
- [ ] FSD/07_Skills_Compatibility 存在
- [ ] MAXshot_产品架构设计_v5.0.md 存在

---

## ✅ 完成标准

所有 Copy 操作完成后，需要：
- [ ] 目录结构正确
- [ ] 所有 SKILL.md 文件存在
- [ ] 配置文件存在
- [ ] 开发环境就绪

---

## 📊 执行日志

| 操作 | 状态 | 执行时间 |
|------|--------|----------|
| Copy admin-os | ⏳ 待执行 | - |
| Copy Database Skills | ⏳ 待执行 | - |
| Copy Database Docs | ⏳ 待执行 | - |
| Copy 外部编排（已禁用） Skills | ⏳ 待执行 | - |
| Copy AGENTS.md | ⏳ 待执行 | - |
| Copy FSD | ⏳ 待执行 | - |
| 环境验证 | ⏳ 待执行 | - |

---

## 🔄 下一步

**待确认**:
1. ✅ Supabase 方案确认（A 或 B）
2. ✅ AI 模型选型确认
3. ✅ 开始执行 Copy 操作

**确认后执行**:
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode

# 一次性执行所有 Copy（按照上述清单逐项执行）
```
