# 🔧 修复 HTTP ERROR 502

## 🚨 问题原因

从你的 DNS 记录可以看到：

1. **类型错误**：记录类型是 **"Worker"**，应该是 **"CNAME"**
2. **目标不完整**：目标是 `toolset-web`，应该是完整的域名 `toolset-web.yhb604520yhb.workers.dev`

这导致了 HTTP 502 错误。

## ✅ 解决方案

### 方法一：删除并重新创建 CNAME 记录（推荐）

#### 步骤：

1. **删除现有的 Worker 记录**
   - 在 DNS 管理页面，找到 `hd.604520.top` 的 **Worker** 记录
   - 点击右侧的编辑按钮或删除按钮
   - 删除这条记录

2. **添加新的 CNAME 记录**
   - 点击 **"添加记录"** 按钮
   - **类型**：选择 **"CNAME"**（不是 Worker）
   - **名称**：`hd`
   - **目标**：`toolset-web.yhb604520yhb.workers.dev`（完整域名）
   - **代理状态**：**仅 DNS**（灰色云朵，关闭代理）
   - **TTL**：自动
   - **保存**

3. **等待生效**
   - 等待 2-5 分钟
   - 清除浏览器缓存或使用无痕模式
   - 访问 `https://hd.604520.top` 测试

---

### 方法二：在 Pages Dashboard 添加自定义域（最简单）

这是最简单且最可靠的方法：

#### 步骤：

1. **先删除 DNS 记录**
   - 删除 `hd.604520.top` 的 Worker 记录

2. **在 Pages Dashboard 添加自定义域**
   - 进入 Cloudflare Dashboard
   - **Workers 和 Pages** → **toolset-web** → **自定义域**（Custom domains）
   - 点击 **"添加自定义域"** 或 **"连接自定义域"**
   - 输入：`hd.604520.top`
   - 保存

3. **Cloudflare 自动处理**
   - Cloudflare 会自动创建正确的 DNS 记录
   - 自动配置路由和 SSL 证书
   - 等待 1-5 分钟生效

---

## 📝 正确配置对比

### ❌ 错误配置（当前）：
- **类型**：Worker
- **名称**：hd.604520.top
- **目标**：toolset-web（不完整）
- **代理状态**：已代理（橙色）

### ✅ 正确配置：
- **类型**：CNAME
- **名称**：hd
- **目标**：toolset-web.yhb604520yhb.workers.dev（完整域名）
- **代理状态**：仅 DNS（灰色，可选）

---

## 🎯 推荐操作

**最简单的方式**：使用方法二（在 Dashboard 添加自定义域）

1. ✅ 删除 DNS 中的 Worker 记录
2. ✅ 在 Pages Dashboard → 自定义域 → 添加 `hd.604520.top`
3. ✅ Cloudflare 自动配置一切
4. ✅ 等待 1-5 分钟
5. ✅ 访问测试

这样 Cloudflare 会自动创建正确的 DNS 记录类型和配置。

