# API 配置说明

## 目录结构

```
config/
├── sora2.ts      # Sora2 API 配置
└── index.ts      # 统一导出
```

## 环境变量配置

在项目根目录创建 `.env.local` 文件（此文件已被 git 忽略，不会提交到仓库）：

```env
# Sora2 API 基础地址（已设置为官方地址）
NEXT_PUBLIC_SORA2_API_URL=https://ai.604520.top

# Sora2 API Key（必需！请提供你的 Bearer Token）
NEXT_PUBLIC_SORA2_API_KEY=your_api_key_here

# Sora2 API Secret（可选）
NEXT_PUBLIC_SORA2_API_SECRET=your_api_secret_here

# API 请求超时时间（毫秒，默认 30000）
NEXT_PUBLIC_SORA2_TIMEOUT=30000

# 默认模型版本（默认 sora-2）
NEXT_PUBLIC_SORA2_DEFAULT_MODEL=sora-2

# API 端点类型（推荐：openai-official）
# 可选值：
#   - openai-official: OpenAI官方视频格式 (/v1/videos) - 推荐使用
#   - unified-format: 视频统一格式 (/v1/video/create)
#   - custom: 自定义端点（需要设置 NEXT_PUBLIC_SORA2_CUSTOM_ENDPOINT）
NEXT_PUBLIC_SORA2_ENDPOINT_TYPE=openai-official

# 自定义端点路径（仅当 endpointType 为 'custom' 时使用）
NEXT_PUBLIC_SORA2_CUSTOM_ENDPOINT=/v1/custom/videos
```

## 使用方法

### 1. 导入配置

```typescript
import { sora2Config, getSora2Headers, getSora2ApiUrl } from '@/config/sora2';
```

### 2. 使用 API 服务

```typescript
import { generateVideo, getTaskStatus } from '@/lib/api/sora2';

// 生成视频
const result = await generateVideo({
  prompt: '未来的赛博朋克城市',
  model: 'sora-2',
  aspect: '16:9',
  duration: '10',
});

// 查询任务状态
const status = await getTaskStatus(result.taskId);
```

### 3. 直接使用配置

```typescript
import { sora2Config } from '@/config/sora2';

console.log(sora2Config.baseUrl);
console.log(sora2Config.apiKey);
```

## API 端点选择建议

根据你的图片显示，有三个可用的端点：

1. **`/v1/videos` (OpenAI官方视频格式)** ⭐ **推荐**
   - 兼容 OpenAI 官方 API 格式
   - 标准化程度高，文档完善
   - 设置：`NEXT_PUBLIC_SORA2_ENDPOINT_TYPE=openai-official`

2. **`/v1/video/create` (视频统一格式)**
   - 通用视频创建接口
   - 可能支持更多自定义参数
   - 设置：`NEXT_PUBLIC_SORA2_ENDPOINT_TYPE=unified-format`

3. **`/v1/chat/completions` (OpenAI聊天接口)**
   - 仅用于文本对话，不适用于视频生成

**推荐使用 `/v1/videos`**，因为：
- Sora 是 OpenAI 的产品，使用官方格式更标准
- 兼容性和稳定性更好
- 文档和示例更丰富

## 注意事项

1. 所有环境变量必须以 `NEXT_PUBLIC_` 开头才能在客户端使用
2. 修改 `.env.local` 后需要重启开发服务器
3. 敏感信息（如 API Key）不要提交到代码仓库
4. 默认使用 `openai-official` 端点类型（`/v1/videos`）

