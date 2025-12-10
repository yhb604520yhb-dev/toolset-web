# 🔍 Cloudflare Dashboard 输出目录检查步骤

## ❗ 问题：网站显示 "Hello world"

这表明 Cloudflare Pages 没有找到正确的 Worker 文件或输出目录设置不正确。

## 📋 详细检查步骤

### 第一步：登录 Cloudflare Dashboard

1. 访问：https://dash.cloudflare.com
2. 登录你的账户
3. 导航到：**Workers & Pages** → 点击 **toolset-web** 项目

### 第二步：进入设置页面

1. 在项目页面顶部，点击 **"设置"** (Settings) 标签页
2. 或者点击右上角的 **"设置"** 图标

### 第三步：找到构建配置

在设置页面中，向下滚动找到 **"构建和部署"** (Build & Deploy) 部分。

应该能看到以下字段：
- **构建命令** (Build Command)
- **构建输出目录** (Build Output Directory) ← **重点检查这里！**
- **根目录** (Root Directory)
- **Node.js 版本** (Node.js Version)

### 第四步：检查并更新输出目录

#### 如果看到 "构建输出目录" 字段：

1. 点击 **"编辑"** (Edit) 按钮（通常是一个铅笔图标或编辑链接）
2. 找到 **"构建输出目录"** 或 **"Output Directory"** 字段
3. **必须设置为**：
   ```
   .opennext
   ```
4. **确保不是以下值**：
   - ❌ `.vercel/output/static` （旧的配置）
   - ❌ 留空
   - ❌ 其他任何值

5. 点击 **"保存"** (Save)

#### 如果看不到 "构建输出目录" 字段：

Cloudflare Pages 可能依赖于 `wrangler.toml` 文件。请确认：
- `wrangler.toml` 文件已提交到仓库
- `wrangler.toml` 中包含：`pages_build_output_dir = ".opennext"`

### 第五步：检查构建命令

确保构建命令是：
```
npm install --legacy-peer-deps && npm run build && npx @opennextjs/cloudflare build --openNextConfigPath open-next.config.js
```

### 第六步：保存并重新部署

1. 点击 **"保存"** (Save) 保存所有更改
2. 回到项目主页
3. 点击 **"重新部署"** (Redeploy) 或 **"触发部署"** (Trigger Deployment)
4. 或者推送一个新的提交来触发自动部署

## ✅ 预期结果

部署成功后：
- ✅ 构建日志显示构建成功
- ✅ 网站显示完整的应用界面（不再是 "Hello world"）
- ✅ 所有页面正常加载

## 📸 如何截图给我看

如果仍然有问题，请截图以下内容发给我：

1. **构建配置页面**：显示"构建输出目录"字段的值
2. **构建日志**：显示构建成功的信息
3. **部署页面**：显示最新的部署状态

## 🔧 常见问题

### Q: 找不到"构建输出目录"字段怎么办？

**A:** Cloudflare Pages 可能使用 `wrangler.toml` 中的配置。确保：
- `wrangler.toml` 中包含 `pages_build_output_dir = ".opennext"`
- 文件已提交到 Git 仓库

### Q: 输出目录设置正确，但仍然是 "Hello world"？

**A:** 可能的原因：
1. 构建失败或未完成
2. Worker 文件未正确生成
3. 需要清除 Cloudflare 缓存

尝试：
- 查看构建日志，确认构建真正成功
- 在 Cloudflare Dashboard 中清除缓存
- 强制刷新浏览器（Ctrl+F5）

### Q: 输出目录应该填 `.opennext` 还是 `.opennext/static`？

**A:** 填写 `.opennext`（不带斜杠和后缀）

## 📞 需要帮助？

如果按照以上步骤操作后仍然显示 "Hello world"，请告诉我：
1. 你看到的"构建输出目录"字段的值是什么？
2. 构建日志的最后几行是什么？
3. 是否有任何错误信息？

