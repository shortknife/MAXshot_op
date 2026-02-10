**【严格 read-only】不写入数据 / 不触发 Execution / 无自动反馈**

# MAXshot Admin OS

MAXshot Admin Operating System - 内部运营管理系统

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件（已创建，包含Supabase配置）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://uzbbumqbyfssijmcwwwy.supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)


## 运行模式（严格读写控制）

**v0.2-write-enabled：** 已支持受控写入路径，所有写入意图（含阻断）均产生 `write_blocked` 审计事件。

- **默认：严格 read-only**（不写入数据 / 不触发 Execution / 无自动反馈）
- **写入模式：必须显式开启 + 人工确认**

### Read-only 启动（默认）
```bash
NEXT_PUBLIC_READ_ONLY_DEMO=true NEXT_PUBLIC_WRITE_ENABLE=false NEXT_TELEMETRY_DISABLED=1 PORT=3003 npm run dev
```

### 写入模式启动（仅在人工审批场景）
- **write_blocked 已实现**：任意写入被阻断（read-only / token / operator_id）都会记录审计事件
> 仍需 UI 内输入 `confirm_token` + 勾选确认，才允许写入。

```bash
NEXT_PUBLIC_READ_ONLY_DEMO=false NEXT_PUBLIC_WRITE_ENABLE=true WRITE_CONFIRM_TOKEN=your-confirm-token NEXT_TELEMETRY_DISABLED=1 PORT=3003 npm run dev
```


## 📋 功能模块

### 1. 登录页 (`/login`)
- 邮箱输入
- 白名单验证
- 本地Token存储

### 2. Dashboard页 (`/dashboard`)
- 今日概览（Alpha Flash发布数、Education发布数）
- 最新执行日志（最近10条）

### 3. 配置中心页 (`/configs`)
- 系统配置表格展示
- 支持编辑（number、boolean、string类型）
- 按分组显示

### 4. Prompt管理页 (`/prompts`)
- Prompt列表
- System Prompt编辑
- User Prompt Template编辑
- Model Config展示（只读）

### 5. 内容预览页 (`/content`)
- 待发布内容（publishing_queue表）
- 历史发布内容（publishing_logs表）
- Approve/Delete操作

## 🛠 技术栈

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Shadcn/ui**
- **Supabase** (@supabase/supabase-js)

## 📁 项目结构

```
admin-os/
├── app/              # Next.js App Router页面
├── components/       # React组件
├── lib/             # 工具函数和配置
└── public/          # 静态资源
```

## 🔒 安全说明

- ⚠️ **service_role key** 具有完整数据库权限，仅限内部使用
- ⚠️ 不要将 `.env.local` 文件提交到代码仓库
- ✅ 使用环境变量管理敏感信息

## 📝 开发日志

详见：`Sam_AIDeveloper/4.Working/Admin_OS_Development_Status_2025-01-19.md`

## 🔗 相关文档

- **PRD**: `LEO_ProductManager/3.Design/MAXshot_Admin_OS_PRD.md`
- **数据库Schema**: `Mike_DatabaseExpert/3.Design/Admin_System_Schema_v1.md`

---

**版本**: v1.0 MVP  
**状态**: 🚀 开发中

## Demo Walkthrough (Read-only)

- Script: `docs/DEMO_WALKTHROUGH.md`
- 强调：严格 read-only / 不写入数据 / 不触发 Execution
