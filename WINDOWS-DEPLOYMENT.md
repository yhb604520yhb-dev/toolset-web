# Windows 系统部署说明

## 问题说明

`@cloudflare/next-on-pages` 在 Windows 系统上本地构建时可能遇到以下错误：
```
EXIT WHEN NOT EXPECTED
SHELLAC COMMAND FAILED!
Executing: npm --version
```

这是已知的 Windows 兼容性问题，**不影响在 Cloudflare Pages 上的实际部署**。

## 解决方案

### ✅ 推荐方案：直接在 Cloudflare Pages 上构建

**最佳做法**：直接通过 Git 集成在 Cloudflare Pages 上构建。Cloudflare Pages 使用 Linux 构建环境，不会有 Windows 兼容性问题。

**步骤**：
1. 将代码推送到 Git 仓库（GitHub/GitLab/Bitbucket）
2. 在 Cloudflare Pages 控制台连接仓库
3. 配置构建命令：`npm install && npm run build && npx @cloudflare/next-on-pages`
4. 配置输出目录：`.vercel/output/static`
5. 部署

这样构建会在 Cloudflare 的 Linux 环境中进行，完全正常。

### 替代方案 1：使用 WSL（如果需要本地测试）

如果你需要在本地测试 Cloudflare 构建：

1. 安装 WSL (Windows Subsystem for Linux)
2. 在 WSL 中运行构建命令：
   ```bash
   npm run build
   npm run pages:build
   ```

### 替代方案 2：只测试标准构建

即使 `pages:build` 在 Windows 上失败，只要 `npm run build` 成功，你的代码就可以在 Cloudflare Pages 上正常部署。

**验证步骤**：
```powershell
# 测试标准构建（这个在 Windows 上正常工作）
npm run build

# 如果构建成功，说明代码没问题，可以安全部署到 Cloudflare Pages
```

## 验证部署

部署到 Cloudflare Pages 后，检查：
- ✅ 页面正常加载
- ✅ API Routes 正常工作（`/api/sora/characters`, `/api/upload-image`）
- ✅ 视频生成功能正常

## 总结

- ❌ **不需要**在 Windows 上本地运行 `pages:build`
- ✅ **只需要**在 Windows 上运行 `npm run build` 验证代码正常
- ✅ **直接**通过 Git 集成在 Cloudflare Pages 上构建和部署

