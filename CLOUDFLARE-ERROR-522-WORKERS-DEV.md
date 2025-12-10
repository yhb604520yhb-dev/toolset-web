# 🔧 修复 Error 522：使用 workers.dev 域名的 DNS 配置

## 🚨 问题分析

虽然 `toolset-web.yhb604520yhb.workers.dev` 可以正常访问，但 `hd.604520.top` 仍然显示 Error 522。

**可能原因：**
1. DNS 代理状态导致冲突
2. Workers.dev 域名通过 Cloudflare 代理时可能需要特殊配置
3. 自定义域名与 workers.dev 的代理方式不兼容

## ✅ 解决方案一：关闭代理状态（推荐）

### 步骤：

1. **进入 DNS 管理页面**（604520.top）
2. **找到 `hd` 的 CNAME 记录**
3. **点击代理状态开关**，将**橙色云朵改为灰色云朵**（即"仅 DNS"，关闭代理）
4. **保存**

### 为什么要关闭代理？

- `workers.dev` 域名本身已经通过 Cloudflare 的 CDN 和代理
- 自定义域名再开启代理可能导致双重代理冲突
- 关闭代理后，DNS 直接指向 workers.dev 服务

---

## ✅ 解决方案二：在 Pages Dashboard 添加自定义域

虽然 `workers.dev` 能访问，但通过 Dashboard 添加自定义域可能更稳定：

### 步骤：

1. **进入 Cloudflare Dashboard**
2. **Workers 和 Pages** → **toolset-web** → **自定义域**（Custom domains）
3. **点击"添加自定义域"**
4. **输入**：`hd.604520.top`
5. **保存**

如果提示"域名已在使用"，先：
- 删除 DNS 中的 `hd` CNAME 记录
- 然后在 Dashboard 中添加
- Cloudflare 会自动创建正确的配置

---

## 🔍 检查当前 DNS 配置

请确认你的 DNS 记录：

**类型：** CNAME  
**名称：** hd  
**目标：** `toolset-web.yhb604520yhb.workers.dev`  
**代理状态：** ???（需要确认是橙色还是灰色）

如果是**橙色云朵（已代理）**，请改为**灰色云朵（仅 DNS）**。

---

## 🧪 测试步骤

1. **关闭代理**（灰色云朵）
2. **保存 DNS 记录**
3. **等待 2-5 分钟**让 DNS 生效
4. **清除浏览器缓存**或使用无痕模式
5. **访问** `https://hd.604520.top`
6. **测试**

---

## 💡 为什么 workers.dev 能访问但自定义域不行？

- `workers.dev` 域名由 Cloudflare 直接管理，路由配置已经优化
- 自定义域名通过 DNS CNAME 指向 workers.dev 时，如果开启代理，可能导致路由冲突
- 关闭代理后，DNS 解析正常，但流量仍然通过 Cloudflare 的网络

---

## ⚠️ 注意事项

关闭代理后：
- ✅ DNS 仍然通过 Cloudflare 解析
- ✅ 流量仍然经过 Cloudflare 网络（因为 workers.dev 本身在 Cloudflare 上）
- ⚠️ 但可能失去一些 Cloudflare 代理层的高级功能（对 workers.dev 来说影响不大）

如果关闭代理后仍然不行，请尝试**方案二：在 Dashboard 添加自定义域**。

