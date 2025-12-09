

### 项目名称
Toolset-web

### 项目路径
F:\Toolset-web

### API基础地址
- **主接口**：`https://ai.604520.top/v1/videos`
- **API端点类型**：OpenAI官方视频格式 (`openai-official`)
- **请求格式**：`multipart/form-data`
- **认证方式**：Bearer Token

### 环境变量配置
- `NEXT_PUBLIC_SORA2_API_URL`：API基础地址（默认：`https://ai.604520.top`）
- `NEXT_PUBLIC_SORA2_API_KEY`：API密钥（必需）
- `NEXT_PUBLIC_SORA2_TIMEOUT`：请求超时时间（默认：30000毫秒）
- `NEXT_PUBLIC_SORA2_DEFAULT_MODEL`：默认模型（默认：`sora-2`）
- `NEXT_PUBLIC_SORA2_ENDPOINT_TYPE`：端点类型（默认：`openai-official`）

### 项目架构
- **框架**：Next.js（App Router）
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **存储**：localStorage（客户端持久化）
- **HTTP客户端**：Fetch API

## 核心功能

### 1. Sora2 视频生成功能

#### 功能描述
支持文生视频和图生视频两种模式，调用 `/v1/videos` 接口生成视频。

#### 支持的模型
- `sora-2`：Sora 2.0 模型（默认模型）
- `sora-2-landscape`：Sora 1.0 模型（横屏专用）

#### 模型特性
- **sora-2**：
  - HD选项默认关闭且禁用
  - 不支持高清模式
- **sora-2-landscape**：
  - HD选项默认开启且可用
  - 支持高清模式

#### 视频生成参数
- **提示词（prompt）**：必需，视频描述文本
- **模型（model）**：必需，模型版本（`sora-2` 或 `sora-2-landscape`）
- **宽高比（aspect）**：必需，支持 `16:9`（横屏）、`9:16`（竖屏）、`1:1`（方形）、`21:9`（电影）
- **时长（duration）**：必需，支持 `10秒`、`15秒`
- **参考图片（input_reference）**：
  - 文生视频模式：自动创建1x1透明PNG占位图
  - 图生视频模式：用户上传的图片文件
- **高清（HD）**：可选，布尔值，根据模型自动控制
- **水印（watermark）**：可选，布尔值，默认 `true`
- **私密模式（private）**：可选，布尔值，默认 `true`

#### 视频任务管理
- **任务列表**：显示所有视频生成任务
- **任务状态**：`pending`（排队中）、`processing`（处理中）、`in_progress`（进行中）、`queued`（排队中）、`completed`（已完成）、`succeeded`（成功）、`failed`（失败）
- **进度显示**：实时显示生成进度（0-100%）
- **任务持久化**：所有任务自动保存到 localStorage，刷新后恢复
- **任务删除**：支持删除单个任务（带确认对话框）

#### 进度轮询机制
- 任务创建后自动开始轮询状态
- 轮询间隔：根据任务状态动态调整
- 进度更新逻辑：如果API返回 `progress: undefined`，保留之前的进度值，避免重置为0%

### 2. 角色提取功能

#### 功能描述
从已生成的视频中提取角色信息，支持角色复用。

#### 角色提取流程
1. 用户点击"提取角色"按钮
2. 弹出角色提取表单弹窗
3. 填写角色信息：
   - **角色名**：限制10个字符，系统自动在后面添加5位随机字符（格式：`角色名_XXXXX`）
   - **人物描述词**：最多500字符，用于AI生成角色
   - **角色头像**：可选，支持JPG、PNG、WebP，最大10MB（仅用于本地识别，不传到sora2）
   - **视频截取时长**：1-3秒，选择视频中需要生成角色的时间段
4. 提交后调用 `/v1/videos` 接口，传递：
   - `character_url`：视频URL（必需）
   - `character_timestamps`：时间戳（格式：`0,1` 表示0-1秒）
   - `character_name`：角色名（带随机后缀）
   - `prompt`：人物描述词
   - **注意**：不发送 `input_reference` 参数

#### 角色数据存储
- **角色信息**：
  - `id`：唯一标识
  - `name`：角色名（带随机后缀）
  - `avatar`：头像（用户上传的base64或API返回的URL）
  - `videoUrl`：原始视频URL
  - `characterUrl`：角色视频URL（API返回）
  - `timestamps`：时间戳
  - `createdAt`：创建时间
- **存储位置**：localStorage
- **我的角色列表**：显示所有已提取的角色，支持选择复用

#### 角色提取任务管理
- **任务列表**：显示所有角色提取任务
- **任务状态**：与视频任务相同的状态体系
- **进度显示**：实时显示提取进度
- **任务持久化**：所有任务自动保存到 localStorage
- **任务删除**：支持删除单个任务

#### 角色复用
- 在视频生成时，可以选择已提取的角色
- 选择角色后，自动携带 `character_url` 和 `character_timestamps` 参数
- 角色信息在生成请求中自动传递

### 3. API密钥管理功能

#### 功能描述
管理API密钥，支持本地存储、自动前缀、实时验证。

#### API密钥读取优先级
1. **本地存储**（localStorage）：优先读取
2. **环境变量**（`NEXT_PUBLIC_SORA2_API_KEY`）：本地存储为空时读取

#### API密钥输入处理
- **自动添加前缀**：用户输入时，失去焦点后自动添加 `Bearer ` 前缀
- **智能去重**：如果已包含 `Bearer ` 前缀，不再重复添加
- **保存格式**：保存时保存完整格式（包含 `Bearer ` 前缀）
- **使用格式**：使用时直接使用保存的完整格式，不再添加前缀

#### API密钥验证
- **验证时机**：点击"保存设置"按钮时
- **验证方法**：发送GET请求到 `/v1/videos` 端点，使用提供的密钥
- **验证结果**：
  - **成功**：状态码200/400/404/405，显示"已保存"（绿色）
  - **失败**：状态码401/403，显示"密钥错误"（红色）
  - **验证中**：显示"验证中..."（灰色，禁用按钮）

#### API密钥存储
- **存储位置**：localStorage（键名：`sora2_api_key`）
- **持久化**：刷新页面后自动恢复
- **UI位置**：顶部导航栏，API密钥输入框和保存按钮

## 开发规则

### 核心约束（不可修改）
1. **三大核心功能不可修改**：
   - Sora2 视频生成功能
   - 角色提取功能
   - API密钥管理功能

2. **API基础地址不变**：
   - 主接口地址：`https://ai.604520.top/v1/videos`
   - 不允许修改API基础地址

3. **增量开发原则**：
   - 所有新功能必须在现有功能基础上扩展
   - 不允许破坏现有功能
   - 保持向后兼容

### 代码规范

#### API调用规范
- **统一使用**：`lib/api/sora2.ts` 中的函数
- **请求头**：
  - JSON请求：使用 `getSora2Headers()`
  - 文件上传：使用 `getSora2MultipartHeaders()`
- **错误处理**：所有API调用必须包含 try-catch 错误处理
- **超时设置**：使用 `sora2Config.timeout` 或默认60000毫秒

#### 数据持久化规范
- **统一使用**：`lib/storage.ts` 中的函数
- **存储键名**：使用 `STORAGE_KEYS` 常量
- **数据类型**：所有存储数据必须符合定义的接口类型
- **客户端检查**：所有localStorage操作前必须检查 `typeof window !== 'undefined'`

#### 状态管理规范
- **任务状态**：使用统一的状态值（`pending`、`processing`、`in_progress`、`queued`、`completed`、`succeeded`、`failed`）
- **进度更新**：如果API返回 `progress: undefined`，保留之前的进度值
- **轮询管理**：使用 `useRef` 存储轮询间隔，组件卸载时清理

#### UI组件规范
- **样式系统**：统一使用 Tailwind CSS
- **主题**：深色主题（`bg-neutral-900`、`text-white` 等）
- **响应式**：支持移动端和桌面端
- **交互反馈**：按钮状态（loading、success、error、disabled）必须有视觉反馈

### 特殊处理规则

#### 文生视频占位图
- **创建方式**：自动创建1x1透明PNG图片
- **使用场景**：文生视频模式（`videoMode === "text-to-video"`）
- **实现位置**：`app/(with-nav)/sora/page.tsx` 中的 `createPlaceholderImage` 函数

#### 角色提取不发送input_reference
- **规则**：角色提取时，不发送 `input_reference` 参数
- **原因**：避免API误判占位图为写实人物
- **实现位置**：`lib/api/sora2.ts` 中的 `extractCharacter` 函数

#### 角色名自动添加随机后缀
- **规则**：用户输入的角色名（最多10字符），系统自动在后面添加5位随机字符
- **格式**：`角色名_XXXXX`（X为大写字母或数字）
- **实现位置**：`components/ExtractCharacterModal.tsx` 中的 `generateRandomSuffix` 函数

#### 模型与HD选项联动
- **sora-2**：HD选项自动关闭且禁用
- **sora-2-landscape**：HD选项自动开启且可用
- **实现位置**：`app/(with-nav)/sora/page.tsx` 中的 `useEffect` 钩子

## 已知问题

### 已修复问题

#### 1. 视频生成进度显示问题
- **问题描述**：进度条显示0%，直到视频完成才突然显示100%
- **根本原因**：API在某些状态下返回 `progress: undefined`，导致进度被重置为0
- **修复方案**：在 `pollTaskStatus` 函数中，如果API返回 `progress: undefined`，保留之前的进度值
- **修复位置**：`app/(with-nav)/sora/page.tsx` 中的进度更新逻辑

#### 2. 角色提取误判写实人物
- **问题描述**：提取卡通角色时，API返回"当前不支持上传包含写实人物的图像"
- **根本原因**：发送了1x1透明PNG占位图作为 `input_reference`，API误判为写实人物
- **修复方案**：角色提取时不发送 `input_reference` 参数
- **修复位置**：`lib/api/sora2.ts` 中的 `extractCharacter` 函数

#### 3. 角色提取完成后不显示
- **问题描述**：角色提取任务显示"已完成"，但"我的角色列表"中没有显示角色
- **根本原因**：`TaskStatusResponse` 接口缺少角色信息字段，且任务完成时未提取并保存角色信息
- **修复方案**：
  - 更新 `TaskStatusResponse` 接口，添加 `character_name`、`character_avatar`、`character_url`、`character_timestamps` 字段
  - 在 `pollCharacterTaskStatus` 函数中，任务完成时提取并保存角色信息
- **修复位置**：`lib/api/sora2.ts` 和 `app/(with-nav)/sora/page.tsx`

### 潜在问题

#### 1. 进度轮询可能造成资源浪费
- **问题描述**：多个任务同时轮询可能造成频繁的网络请求
- **缓解方案**：使用 `useRef` 管理轮询间隔，组件卸载时清理

#### 2. localStorage 存储限制
- **问题描述**：大量任务和角色数据可能超出 localStorage 限制（通常5-10MB）
- **缓解方案**：定期清理旧任务，或实现分页加载

## 技术栈

### 前端框架
- **Next.js**：React框架，使用App Router
- **React**：UI库，使用Hooks（useState、useEffect、useRef、useMemo）
- **TypeScript**：类型系统

### 样式系统
- **Tailwind CSS**：原子化CSS框架
- **主题**：深色主题（neutral色系）

### 数据存储
- **localStorage**：客户端持久化存储
- **存储键名**：
  - `sora2_api_key`：API密钥
  - `sora2_api_base_url`：API基础地址
  - `sora2_characters`：角色列表
  - `sora2_video_tasks`：视频任务列表
  - `sora2_character_tasks`：角色提取任务列表

### HTTP客户端
- **Fetch API**：原生HTTP客户端
- **请求格式**：
  - JSON请求：`application/json`
  - 文件上传：`multipart/form-data`
- **认证方式**：Bearer Token（`Authorization: Bearer {token}`）

### 开发工具
- **Node.js**：运行时环境
- **npm**：包管理器
- **开发服务器**：Next.js Dev Server（默认端口3000，可配置）

## 后续计划

### 功能扩展
- 根据用户需求继续扩展功能
- 保持增量开发原则，不破坏现有功能

### 优化方向
- 性能优化：减少不必要的轮询请求
- 用户体验：优化加载状态和错误提示
