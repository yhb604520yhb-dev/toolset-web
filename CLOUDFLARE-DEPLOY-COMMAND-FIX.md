# 🔧 Cloudflare Pages 部署命令修复

## ✅ 构建已成功！

从构建日志可以看到：
- ✅ Next.js 构建成功
- ✅ `@cloudflare/next-on-pages` 构建成功
- ✅ 输出目录：`.vercel/output/static` 已生成

## ❌ 问题：部署命令错误

当前部署命令：
```
npx wrangler deploy
```

这个命令是错误的，因为：
1. `wrangler deploy` 用于 Workers，不是 Pages
2. Cloudflare Pages **不需要**手动部署命令
3. Pages 会自动从构建输出目录读取并部署

## ✅ 解决方案：删除部署命令

### 在 Cloudflare Dashboard 中：

1. **进入设置页面**
   - Workers & Pages → toolset-web → 设置

2. **找到"部署命令"字段**
   - 应该有一个"部署命令"或"Deploy command"字段

3. **更新部署命令**
   - **删除** `npx wrangler deploy`
   - **填写**：`true`
   
   **说明**：如果部署命令字段是必填的，填写 `true` 即可（这是一个总是成功的空命令，不会干扰 Pages 的自动部署）

4. **保存设置**

## 📋 正确的 Cloudflare Pages 配置

### 构建命令（保留）：
```
npm install --legacy-peer-deps && npm run build && npx @cloudflare/next-on-pages --disable-worker-minification
```

### 部署命令（清空）：
```
（留空，不填任何内容）
```

### 输出目录（自动读取）：
- 从 `wrangler.toml` 自动读取：`.vercel/output/static`

## 🔍 为什么不需要部署命令？

Cloudflare Pages 的工作流程：
1. ✅ 运行构建命令
2. ✅ 生成构建输出到 `.vercel/output/static`
3. ✅ **自动读取输出目录中的文件**
4. ✅ **自动部署到 Pages**

不需要手动部署步骤！

## 📝 如果 Dashboard 中没有"部署命令"字段

如果找不到这个字段，可能有以下几种情况：
1. 字段名称不同（可能叫"Post-deploy command"）
2. 部署命令是可选的，不填即可
3. 某些页面模板没有这个字段

**不用担心，构建成功后 Pages 会自动部署。**

## ✅ 验证

1. 清空/删除部署命令后
2. 保存设置
3. 等待下次构建完成
4. 查看构建日志，应该不会再出现 `wrangler deploy` 错误

