# Cloudflare Pages 部署步骤指南

## 第一步：准备 Git 仓库

### 1.1 检查当前 Git 状态
```bash
git status
```

### 1.2 如果有更改，提交代码
```bash
git add .
git commit -m "准备部署到 Cloudflare Pages"
```

### 1.3 如果没有远程仓库，需要创建一个
- GitHub: https://github.com/new
- GitLab: https://gitlab.com/projects/new
- Bitbucket: https://bitbucket.org/repo/create

### 1.4 连接到远程仓库
```bash
git remote add origin <你的仓库URL>
git push -u origin main
```

## 第二步：在 Cloudflare Pages 部署

### 2.1 打开 Cloudflare Pages
访问：https://dash.cloudflare.com → Workers 和 Pages → 创建应用程序

### 2.2 连接 Git 仓库
1. 点击 "创建应用程序" 或 "Create Application"
2. 选择 "Pages" 标签
3. 点击 "连接到 Git" 或 "Connect to Git"
4. 选择你的 Git 提供商（GitHub/GitLab/Bitbucket）
5. 授权 Cloudflare 访问你的仓库
6. 选择你的仓库

### 2.3 配置构建设置
在 "构建设置" 部分填写：

**Framework preset（框架预设）**: 
- 选择 "Next.js" 或 "None"（自定义）

**Build command（构建命令）**: 
```
npm install && npm run build && npx @cloudflare/next-on-pages
```

**Build output directory（构建输出目录）**: 
```
.vercel/output/static
```

**Root directory（根目录）**: 
- 留空或填写 `/`

**Node.js version（Node.js 版本）**: 
- 选择 `20.x` 或最新稳定版

### 2.4 配置环境变量（可选）
在 "Environment variables" 部分添加：

| 变量名 | 值 |
|--------|-----|
| `NEXT_PUBLIC_SORA2_API_URL` | `https://ai.604520.top` |
| `NEXT_PUBLIC_SORA2_API_KEY` | （你的 API 密钥） |
| `NEXT_PUBLIC_SORA2_TIMEOUT` | `60000` |
| `NEXT_PUBLIC_SORA2_DEFAULT_MODEL` | `sora-2` |
| `NEXT_PUBLIC_SORA2_ENDPOINT_TYPE` | `openai-official` |

### 2.5 保存并部署
1. 点击 "保存并部署" 或 "Save and Deploy"
2. 等待构建完成（通常需要 2-5 分钟）
3. 部署成功后，你会得到一个 `*.pages.dev` 的 URL

## 第三步：验证部署

部署完成后，检查：
- ✅ 访问你的 `*.pages.dev` URL，页面应该正常加载
- ✅ 测试 API Routes（如 `/api/upload-image`）
- ✅ 测试视频生成功能

## 需要帮助？

如果你已经在浏览器中打开了 Cloudflare 控制台，我可以使用浏览器工具帮你自动填写表单。

