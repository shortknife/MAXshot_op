#!/usr/bin/env bash
set -euo pipefail

# 进入项目根目录
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode

# 需要替换的文件列表（共 11 个）
FILES=(
  "database-setup.sql"
  "DEVELOPMENT_PLAN.md"
  "SUPABASE_SETUP_GUIDE.md"
  "simplified-ddl-for-ai.md"
  "TECHNOLOGY_SELECTION.md"
  "database-schema-design.md"
  "DEVELOPMENT_SUMMARY.md"
  "AGENTS_REFERENCE.md"
  "AGENTS.md"
  "DATABASE_SETUP.md"
  "COPY_CHECKLIST.md"
)

# 执行备份 + 替换
for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    cp "$f" "$f.bak"
    # 替换所有出现的旧路径形式
    sed -i '' \
      -e 's/MAXshot(opencode)\/admin-os/MAXshot_opencode\/admin-os/g' \
      -e 's/MAXshot(opencode)\/FSD/MAXshot_opencode\/FSD/g' \
      -e 's/MAXshot(opencode)\//MAXshot_opencode\//g' \
      -e 's/MAXshot(opencode)/MAXshot_opencode/g' \
      "$f"
  else
    echo "Warning: $f not found"
  fi
done

echo "替换完成，请 git diff 检查"
