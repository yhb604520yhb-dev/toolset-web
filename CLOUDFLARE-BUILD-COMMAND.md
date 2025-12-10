# Cloudflare Pages 构建命令更新

## ❗ 重要：请在 Cloudflare Dashboard 中更新构建命令

### 当前构建命令（错误）
```
npm install --legacy-peer-deps && npm run build && npx @opennextjs/cloudflare build
```

### ✅ 正确的构建命令
```
npm install --legacy-peer-deps && npm run build && npx @cloudflare/next-on-pages --disable-worker-minification
```

## 更新步骤

1. **登录 Cloudflare Dashboard**
   - 进入 **Workers & Pages** → **toolset-web** → **设置** 标签页

2. **找到"构建和部署"部分**
   - 点击 **"编辑构建命令"** 或找到 **"构建命令"** 字段

3. **更新构建命令为**：
   ```
   npm install --legacy-peer-deps && npm run build && npx @cloudflare/next-on-pages --disable-worker-minification
   ```

4. **输出目录（自动读取）**：
   - ✅ 已在 `wrangler.toml` 中配置：`.vercel/output/static`
   - ✅ Cloudflare 会自动从 `wrangler.toml` 读取，无需在 Dashboard 中设置

5. **保存并重新部署**
   - 点击 **"保存"**
   - 重新触发部署（推送新代码或点击"重新部署"）

## 构建配置摘要

- **构建命令**: `npm install --legacy-peer-deps && npm run build && npx @cloudflare/next-on-pages --disable-worker-minification`
- **构建输出目录**: `.vercel/output/static`
- **根目录**: `/`
- **Node.js 版本**: `22.x` 或 `20.x`

## 当前项目配置

- ✅ Next.js: 14.3.0-canary.87
- ✅ React: 19.0.0
- ✅ @cloudflare/next-on-pages: ^1.13.0
- ✅ 已移除 OpenNext 相关配置

