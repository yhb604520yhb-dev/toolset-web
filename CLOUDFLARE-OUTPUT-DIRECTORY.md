# Cloudflare Pages 输出目录配置说明

## ✅ 好消息：不需要在 Dashboard 中手动设置！

如果你在 Cloudflare Dashboard 中找不到"构建输出目录"设置，这是**正常的**。

## 🔍 为什么不需要手动设置？

Cloudflare Pages 会**自动从 `wrangler.toml` 文件读取输出目录配置**。

### 当前配置（已正确设置）

在 `wrangler.toml` 文件中：

```toml
name = "toolset-web"
compatibility_date = "2024-01-01"
pages_build_output_dir = ".vercel/output/static"
```

这个配置会告诉 Cloudflare Pages：
- ✅ 构建输出目录是 `.vercel/output/static`
- ✅ 构建完成后从这里读取文件进行部署

## 📋 完整的 Cloudflare Pages 配置检查清单

### 1. ✅ `wrangler.toml` 文件（已配置）
```toml
pages_build_output_dir = ".vercel/output/static"
```

### 2. ✅ 构建命令（需要在 Dashboard 中设置）
```
npm install --legacy-peer-deps && npm run build && npx @cloudflare/next-on-pages --disable-worker-minification
```

### 3. ✅ 根目录（通常默认 `/`）
```
/
```

### 4. ✅ Node.js 版本（通常默认或自动检测）
```
22.x 或 20.x
```

## 🚀 下一步

1. **确保 `wrangler.toml` 文件已提交到 Git**
   - ✅ 已在仓库中（已确认）

2. **在 Cloudflare Dashboard 中只需设置构建命令**
   - 进入：Workers & Pages → toolset-web → 设置
   - 更新构建命令为：
     ```
     npm install --legacy-peer-deps && npm run build && npx @cloudflare/next-on-pages --disable-worker-minification
     ```

3. **保存并触发新部署**
   - Cloudflare 会自动从 `wrangler.toml` 读取输出目录配置

## 📝 如何验证输出目录配置

构建成功后，查看构建日志，应该能看到类似信息：
```
✓ Build completed successfully
✓ Output directory: .vercel/output/static
```

或者查看部署的"构建日志"部分，确认构建输出目录。

## ⚠️ 如果构建失败

如果构建失败并提示找不到输出目录，可以尝试：

1. **确认 `wrangler.toml` 在项目根目录**
2. **确认文件已提交到 Git**
3. **检查构建日志中的错误信息**

## 💡 总结

- ✅ **不需要在 Dashboard 中设置输出目录**
- ✅ **`wrangler.toml` 中的配置会自动生效**
- ✅ **只需在 Dashboard 中设置构建命令即可**

