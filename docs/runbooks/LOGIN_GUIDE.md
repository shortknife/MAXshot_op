**【严格 read-only】不写入数据 / 不触发 Execution / 无自动反馈**

# Login Guide (Read-Only Demo)

> 适用范围：MAXshot v5.0 Admin OS Demo Read-Only 版本  
> 当前版本：**公开 read-only，无需真实登录**  
> 说明：本指南仅覆盖 Demo 展示与只读路径验证

---

## 1. 启动方式（含端口自定义）

> 端口 3000 已被占用，请使用其他端口（推荐 4000）

```bash
# 进入 Admin OS
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot/opencode/admin-os

# 安装依赖（如已装可跳过）
npm run cleaninstall

# 指定端口启动（推荐 4000）
PORT=4000 NEXT_TELEMETRY_DISABLED=1 npm run dev
```

访问：
```
http://localhost:4000
```

---

## 2. 进入 Read-Only Demo 模式

当前 Demo 默认为 **READ_ONLY_DEMO = true**（代码级开关）。

如需确认/查看：
- 文件：`admin-os/lib/demo-data.ts`
- 常量：`export const READ_ONLY_DEMO = true`

> 说明：Demo 数据来自 `admin-os/lib/demo-executions.json`，不会访问真实数据库。

---

## 3. 登录说明（当前是否需要登录）

**当前 Demo 为公开 read-only，无需登录。**  
如浏览器出现登录页面，可直接访问功能页地址：

- `/operations`
- `/audit`
- `/outcome`
- `/insight-review`
- `/insight-candidate`

---

## 4. 常见问题（FAQ）

### Q1: 端口冲突，启动失败
**解决：**
```bash
PORT=4000 npm run dev
# 或更换 5000 / 7000 等端口
```

### Q2: 页面为空，mock 数据不显示
**检查：**
- `admin-os/lib/demo-executions.json` 是否存在并格式正确
- `admin-os/lib/demo-data.ts` 是否仍为 `READ_ONLY_DEMO = true`

### Q3: 浏览器缓存导致页面不更新
**解决：**
- 强制刷新：`Cmd + Shift + R` / `Ctrl + Shift + R`
- 或打开无痕窗口

### Q4: Demo 数据更新后页面仍旧
**解决：**
- 刷新页面
- 重启 dev server

---

## 5. 结论

当前 Demo 版本：  
✅ 完全 read-only  
✅ 无需登录  
✅ 无真实权限体系  

若需启用真实登录/权限，请在后续阶段重新开放。
