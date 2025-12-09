# Sora2 API 配置所需参数

根据 [API 文档](https://ai604520.apifox.cn/386993924e0)，以下是配置和使用 Sora2 视频生成 API 所需的参数：

## ✅ 已配置的参数

1. **API 基础地址**: `https://ai.604520.top`（已设置）
2. **API 端点**: `/v1/videos`（OpenAI 官方视频格式）
3. **请求格式**: `multipart/form-data`（已实现）
4. **认证方式**: Bearer Token（已实现）

## 🔑 需要你提供的参数

### 必需参数

1. **API Key（Bearer Token）**
   - 在 `.env.local` 文件中设置：
   ```env
   NEXT_PUBLIC_SORA2_API_KEY=你的API密钥
   ```
   - 这是调用 API 的认证令牌，必需！

### 可选参数（有默认值）

以下参数已有默认值，但你可以根据需要修改：

```env
# API 请求超时时间（毫秒，默认 30000）
NEXT_PUBLIC_SORA2_TIMEOUT=30000

# 默认模型版本（默认 sora-2）
NEXT_PUBLIC_SORA2_DEFAULT_MODEL=sora-2

# API 端点类型（默认 openai-official）
NEXT_PUBLIC_SORA2_ENDPOINT_TYPE=openai-official
```

## 📋 API 请求参数说明

### 生成视频请求参数（multipart/form-data）

| 参数名 | 类型 | 必需 | 说明 | 示例 |
|--------|------|------|------|------|
| `model` | string | ✅ | 模型版本 | `sora-2` |
| `prompt` | string | ✅ | 提示词 | `画面动起来` |
| `seconds` | string | ✅ | 时长（秒） | `10` |
| `input_reference` | File | ✅ | 参考图片文件 | 图片文件对象 |
| `size` | string | ✅ | 尺寸格式：`16x9`, `9x16`, `1x1`, `21x9` | `16x9` |
| `watermark` | string | ✅ | 水印：`true` 或 `false` | `true` |
| `private` | string | ❌ | 私密模式：`true` 或 `false` | `false` |
| `character_url` | string | ❌ | 角色视频URL（角色提取功能） | `https://...` |
| `character_timestamps` | string | ❌ | 角色时间戳（格式：`1,3`） | `1,3` |

### API 响应格式

```json
{
  "id": "video_6048220c-b0d9-4292-b80b-9c6eaf73f112",
  "object": "video",
  "model": "sora_video2",
  "status": "queued",
  "progress": 0,
  "created_at": 1762326617,
  "seconds": "10",
  "size": "1280x720"
}
```

## ✅ 查询任务状态端点（已配置）

**端点**: `GET /v1/videos/{id}`  
**文档**: [查询任务 API 文档](https://ai604520.apifox.cn/386993920e0)

### 请求参数

| 参数名 | 位置 | 类型 | 必需 | 说明 | 示例 |
|--------|------|------|------|------|------|
| `id` | path | string | ✅ | 视频ID | `sora-2:task_01k81e7r1mf0qtvp3ett3mr4jm` 或 `video_5c6a605a-30c0-4a6a-9dbd-d1d6cfdd9980` |

### 响应格式

**pending 状态**:
```json
{
  "id": "sora-2:task_01k6x15vhrff09dkkqjrzwhm60",
  "status": "pending",
  "video_url": null,
  "enhanced_prompt": "...",
  "status_update_time": 1759763621142
}
```

**completed 状态**:
```json
{
  "id": "video_5c6a605a-30c0-4a6a-9dbd-d1d6cfdd9980",
  "size": "1280x720",
  "model": "sora-2",
  "object": "video",
  "status": "completed",
  "seconds": "10",
  "progress": 100,
  "video_url": "https://midjourney-plus.oss-us-west-1.aliyuncs.com/sora/...",
  "created_at": 1761622232,
  "completed_at": 1761622385
}
```

### 使用示例

```typescript
import { getTaskStatus } from '@/lib/api/sora2';

// 查询任务状态
const status = await getTaskStatus('sora-2:task_01k81e7r1mf0qtvp3ett3mr4jm');

if (status.status === 'completed' && status.video_url) {
  console.log('视频已生成:', status.video_url);
} else if (status.status === 'pending') {
  console.log('任务处理中，进度:', status.progress || 0);
}
```

## ✅ 下载视频端点（已配置）

**端点**: `GET /v1/videos/{id}/content`  
**文档**: [下载视频 API 文档](https://ai604520.apifox.cn/386993921e0)

### 请求参数

| 参数名 | 位置 | 类型 | 必需 | 说明 | 示例 |
|--------|------|------|------|------|------|
| `id` | path | string | ✅ | 视频ID | `video_099c5197-abfd-4e16-88ff-1e162f2a5c77` |

### 响应格式

返回视频文件的二进制数据（Blob），可用于：
- 创建下载链接
- 在页面中显示视频
- 保存到本地

### 使用示例

```typescript
import { downloadVideo, downloadVideoAsFile, getVideoUrl } from '@/lib/api/sora2';

// 方式1：下载视频文件（触发浏览器下载）
await downloadVideoAsFile('video_099c5197-abfd-4e16-88ff-1e162f2a5c77', 'my-video.mp4');

// 方式2：获取视频 Blob（用于自定义处理）
const blob = await downloadVideo('video_099c5197-abfd-4e16-88ff-1e162f2a5c77');

// 方式3：获取视频 URL（用于在页面中显示）
const videoUrl = await getVideoUrl('video_099c5197-abfd-4e16-88ff-1e162f2a5c77');
// 在 <video> 标签中使用：
// <video src={videoUrl} controls />
```

## ❓ 可选功能

**获取任务列表的端点**（可选）
- 如果需要显示任务列表功能，需要任务列表查询端点
- 请提供相关 API 文档（如果有的话）

## 🚀 快速开始

1. 创建 `.env.local` 文件：
```env
NEXT_PUBLIC_SORA2_API_KEY=你的API密钥
```

2. 在代码中使用：
```typescript
import { generateVideoEasy } from '@/lib/api/sora2';

// 生成视频
const result = await generateVideoEasy({
  prompt: '未来的赛博朋克城市',
  aspect: '16:9',  // 会自动转换为 16x9
  seconds: '10',
  input_reference: file,  // File 对象
  watermark: true,
});
```

## 📝 注意事项

1. **文件上传**: `input_reference` 必须是 `File` 对象，不能是 base64 字符串
2. **尺寸格式**: API 要求 `16x9` 格式（不是 `16:9`），代码会自动转换
3. **字符串类型**: `watermark` 和 `private` 必须是字符串 `'true'` 或 `'false'`，不是布尔值
4. **Bearer Token**: API 使用 Bearer Token 认证，确保 API Key 正确设置

