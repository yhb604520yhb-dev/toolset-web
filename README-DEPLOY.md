# 📦 快速部署指南

## 一键部署（推荐）

### Windows PowerShell

```powershell
# 设置 GitHub Token
$token = "ghp_你的token"

# 执行一键部署脚本
.\deploy.ps1 -Branch "new-branch-name" -GitHubToken $token
```

脚本会自动执行：
1. ✅ 检查项目结构
2. ✅ 检查敏感信息
3. ✅ 安装依赖（如需要）
4. ✅ 本地构建测试
5. ✅ Git 状态检查
6. ✅ 自动推送到 GitHub

## 手动部署步骤

### 1. 检查敏感信息

```bash
node scripts/prepare-deploy.js
```

### 2. 本地构建测试

```bash
npm install
npm run build
```

### 3. 提交并推送

```powershell
# 使用自动化脚本
.\scripts\git-push.ps1 -Branch "new-branch-name" -GitHubToken "你的token"

# 或手动推送
git add .
git commit -m "准备部署"
git push origin new-branch-name
```

### 4. Cloudflare Pages 配置

在 Cloudflare Dashboard 中：

1. **构建设置**
   - 构建命令: `npm install --legacy-peer-deps && npm run build && npx @cloudflare/next-on-pages`
   - 输出目录: `.vercel/output/static`
   - Node.js 版本: `20.x`

2. **环境变量**
   ```
   NEXT_PUBLIC_SORA2_API_URL=https://ai.604520.top
   NEXT_PUBLIC_SORA2_API_KEY=（你的密钥）
   NEXT_PUBLIC_SORA2_TIMEOUT=60000
   NEXT_PUBLIC_SORA2_DEFAULT_MODEL=sora-2
   NEXT_PUBLIC_SORA2_ENDPOINT_TYPE=openai-official
   ```

## 📁 项目结构

```
toolset-web/
├── app/                    # Next.js App Router 页面
├── components/             # React 组件
├── config/                 # 配置文件
├── lib/                    # 工具库和 API
├── scripts/                # 部署和工具脚本
│   ├── prepare-deploy.js   # 敏感信息检查
│   ├── git-push.ps1        # Git 自动推送
│   └── clean-for-deploy.js # 清理脚本
├── deploy.ps1              # 一键部署脚本
├── package.json            # 依赖配置
├── .npmrc                  # npm 配置（legacy-peer-deps）
├── next.config.mjs         # Next.js 配置
├── wrangler.toml           # Cloudflare Pages 配置
└── .gitignore              # Git 忽略规则
```

## 🔍 文件说明

### 必需推送的文件
- ✅ `package.json` - 依赖定义
- ✅ `package-lock.json` - 依赖锁定
- ✅ `.npmrc` - npm 配置
- ✅ `next.config.mjs` - Next.js 配置
- ✅ `wrangler.toml` - Cloudflare 配置
- ✅ `tsconfig.json` - TypeScript 配置
- ✅ `tailwind.config.ts` - Tailwind 配置
- ✅ `postcss.config.mjs` - PostCSS 配置
- ✅ 所有源代码文件（`app/`, `components/`, `lib/`, `config/`）

### 不推送的文件（已忽略）
- ❌ `node_modules/` - 依赖包
- ❌ `.next/` - 构建输出
- ❌ `.vercel/` - Vercel 配置
- ❌ `.env*` - 环境变量文件
- ❌ `*.log` - 日志文件
- ❌ `.git/` - Git 仓库

## 🛠️ 故障排查

### 构建失败

**依赖冲突**
```bash
# 确保 .npmrc 存在
echo "legacy-peer-deps=true" > .npmrc

# 确保 Next.js >= 14.3.0
npm install next@^14.3.0
```

**Node.js 版本**
- Cloudflare Pages 支持 Node.js 18.x, 20.x, 22.x
- 建议使用 20.x

### 推送失败

**SSH 连接问题**
- 自动脚本会切换到 HTTPS 方式

**GitHub Push Protection**
- 检查敏感信息：`node scripts/prepare-deploy.js`
- 从代码中移除 Token 或密钥
- 或访问提示的 URL 允许推送

## 📚 详细文档

- [完整部署指南](./DEPLOY-GUIDE.md)
- [项目结构说明](./PROJECT_STRUCTURE.md)

