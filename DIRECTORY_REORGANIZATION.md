# 项目目录规整说明

## ✅ 已完成的工作

### 1. 绝对路径修复
- ✅ 修复了 `python_example.py` 中的绝对路径
  - 将 `file:///Users/xxx/Desktop/纯白占位图.png` 改为相对路径示例
  - 添加了注释说明，提示用户替换为实际路径

### 2. 路径引用验证
- ✅ 创建了路径分析脚本 (`scripts/analyze-imports.js`)
- ✅ 创建了路径验证脚本 (`scripts/verify-paths.js`)
- ✅ 验证结果：所有路径引用正常，无错误

### 3. 项目结构文档
- ✅ 创建了 `PROJECT_STRUCTURE.md` - 详细的目录结构说明
- ✅ 创建了 `DIRECTORY_REORGANIZATION.md` - 目录规整说明

## 📁 当前项目结构

项目当前结构已经合理，符合 Next.js 最佳实践：

```
Toolset-web/
├── app/                    # 前端页面（Next.js 要求，必须在根目录）
├── components/            # 公共组件
├── lib/                   # 工具库和 API
├── config/                # 配置文件
├── scripts/               # 脚本文件
├── public/                # 静态资源（如需要）
└── docs/                  # 文档文件（如需要）
```

## 🔗 路径引用机制

### TypeScript 路径别名
- 使用 `@/` 别名指向项目根目录
- 配置在 `tsconfig.json` 中：`"@/*": ["./*"]`
- 所有引用都使用别名，确保路径统一

### 引用示例
```typescript
// ✅ 正确：使用别名
import { generateVideo } from "@/lib/api/sora2";
import ExtractCharacterModal from "@/components/ExtractCharacterModal";

// ❌ 错误：绝对路径
import { generateVideo } from "F:/Toolset-web/lib/api/sora2";
```

## ⚠️ 目录重组注意事项

### Next.js 特殊要求
1. **`app` 目录必须在根目录**：Next.js App Router 框架要求，不能移动
2. **配置文件必须在根目录**：`next.config.mjs`、`tsconfig.json` 等

### 如果未来需要重组
1. 保持 `app` 目录在根目录
2. 更新 `tsconfig.json` 中的 `paths` 配置
3. 更新所有文件的 `import` 语句
4. 更新 `tailwind.config.ts` 中的 `content` 路径
5. 运行验证脚本确保路径正确

## 🔍 路径验证工具

### 分析导入路径
```bash
node scripts/analyze-imports.js
```
- 分析所有文件的导入语句
- 统计路径类型（`@/`、`./`、`../`、`node_modules`）
- 检测可能的绝对路径

### 验证路径有效性
```bash
node scripts/verify-paths.js
```
- 验证所有 `import`/`require` 语句的路径是否存在
- 检测绝对路径
- 输出详细的错误和警告报告

## ✅ 验证结果

运行 `node scripts/verify-paths.js` 的结果：
- ✅ **0 个路径错误**：所有引用路径都有效
- ⚠️ **0 个绝对路径警告**：已修复所有绝对路径

## 📝 最佳实践

1. **使用路径别名**：始终使用 `@/` 别名，不要使用相对路径 `../`
2. **避免绝对路径**：不要在代码中使用绝对路径（如 `C:\`、`D:\`、`/Users/`）
3. **保持结构清晰**：按功能模块组织文件，但遵循框架要求
4. **定期验证**：使用验证脚本定期检查路径引用

## 🚀 部署兼容性

- ✅ 所有路径都是相对路径或使用别名
- ✅ 不依赖绝对路径
- ✅ 服务器部署时无需修改任何路径
- ✅ 功能、界面 1:1 还原，无任何变动

## 📋 总结

项目目录结构已经合理，符合 Next.js 最佳实践：
- ✅ 所有路径引用正常
- ✅ 无绝对路径问题
- ✅ 引用逻辑清晰统一
- ✅ 部署兼容性良好

**无需进行目录重组**，当前结构已经是最佳实践。

