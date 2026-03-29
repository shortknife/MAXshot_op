---
name: explore
description: 在当前项目内快速定位代码、文件和模式；多角度搜索（文件名、内容、符号、AST、Git 历史）。当用户说「在哪里」「哪个文件」「找一下」「搜索」「定位」等时使用。
metadata:
  version: "1.0.0"
  tags: [OpenCode, P2, 代码搜索, Lucy]
---

# Explore — 代码库搜索

在当前项目中快速定位代码、文件与结构；多角度搜索（glob、grep、LSP、AST、git）。

## When to Use

- 需要**查找代码位置**、**搜索文件/模块**、**理解代码结构**、**追踪函数调用链**、**找相似实现**时。
- 用户说「在哪里」「哪个文件」「找一下」「有没有」「搜索」「定位」等时。
- **关键词**：explore、代码搜索、定位、找文件、grep、LSP。

## Instructions

1. **多角度**：文件名/路径（glob/find）；内容（grep）；符号（LSP goto_definition、find_references、workspace_symbols）；AST 模式（ast-grep）；Git 历史（git log、git blame）。
2. **策略**：先窄后宽；先结构后内容；先定义后引用。可并行发起多种搜索。
3. **工具选择**：找文件→glob/find；搜文本→grep；找定义/引用→LSP；找符号→workspace_symbols；模式匹配→ast_grep_search；历史→git log/blame。
4. **输出**：以「找到的文件/搜索结果」列表形式呈现，含路径、简要描述、关键片段（文件:行号 + 代码块）；可选结构概览（目录树）。
5. **排除**：搜索时排除 `node_modules`、`.git` 等；大库可先限定目录或扩展名。

## Examples

- 用户：「找到处理用户认证的代码。」→ 结合目录结构、*auth* 文件名、grep authenticate/authorization/session、LSP 符号搜索，汇总列出 auth 相关文件与关键位置。
- 用户：「handleSubmit 都在哪被调用。」→ LSP find_references 或 grep，列出调用处与上下文。
