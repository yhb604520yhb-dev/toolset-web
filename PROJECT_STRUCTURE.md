# 项目目录结构说明

## 📁 目录结构

```
Toolset-web/
├── app/                    # 前端页面（Next.js App Router 要求，必须在根目录）
│   ├── (with-nav)/        # 路由组（带导航的页面）
│   │   ├── layout.tsx     # 布局组件
│   │   ├── sora/          # Sora 2 Generator 页面
│   │   ├── veo/           # Veo 页面
│   │   └── nanobanana/    # Nanobanana 页面
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   ├── globals.css        # 全局样式
│   └── fonts/             # 字体文件
│
├── components/            # 公共组件
│   └── ExtractCharacterModal.tsx  # 角色提取弹窗组件
│
├── lib/                   # 工具库和 API
│   ├── api/
│   │   └── sora2.ts       # Sora2 API 服务
│   └── storage.ts         # 本地存储工具
│
├── config/                # 配置文件
│   ├── sora2.ts           # Sora2 API 配置
│   ├── index.ts           # 统一导出
│   └── README.md          # 配置说明
│
├── scripts/               # 脚本文件
│   ├── clean-redundant.js      # 清理冗余文件脚本
│   ├── analyze-imports.js      # 分析导入路径脚本
│   └── reorganize-structure.js # 目录重组脚本（备用）
│
├── public/                # 静态资源（如需要）
│
├── docs/                  # 文档文件
│   ├── README.md          # 项目说明
│   ├── project-core.md    # 项目核心规则
│   ├── OPTIMIZATION.md    # 优化说明
│   └── python_example.py  # Python 示例代码
│
├── node_modules/          # 依赖包（git 忽略）
├── .next/                 # Next.js 构建缓存（git 忽略）
│
├── .gitignore             # Git 忽略配置
├── .npmignore             # NPM 忽略配置
├── next.config.mjs        # Next.js 配置
├── tailwind.config.ts     # Tailwind CSS 配置
├── postcss.config.mjs     # PostCSS 配置
├── tsconfig.json          # TypeScript 配置
├── package.json           # 项目依赖配置
└── package-lock.json      # 依赖锁定文件
```

## 📂 功能模块分类

### 1. 前端页面 (`app/`)
- **位置**: 项目根目录（Next.js 框架要求）
- **说明**: Next.js App Router 要求 `app` 目录必须在根目录，不能移动
- **内容**: 
  - 页面组件（`.tsx` 文件）
  - 布局组件（`layout.tsx`）
  - 全局样式（`globals.css`）
  - 字体文件（`fonts/`）

### 2. 公共组件 (`components/`)
- **位置**: 项目根目录
- **说明**: 可复用的 React 组件
- **引用方式**: `@/components/ComponentName`

### 3. 工具库和 API (`lib/`)
- **位置**: 项目根目录
- **说明**: 
  - API 服务封装
  - 工具函数
  - 数据存储工具
- **引用方式**: `@/lib/api/sora2`、`@/lib/storage`

### 4. 配置文件 (`config/`)
- **位置**: 项目根目录
- **说明**: 
  - API 配置
  - 环境变量配置
  - 统一导出
- **引用方式**: `@/config/sora2`

### 5. 静态资源 (`public/`)
- **位置**: 项目根目录（如需要）
- **说明**: 静态文件（图片、字体等）
- **引用方式**: `/filename.ext`（Next.js 自动处理）

### 6. 脚本文件 (`scripts/`)
- **位置**: 项目根目录
- **说明**: 构建、清理、分析等脚本
- **运行方式**: `node scripts/script-name.js`

### 7. 文档文件 (`docs/`)
- **位置**: 项目根目录（如需要）
- **说明**: 项目文档、示例代码
- **内容**: README、API 文档、优化说明等

## 🔗 路径引用说明

### TypeScript/JavaScript 路径别名

项目使用 `@/` 别名指向项目根目录，配置在 `tsconfig.json` 中：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 引用示例

```typescript
// 引用组件
import ExtractCharacterModal from "@/components/ExtractCharacterModal";

// 引用 API
import { generateVideo } from "@/lib/api/sora2";

// 引用配置
import { sora2Config } from "@/config/sora2";

// 引用工具
import { saveCharacter } from "@/lib/storage";
```

### 静态资源引用

```tsx
// Next.js 自动处理 public 目录
<img src="/favicon.ico" alt="favicon" />
```

## ⚠️ 重要说明

1. **`app` 目录不能移动**: Next.js App Router 要求 `app` 目录必须在根目录
2. **路径别名**: 所有代码使用 `@/` 别名，确保引用路径统一
3. **相对路径**: 项目中没有硬编码的绝对路径，所有路径都是相对路径或使用别名
4. **配置文件**: `next.config.mjs`、`tsconfig.json` 等配置文件必须在根目录

## 🔄 目录重组注意事项

如果未来需要重组目录结构：

1. **保持 `app` 目录在根目录**（Next.js 要求）
2. **更新 `tsconfig.json` 中的 `paths` 配置**
3. **更新所有文件的 `import` 语句**
4. **更新 `tailwind.config.ts` 中的 `content` 路径**
5. **测试所有功能确保引用正常**

## 📝 路径校验

运行以下命令检查路径引用：

```bash
node scripts/analyze-imports.js
```

这将分析项目中所有的导入路径，确保没有绝对路径或错误的引用。

