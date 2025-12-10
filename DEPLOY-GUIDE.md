# Cloudflare Pages 部署完整指南

## 📋 部署前准备

### 1. 项目文件检查

确保以下文件已正确配置：

- ✅ `package.json` - 依赖版本已兼容
- ✅ `.npmrc` - 配置了 `legacy-peer-deps=true`
- ✅ `next.config.mjs` - Edge Runtime 配置
- ✅ `wrangler.toml` - Cloudflare Pages 配置
- ✅ `.gitignore` - 已排除不需要的文件

### 2. 本地构建测试

在推送前，建议先在本地测试构建：

```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 生成 Cloudflare Pages 输出（Windows 上可能失败，但不影响部署）
npm run pages:build

# 4. 本地预览（可选）
npm run preview:cloudflare
```

## 🚀 部署步骤

### 方式一：使用自动化脚本（推荐）

1. **检查敏感信息**
   ```bash
   node scripts/prepare-deploy.js
   ```

2. **自动推送（使用 PowerShell）**
   ```powershell
   # 设置你的 GitHub Token
   $token = "ghp_你的token"
   
   # 执行推送脚本
   .\scripts\git-push.ps1 -Branch "new-branch-name" -GitHubToken $token
   ```

### 方式二：手动推送

1. **提交更改**
   ```bash
   git add .
   git commit -m "准备部署到 Cloudflare Pages"
   ```

2. **推送到 GitHub**
   ```bash
   # 使用 HTTPS（带 Token）
   git remote set-url origin https://yhb604520yhb-dev:你的token@github.com/yhb604520yhb-dev/toolset-web.git
   git config --global http.sslVerify false
   git push -u origin new-branch-name -f
   ```

3. **恢复 SSL 验证**
   ```bash
   git config --global http.sslVerify true
   ```

### 方式三：在 Cloudflare Pages 控制台配置

1. **连接仓库**
   - 访问 Cloudflare Dashboard
   - Workers & Pages → 创建应用程序
   - 选择 GitHub → 选择仓库

2. **配置构建设置**
   - **构建命令**: `npm install --legacy-peer-deps && npm run build && npx @cloudflare/next-on-pages --disable-worker-minification`
   - **构建输出目录**: `.vercel/output/static`
   - **根目录**: `/`
   - **Node.js 版本**: `20.x` 或 `22.x`
   
   > **注意**: 如果遇到 `async_hooks` 错误，构建命令中已添加 `--disable-worker-minification` 选项以绕过该问题

3. **添加环境变量**
   ```
   NEXT_PUBLIC_SORA2_API_URL=https://ai.604520.top
   NEXT_PUBLIC_SORA2_API_KEY=（你的 API 密钥）
   NEXT_PUBLIC_SORA2_TIMEOUT=60000
   NEXT_PUBLIC_SORA2_DEFAULT_MODEL=sora-2
   NEXT_PUBLIC_SORA2_ENDPOINT_TYPE=openai-official
   ```

4. **部署**
   - 点击"部署"按钮
   - 等待构建完成（通常 2-5 分钟）

## ✅ 部署后验证

部署成功后，检查以下功能：

1. **页面加载**
   - ✅ 访问部署地址（如 `toolset-web.pages.dev`）
   - ✅ 页面正常显示，无错误

2. **API 路由**
   - ✅ `/api/upload-image` 正常工作
   - ✅ `/api/sora/characters` 正常工作

3. **核心功能**
   - ✅ Sora 视频生成功能正常
   - ✅ 视频任务列表显示正常
   - ✅ 环境变量正确加载

## 🔧 故障排查

### 构建失败

**问题**: 依赖版本冲突
```
npm error ERESOLVE could not resolve
```
**解决**: 
- 确保 `package.json` 中 Next.js 版本 >= 14.3.0
- 确保 `.npmrc` 文件存在并包含 `legacy-peer-deps=true`

**问题**: Node.js 版本不兼容
**解决**: 在 Cloudflare Pages 设置中选择 Node.js 20.x 或 22.x

### 运行时错误

**问题**: API 路由返回 500 错误
**解决**: 
- 检查 API 路由是否配置了 `export const runtime = 'edge'`
- 确保没有使用 Node.js 原生模块（如 `fs`, `path`, `Buffer`）

**问题**: 环境变量未加载
**解决**: 
- 确保环境变量名称以 `NEXT_PUBLIC_` 开头
- 在 Cloudflare Pages 控制台正确配置环境变量

## 📝 注意事项

1. **敏感信息**: 永远不要在代码中硬编码 API 密钥或 Token
2. **环境变量**: 使用 Cloudflare Pages 的环境变量功能存储敏感信息
3. **构建缓存**: 如果构建异常，可以清除 Cloudflare Pages 的构建缓存后重新构建
4. **分支策略**: 建议使用专门的分支进行部署（如 `new-branch-name`）

## 🔗 相关链接

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [项目 GitHub 仓库](https://github.com/yhb604520yhb-dev/toolset-web)

