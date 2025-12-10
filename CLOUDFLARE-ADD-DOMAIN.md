# 🌐 如何为 Cloudflare Pages 添加自定义域名

## 📋 方法一：通过 Dashboard 添加（推荐）

### 步骤 1：进入域名设置

1. **打开 Cloudflare Dashboard**
   - 访问：https://dash.cloudflare.com
   - 导航到：**Workers 和 Pages** → **toolset-web** → **自定义域**（Custom domains）

### 步骤 2：添加自定义域

1. **点击"设置自定义域"或"添加自定义域"**
   - 在"域和路由"部分，点击 **"连接自定义域"** 或 **"添加自定义域"** 按钮

2. **输入你的域名**
   - 例如：`example.com` 或 `www.example.com`
   - 支持根域名（如 `example.com`）和子域名（如 `www.example.com`）

3. **配置 DNS 记录**
   - Cloudflare 会显示需要添加的 DNS 记录
   - 通常是一个 **CNAME** 记录或 **A** 记录
   - 如果域名已经在 Cloudflare 托管，系统会自动添加 DNS 记录
   - 如果域名不在 Cloudflare 托管，需要手动在你的 DNS 提供商处添加记录

### 步骤 3：验证域名

1. **等待 DNS 传播**
   - 通常需要几分钟到几小时
   - 可以在 Dashboard 中查看验证状态

2. **启用域名**
   - 验证成功后，域名会自动启用
   - 在"域和路由"部分会显示你的域名，状态为"已启用"

## 📋 方法二：使用默认的 Pages 子域名

### 使用 Cloudflare Pages 提供的免费子域名

每个 Cloudflare Pages 项目都会自动获得一个免费的子域名：

- **格式**：`toolset-web.pages.dev`
- **或**：`<随机字符>-toolset-web.pages.dev`（预览 URL）

### 如何查看你的 Pages 子域名

1. **在"概述"标签页**
   - 查看"域和路由"部分
   - 应该能看到类似 `toolset-web.yhb604520yhb.workers.dev` 或 `*.pages.dev` 的 URL

2. **如果被禁用，如何启用**
   - 点击"域和路由"面板
   - 找到 `workers.dev` 或 `pages.dev` 域名
   - 点击"启用"按钮

## 📋 方法三：通过设置页面添加

### 在设置页面添加自定义域

1. **进入设置页面**
   - Workers 和 Pages → toolset-web → **设置**（Settings）

2. **找到"自定义域"部分**
   - 向下滚动，找到 **"自定义域"** 或 **"Custom domains"** 部分

3. **添加域名**
   - 点击 **"添加自定义域"** 或 **"Add custom domain"**
   - 输入域名并按照提示配置 DNS

## ⚙️ DNS 配置说明

### 如果你的域名在 Cloudflare 托管

**自动配置**：
- Cloudflare 会自动添加所需的 DNS 记录
- 无需手动操作

### 如果你的域名不在 Cloudflare 托管

**需要手动添加 DNS 记录**：

1. **CNAME 记录**（推荐）：
   ```
   类型：CNAME
   名称：@（根域名）或 www（子域名）
   内容：toolset-web.pages.dev
   TTL：自动
   ```

2. **A 记录**（如果是根域名且需要）：
   ```
   类型：A
   名称：@
   内容：76.76.21.21（Cloudflare Pages IP，可能会变化）
   ```

3. **AAAA 记录**（IPv6）：
   ```
   类型：AAAA
   名称：@
   内容：2606:4700:3034::6815:402（示例，实际值需查看 Cloudflare 文档）
   ```

## 🔍 查看你的 Pages 默认域名

在"概述"标签页的"域和路由"部分，你会看到：

- **Pages 子域名**：`toolset-web.pages.dev` 或类似格式
- **Workers.dev 域名**：`toolset-web.yhb604520yhb.workers.dev`
- **预览 URL**：`*-toolset-web.pages.dev`

## ✅ 验证域名是否工作

1. **访问域名**
   - 在浏览器中输入你的域名
   - 应该能看到部署的网站

2. **检查 SSL 证书**
   - Cloudflare 会自动为所有域名提供免费的 SSL 证书
   - 确保使用 HTTPS 访问

## 📝 注意事项

1. **DNS 传播时间**
   - 新添加的域名可能需要几分钟到几小时才能生效
   - 请耐心等待

2. **SSL 证书**
   - Cloudflare 会自动为域名申请和配置 SSL 证书
   - 通常需要几分钟时间

3. **多个域名**
   - 可以为一个 Pages 项目添加多个自定义域
   - 所有域名都会指向同一个部署

## 🚀 快速开始

1. **最简单的方式**：使用 Cloudflare Pages 提供的默认子域名
   - 查看"概述"标签页的"域和路由"部分
   - 找到 `pages.dev` 或 `workers.dev` 域名
   - 点击"启用"即可立即使用

2. **添加自定义域**：
   - 进入"自定义域"设置
   - 按照上述步骤添加你的域名

