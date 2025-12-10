# Cloudflare Pages 部署命令（必填字段）

## 📋 如果部署命令是必填字段

如果 Cloudflare Dashboard 要求必须填写部署命令，可以使用以下方案：

## ✅ 方案一：空命令（推荐）

填写一个不会失败的空命令：

```bash
true
```

或者：

```bash
echo "Build completed, Pages will auto-deploy"
```

**说明**：
- `true` 命令总是成功（退出码 0）
- 不会执行任何实际操作
- Cloudflare Pages 会自动从构建输出目录读取并部署

## ✅ 方案二：使用 wrangler pages deploy（如果需要手动部署）

如果你确实需要手动部署，可以使用：

```bash
npx wrangler pages deploy .vercel/output/static --project-name=toolset-web
```

**注意**：
- 需要确保 `wrangler` 已安装（构建命令中已使用 `@cloudflare/next-on-pages`，它会安装 wrangler）
- 需要指定正确的输出目录：`.vercel/output/static`
- 需要指定项目名称：`toolset-web`

## ✅ 方案三：检查部署（最安全）

如果你想确保部署，但不影响自动部署流程：

```bash
ls -la .vercel/output/static || echo "Build output directory exists"
```

或者更简单的：

```bash
test -d .vercel/output/static && echo "Build completed successfully"
```

## 🎯 推荐配置

基于你的项目，**推荐使用方案一**：

### 部署命令（必填字段）：
```
true
```

### 完整的 Cloudflare Pages 配置：

| 配置项 | 值 |
|--------|-----|
| **构建命令** | `npm install --legacy-peer-deps && npm run build && npx @cloudflare/next-on-pages --disable-worker-minification` |
| **部署命令** | `true` |
| **输出目录** | `.vercel/output/static`（从 wrangler.toml 自动读取） |

## 📝 说明

1. **为什么用 `true`**：
   - `true` 是 Unix/Linux 的内置命令，总是返回成功
   - 不会执行任何操作，满足"必填"要求
   - 不会干扰 Cloudflare Pages 的自动部署流程

2. **Cloudflare Pages 的工作流程**：
   - ✅ 执行构建命令
   - ✅ 生成构建输出到 `.vercel/output/static`
   - ✅ **自动读取输出目录并部署**（不需要部署命令）
   - ✅ 执行部署命令（如果填写了，但不影响自动部署）

## ⚠️ 重要提示

- **不要使用** `npx wrangler deploy`（这是 Workers 命令，会失败）
- **不要使用** `wrangler pages deploy`（可能导致重复部署）
- **推荐使用** `true`（简单、安全、不会失败）

