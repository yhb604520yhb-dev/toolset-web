/**
 * Sora2 API 服务
 * 用于调用 Sora2 视频生成 API
 */

import { sora2Config, getSora2Headers, getSora2MultipartHeaders, getSora2ApiUrl, getCurrentApiKey } from '@/config/sora2';

export interface GenerateVideoRequest {
  /** 提示词（必需） */
  prompt: string;
  /** 模型版本（必需，默认：sora-2） */
  model?: string;
  /** 宽高比，格式：16x9, 9x16, 1x1, 21x9（必需） */
  size: string;
  /** 时长（秒，必需，字符串格式） */
  seconds: string;
  /** 参考图片文件（可选，使用角色时不发送） */
  input_reference?: File;
  /** 水印（必需，字符串：'true' 或 'false'） */
  watermark: string;
  /** 私密模式（可选，字符串：'true' 或 'false'，默认：'false'） */
  private?: string;
  /** 角色视频URL（可选，用于角色提取） */
  character_url?: string;
  /** 角色时间戳（可选，格式：'1,3'，用于角色提取） */
  character_timestamps?: string;
}

export interface GenerateVideoResponse {
  /** 视频ID */
  id: string;
  /** 对象类型 */
  object: string;
  /** 模型版本 */
  model: string;
  /** 状态（queued, processing, completed, failed） */
  status: string;
  /** 进度（0-100） */
  progress: number;
  /** 创建时间戳 */
  created_at: number;
  /** 时长（秒） */
  seconds: string;
  /** 尺寸 */
  size: string;
}

/**
 * 任务状态响应（根据 API 文档）
 * 注意：pending 和 completed 状态的响应格式不同
 */
export interface TaskStatusResponse {
  /** 视频ID（格式可能是：sora-2:task_xxx 或 video_xxx） */
  id: string;
  /** 状态（pending, processing, in_progress, queued, completed, succeeded, failed） */
  status: 'pending' | 'processing' | 'in_progress' | 'queued' | 'completed' | 'succeeded' | 'failed';
  /** 视频URL（完成时才有，pending 时为 null） */
  video_url: string | null;
  /** 增强后的提示词（pending 状态时存在） */
  enhanced_prompt?: string;
  /** 状态更新时间戳 */
  status_update_time?: number;
  /** 对象类型（completed 状态时存在） */
  object?: string;
  /** 模型版本（completed 状态时存在） */
  model?: string;
  /** 进度（0-100，completed 状态时存在） */
  progress?: number;
  /** 创建时间戳（completed 状态时存在） */
  created_at?: number;
  /** 完成时间戳（completed 状态时存在） */
  completed_at?: number;
  /** 时长（秒，completed 状态时存在） */
  seconds?: string;
  /** 尺寸（completed 状态时存在） */
  size?: string;
  /** 错误信息（失败时） */
  error?: string;
  /** 角色名（角色提取完成时存在） */
  character_name?: string;
  /** 角色头像URL（角色提取完成时存在） */
  character_avatar?: string;
  /** 角色视频URL（角色提取完成时存在） */
  character_url?: string;
  /** 角色时间戳（角色提取完成时存在） */
  character_timestamps?: string;
}

/**
 * 将宽高比格式从 "16:9" 转换为 "16x9"
 */
function convertAspectToSize(aspect: string): string {
  return aspect.replace(':', 'x');
}

/**
 * 处理API错误响应
 * 400状态码可能是密钥余额不足
 */
function handleApiError(response: Response, defaultMessage: string = '请求失败'): never {
  return response.json().then((error) => {
    // 400状态码可能是密钥余额不足
    if (response.status === 400) {
      throw new Error(error.message || '密钥余额不足，请检查API密钥或充值');
    }
    // 429状态码：请求频率过高
    if (response.status === 429) {
      throw new Error(error.message || '请求频率过高，请稍后重试（HTTP 429）');
    }
    // 401状态码：密钥无效
    if (response.status === 401) {
      throw new Error(error.message || 'API密钥无效，请检查API密钥');
    }
    // 403状态码：权限不足
    if (response.status === 403) {
      throw new Error(error.message || 'API密钥权限不足');
    }
    // 500状态码：服务器内部错误（可能是负载过高、服务器繁忙等）
    if (response.status === 500) {
      throw new Error(error.message || '服务器内部错误，请稍后重试（HTTP 500）');
    }
    throw new Error(error.message || `${defaultMessage} (HTTP ${response.status})`);
  }).catch((err) => {
    // 如果JSON解析失败，使用默认错误信息
    if (response.status === 400) {
      throw new Error('密钥余额不足，请检查API密钥或充值');
    }
    if (response.status === 429) {
      throw new Error('请求频率过高，请稍后重试（HTTP 429）');
    }
    if (response.status === 401) {
      throw new Error('API密钥无效，请检查API密钥');
    }
    if (response.status === 403) {
      throw new Error('API密钥权限不足');
    }
    if (response.status === 500) {
      throw new Error('服务器内部错误，请稍后重试（HTTP 500）');
    }
    throw err instanceof Error ? err : new Error(`${defaultMessage} (HTTP ${response.status})`);
  }) as never;
}

/**
 * 统一视频接口请求参数
 */
export interface UnifiedVideoRequest {
  /** 提示词（必需） */
  prompt: string;
  /** 模型版本（必需，默认：sora-2） */
  model?: string;
  /** 方向：portrait（竖屏）或 landscape（横屏） */
  orientation?: 'portrait' | 'landscape';
  /** 时长（整数）：10, 15, 25 */
  duration?: number;
  /** 尺寸：large（高清）或 small（一般） */
  size: 'large' | 'small';
  /** 图片数组（可选，字符串数组） */
  images?: string[];
  /** 角色视频URL（可选） */
  character_url?: string;
  /** 角色时间戳（可选，格式：'1,3'） */
  character_timestamps?: string;
}

/**
 * 统一视频接口响应
 */
export interface UnifiedVideoResponse {
  /** 任务ID */
  id: string;
  /** 状态 */
  status: string;
  /** 状态更新时间戳 */
  status_update_time?: number;
}

/**
 * 生成视频（统一视频接口）
 * 端点：POST /v1/video/create
 * 格式：application/json
 */
export async function generateVideoUnified(
  params: UnifiedVideoRequest
): Promise<UnifiedVideoResponse> {
  const url = getSora2ApiUrl('/v1/video/create');
  
  // 构建 JSON 请求体
  const body: any = {
    model: params.model || sora2Config.defaultModel || 'sora-2',
    prompt: params.prompt,
    size: params.size,
  };
  
  if (params.orientation) {
    body.orientation = params.orientation;
  }
  
  if (params.duration !== undefined) {
    body.duration = params.duration;
  }
  
  if (params.images && params.images.length > 0) {
    body.images = params.images;
  }
  
  if (params.character_url) {
    body.character_url = params.character_url;
  }
  
  if (params.character_timestamps) {
    body.character_timestamps = params.character_timestamps;
  }
  
  // 使用配置的超时时间（默认60秒）
  const modelName = params.model || sora2Config.defaultModel || 'sora-2';
  const timeout = sora2Config.timeout || 60000;
  
  console.log(`⏱️ 超时设置: ${timeout / 1000}秒 (模型: ${modelName})`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...getSora2Headers(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    await handleApiError(response, '生成视频失败');
  }

  return response.json();
}

/**
 * 生成视频（OpenAI 官方格式）
 * 注意：此 API 使用 multipart/form-data 格式
 */
export async function generateVideo(
  params: GenerateVideoRequest
): Promise<GenerateVideoResponse> {
  // 使用配置的端点类型（默认使用 OpenAI 官方格式 /v1/videos）
  const url = getSora2ApiUrl();
  
  // 构建 FormData
  const formData = new FormData();
  const modelName = params.model || sora2Config.defaultModel || 'sora-2';
  formData.append('model', modelName);
  formData.append('prompt', params.prompt);
  formData.append('seconds', params.seconds);
  formData.append('size', params.size);
  formData.append('watermark', params.watermark);
  
  // 如果使用角色，不发送 input_reference，避免API误判占位图为写实人物
  // 如果不使用角色，则发送 input_reference（占位图或用户上传的图片）
  if (!params.character_url && params.input_reference) {
    formData.append('input_reference', params.input_reference);
  }
  
  if (params.private !== undefined) {
    formData.append('private', params.private);
  }
  
  if (params.character_url) {
    formData.append('character_url', params.character_url);
  }
  
  if (params.character_timestamps) {
    formData.append('character_timestamps', params.character_timestamps);
  }
  
  // 使用配置的超时时间（默认60秒）
  const timeout = sora2Config.timeout || 60000;
  
  console.log(`⏱️ 超时设置: ${timeout / 1000}秒 (模型: ${modelName})`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getSora2MultipartHeaders(), // 使用 multipart headers（不设置 Content-Type）
    body: formData,
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    await handleApiError(response, '生成视频失败');
  }

  return response.json();
}

/**
 * Chat Completions 接口请求参数（用于 HD 模型）
 */
export interface ChatCompletionsVideoRequest {
  /** 提示词（必需） */
  prompt: string;
  /** 模型版本（必需） */
  model: string;
  /** 图片 URL（可选，用于图生视频） */
  imageUrl?: string;
  /** 最大 tokens（可选，默认 1000） */
  maxTokens?: number;
  /** 是否流式输出（可选，默认 false） */
  stream?: boolean;
}

/**
 * Chat Completions 接口响应
 */
export interface ChatCompletionsVideoResponse {
  /** 任务ID（从 choices[0].message.content 中提取） */
  id: string;
  /** 对象类型 */
  object: string;
  /** 创建时间 */
  created: number;
  /** 选择列表 */
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  /** 使用情况 */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 生成视频（Chat Completions 接口，用于 HD 模型）
 * 端点：POST /v1/chat/completions
 * 格式：application/json
 * 支持文生视频和图生视频
 */
export async function generateVideoChatCompletions(
  params: ChatCompletionsVideoRequest
): Promise<ChatCompletionsVideoResponse & { id: string; status?: string }> {
  const baseUrl = sora2Config.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/v1/chat/completions`;
  
  // 构建 messages 数组
  let messages: any[];
  
  if (params.imageUrl) {
    // 图生视频模式：content 是数组，包含 text 和 image_url
    messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: params.prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: params.imageUrl,
            },
          },
        ],
      },
    ];
  } else {
    // 文生视频模式：content 是字符串
    messages = [
      {
        role: 'user',
        content: params.prompt,
      },
    ];
  }
  
  // 构建请求体
  // 注意：根据实际 API 行为，可能不需要 tools 和 tool_choice 参数
  // 或者这两个参数导致 429 错误，先尝试不传这两个参数
  const body: any = {
    model: params.model,
    messages: messages,
    max_tokens: params.maxTokens || 1000,
    stream: params.stream || false,
  };
  
  // 使用配置的超时时间（默认60秒）
  const timeout = sora2Config.timeout || 60000;
  
  console.log(`⏱️ Chat Completions 超时设置: ${timeout / 1000}秒 (模型: ${params.model})`);
  console.log(`📋 请求体:`, JSON.stringify(body, null, 2));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...getSora2Headers(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    await handleApiError(response, '生成视频失败');
  }

  const result: ChatCompletionsVideoResponse = await response.json();
  
  // 从响应中提取任务ID
  // 根据 API 文档，任务ID可能在 choices[0].message.content 中（JSON字符串）
  // 或者直接返回 video_xxx 格式的ID
  let taskId = '';
  let status = 'pending';
  
  if (result.choices && result.choices.length > 0) {
    const content = result.choices[0].message.content;
    try {
      // 尝试解析 content 为 JSON（如果包含任务信息）
      const contentJson = JSON.parse(content);
      if (contentJson.id) {
        taskId = contentJson.id;
      }
      if (contentJson.status) {
        status = contentJson.status;
      }
    } catch (e) {
      // 如果不是 JSON，content 可能就是任务ID
      taskId = content;
    }
  }
  
  // 如果没有提取到任务ID，使用响应的 id
  if (!taskId && result.id) {
    taskId = result.id;
  }
  
  return {
    ...result,
    id: taskId,
    status: status,
  };
}

/**
 * 生成视频（便捷方法，自动转换参数格式）
 */
export async function generateVideoEasy(params: {
  prompt: string;
  model?: string;
  aspect: string; // 格式：16:9, 9:16, 1:1, 21:9
  seconds: string | number;
  input_reference: File;
  watermark?: boolean;
  private?: boolean;
  character_url?: string;
  character_timestamps?: string;
}): Promise<GenerateVideoResponse> {
  return generateVideo({
    prompt: params.prompt,
    model: params.model,
    size: convertAspectToSize(params.aspect),
    seconds: typeof params.seconds === 'number' ? params.seconds.toString() : params.seconds,
    input_reference: params.input_reference,
    watermark: params.watermark !== undefined ? (params.watermark ? 'true' : 'false') : 'true',
    private: params.private !== undefined ? (params.private ? 'true' : 'false') : 'false',
    character_url: params.character_url,
    character_timestamps: params.character_timestamps,
  });
}

/**
 * 查询任务状态
 * 端点：GET /v1/videos/{id}
 * 文档：https://ai604520.apifox.cn/386993920e0
 * 
 * @param videoId - 视频ID（格式：sora-2:task_xxx 或 video_xxx）
 * @returns 任务状态响应
 */
export async function getTaskStatus(videoId: string): Promise<TaskStatusResponse> {
  const baseUrl = sora2Config.baseUrl.replace(/\/$/, '');
  // 端点格式：/v1/videos/{id}
  const url = `${baseUrl}/v1/videos/${encodeURIComponent(videoId)}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...getSora2Headers(),
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(sora2Config.timeout || 60000), // 增加超时时间到60秒
    });

  if (!response.ok) {
    await handleApiError(response, '查询任务状态失败');
  }

    return response.json();
  } catch (error: any) {
    // 处理网络错误、超时等
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('请求超时，请稍后重试');
    }
    if (error.message === 'Failed to fetch') {
      throw new Error('网络请求失败，请检查网络连接');
    }
    // 重新抛出其他错误
    throw error;
  }
}

/**
 * 下载视频
 * 端点：GET /v1/videos/{id}/content
 * 文档：https://ai604520.apifox.cn/386993921e0
 * 
 * @param videoId - 视频ID（格式：video_xxx）
 * @returns 视频 Blob 对象，可用于创建下载链接或显示视频
 */
export async function downloadVideo(videoId: string): Promise<Blob> {
  const baseUrl = sora2Config.baseUrl.replace(/\/$/, '');
  // 端点格式：/v1/videos/{id}/content
  const url = `${baseUrl}/v1/videos/${encodeURIComponent(videoId)}/content`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...getSora2Headers(),
      'Accept': '*/*', // 接受任何类型的响应（可能是视频文件）
    },
    signal: AbortSignal.timeout(sora2Config.timeout || 30000),
  });

  if (!response.ok) {
    await handleApiError(response, '下载视频失败');
  }

  // 返回视频文件的 Blob
  return response.blob();
}

/**
 * 下载视频并创建下载链接（触发浏览器下载）
 * 
 * @param videoId - 视频ID
 * @param filename - 下载的文件名（可选，默认：video_{id}.mp4）
 */
export async function downloadVideoAsFile(
  videoId: string,
  filename?: string
): Promise<void> {
  const blob = await downloadVideo(videoId);
  
  // 创建下载链接
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `video_${videoId}.mp4`;
  document.body.appendChild(link);
  link.click();
  
  // 清理
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 获取视频 URL（用于在页面中显示视频）
 * 
 * @param videoId - 视频ID
 * @returns 视频的 Object URL，可用于 <video> 标签的 src
 */
export async function getVideoUrl(videoId: string): Promise<string> {
  const blob = await downloadVideo(videoId);
  return window.URL.createObjectURL(blob);
}

/**
 * 获取任务列表
 */
export async function getTaskList(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<{
  tasks: TaskStatusResponse[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.status) queryParams.append('status', params.status);

  const url = getSora2ApiUrl(`/videos/tasks?${queryParams.toString()}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getSora2Headers(),
    signal: AbortSignal.timeout(sora2Config.timeout || 30000),
  });

  if (!response.ok) {
    await handleApiError(response, '获取任务列表失败');
  }

  return response.json();
}

/**
 * 角色提取响应接口
 */
export interface ExtractCharacterResponse {
  id: string;
  object: string;
  model: string;
  status: string;
  progress: number;
  created_at: number;
  character_name?: string; // 角色名
  character_avatar?: string; // 角色头像URL
  character_url?: string; // 角色视频URL
  character_timestamps?: string; // 角色时间戳
}

/**
 * 提取角色
 * 端点：POST /v1/videos
 * 传递视频URL，接口自动提取角色
 * 
 * @param videoUrl - 已生成视频的URL
 * @param timestamps - 可选，角色时间戳（格式：'0,1'）
 * @param options - 可选，角色提取选项（角色名、描述词等）
 * @returns 角色提取响应
 */
export async function extractCharacter(
  videoUrl: string,
  timestamps?: string,
  options?: {
    characterName?: string;
    description?: string;
  }
): Promise<ExtractCharacterResponse> {
  const url = getSora2ApiUrl();
  
  // 构建 FormData
  // 注意：提取角色时，主要依赖 character_url（视频URL），不需要 input_reference
  const formData = new FormData();
  formData.append('model', sora2Config.defaultModel || 'sora-2');
  // 使用用户提供的描述词，如果没有则使用占位提示词
  formData.append('prompt', options?.description || 'extract character');
  formData.append('seconds', '10'); // 占位时长
  formData.append('size', '16x9'); // 占位尺寸
  formData.append('watermark', 'false');
  
  // 不发送 input_reference，因为提取角色只需要 character_url
  
  // 传递视频URL用于角色提取（核心参数）
  formData.append('character_url', videoUrl);
  
  if (timestamps) {
    formData.append('character_timestamps', timestamps);
  }
  
  // 如果提供了角色名，添加到请求中
  if (options?.characterName) {
    formData.append('character_name', options.characterName);
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getSora2MultipartHeaders(),
    body: formData,
    signal: AbortSignal.timeout(sora2Config.timeout || 60000), // 超时时间60秒
  });

  if (!response.ok) {
    await handleApiError(response, '提取角色失败');
  }

  return response.json();
}

/**
 * 创建角色（线路2）
 * 端点：POST /sora/v1/characters
 * 格式：application/json
 * 文档：https://ai604520.apifox.cn/386993916e0
 * 
 * @param videoUrl - 视频URL（必需）
 * @param timestamps - 时间戳（必需，格式：'1,2'，范围差值最大3秒最小1秒）
 * @returns 角色创建响应
 */
export interface CreateCharacterResponse {
  id: string; // 角色id
  username: string; // 角色名称，用于放在提示词中 @{username}
  permalink: string; // 角色主页，跳转到 openai 角色主页
  profile_picture_url: string; // 角色头像
}

export async function createCharacter(
  videoUrl: string,
  timestamps: string
): Promise<CreateCharacterResponse> {
  // 使用 Next.js API 路由作为代理，避免 CORS 问题
  const url = '/api/sora/characters';
  
  const body = {
    url: videoUrl,
    timestamps: timestamps,
  };
  
  // 获取 API 密钥并添加到请求头
  const apiKey = getCurrentApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    // 如果 API Key 已经包含 "Bearer " 前缀，直接使用；否则添加前缀
    if (apiKey.startsWith('Bearer ')) {
      headers['Authorization'] = apiKey;
      console.log('🔑 API 密钥已包含 Bearer 前缀');
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
      console.log('🔑 API 密钥已添加 Bearer 前缀');
    }
    // 调试：显示 Authorization 头的前20个字符（隐藏完整密钥）
    console.log('🔐 Authorization 头格式:', headers['Authorization'].substring(0, 20) + '...');
  } else {
    console.warn('⚠️ 未找到 API 密钥');
  }
  
  try {
    // 设置超时为60秒
    const timeout = sora2Config.timeout || 60000;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `创建角色失败 (HTTP ${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    // 处理网络错误、超时等
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('请求超时，请稍后重试');
    }
    if (error.message === 'Failed to fetch') {
      throw new Error('网络请求失败，请检查网络连接');
    }
    // 如果错误已经有消息，直接抛出
    if (error.message) {
      throw error;
    }
    // 否则包装错误
    throw new Error(`创建角色失败: ${error.toString()}`);
  }
}

