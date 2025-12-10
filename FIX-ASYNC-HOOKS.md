# 🔧 解决 async_hooks 错误的完整指南

## ❌ 当前错误
```
✘ [ERROR] Could not resolve "async_hooks"
The package "async_hooks" wasn't found on the file system but is built into node.
```

## ✅ 解决方案（必须同时完成）

### 方案一：更新 Cloudflare Dashboard 构建命令（必须）

**步骤**：
1. 登录 Cloudflare Dashboard
2. 进入 **Workers & Pages** → **toolset-web** → **设置** 标签页
3. 找到 **"构建和部署"** 部分
4. 点击 **"编辑构建命令"** 或 **"构建命令"** 字段
5. **将构建命令修改为**：
   ```
   npm install --legacy-peer-deps && npm run build && npx @cloudflare/next-on-pages --disable-worker-minification
   ```
6. 点击 **"保存"**
7. 重新触发部署（点击 **"重新部署"** 或推送新代码）

**重要**：确保命令中包含 `--disable-worker-minification` 选项！

### 方案二：已创建的配置文件

我已经创建了 `next-on-pages.config.js` 配置文件，它会自动禁用 worker minification。

### 方案三：如果上述方案仍无效

如果 `--disable-worker-minification` 仍然无法解决问题，可能需要：
1. 升级 Next.js 到 14.3.0+（需要升级 `@cloudflare/next-on-pages` 到 1.13.0+）
2. 或考虑使用 OpenNext 适配器（如警告中提到的）

## 📝 检查清单

- [ ] 已更新 Cloudflare Dashboard 中的构建命令
- [ ] 构建命令包含 `--disable-worker-minification`
- [ ] `next-on-pages.config.js` 文件已提交到 Git
- [ ] 重新触发部署后查看构建日志

## 🔍 如何确认修复成功

查看构建日志，应该看到：
- ✅ `⚡️ Completed npx vercel build`
- ✅ `⚡️ Build completed successfully`
- ❌ **不再出现** `Could not resolve "async_hooks"` 错误

## ⚠️ 注意事项

`--disable-worker-minification` 选项会：
- ✅ 解决 `async_hooks` 打包错误
- ⚠️ 增加 worker 文件大小（通常不影响功能）
- ✅ 主要用于调试和兼容性问题解决

