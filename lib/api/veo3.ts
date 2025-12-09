/**
 * Veo3 API 服务
 * 用于调用 Veo3 视频生成 API
 * 支持两个接口：
 * 1. POST /v1/video/create (JSON格式)
 * 2. POST /v1/videos (multipart/form-data格式，OpenAI格式)
 */

import { getApiKey, getApiBaseUrl } from '@/lib/storage';

export interface Veo3VideoRequest {
  /** 模型版本（必需） */
  model: string;
  /** 提示词（必需） */
  prompt: string;
  /** 图片数组（可选，用于首尾帧或参考图） */
  images?: string[];
  /** 提示词优化（可选，布尔值） */
  enhance_prompt?: boolean;
  /** 超分辨率（可选，布尔值或字符串） */
  enable_upsample?: boolean | string;
  /** 宽高比（可选，仅veo3支持，"16:9"或"9:16"） */
  aspect_ratio?: string;
}

export interface Veo3VideoOpenAIRequest {
  /** 模型版本（必需，支持 veo_3_1 和 veo_3_1-fast） */
  model: string;
  /** 提示词（必需） */
  prompt: string;
  /** 时长（必需，字符串格式，例如："8"） */
  seconds: string;
  /** 垫图文件（必需，File对象） */
  input_reference: File;
  /** 尺寸（必需，例如："16x9" 或 "9x16"） */
  size: string;
  /** 水印（可选，字符串："true" 或 "false"） */
  watermark?: string;
}

export interface Veo3VideoResponse {
  /** 任务ID */
  id: string;
  /** 状态 */
  status: string;
  /** 状态更新时间戳 */
  status_update_time?: number;
  /** 增强后的提示词（可选） */
  enhanced_prompt?: string;
  /** OpenAI 格式响应（可选） */
  object?: string;
  created?: number;
  choices?: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Veo3VideoOpenAIResponse {
  /** 任务ID */
  id: string;
  /** 对象类型 */
  object: string;
  /** 模型版本 */
  model: string;
  /** 状态 */
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

export interface Veo3TaskStatusResponse {
  /** 任务ID */
  id: string;
  /** 状态 */
  status: 'pending' | 'processing' | 'in_progress' | 'queued' | 'completed' | 'succeeded' | 'failed';
  /** 视频URL（完成时才有） */
  video_url?: string | null;
  /** 状态更新时间戳 */
  status_update_time?: number;
  /** 错误信息（失败时） */
  error?: string;
  /** 进度（0-100，可选） */
  progress?: number;
  /** 增强后的提示词（统一格式接口返回，可选） */
  enhanced_prompt?: string;
  /** OpenAI 格式响应字段（可选） */
  object?: string;
  model?: string;
  created_at?: number;
  seconds?: string;
  size?: string;
}

/**
 * 获取 API 基础地址
 */
function getApiUrl(): string {
  const baseUrl = getApiBaseUrl() || process.env.NEXT_PUBLIC_SORA2_API_URL || 'https://ai.604520.top';
  return baseUrl.replace(/\/$/, '');
}

/**
 * 获取 API Key
 */
function getApiKeyValue(): string {
  const apiKey = getApiKey();
  if (apiKey) {
    // 如果已经包含 "Bearer " 前缀，直接使用；否则添加前缀
    return apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
  }
  return '';
}

/**
 * 处理API错误响应
 */
async function handleApiError(response: Response, defaultMessage: string = '请求失败'): Promise<never> {
  let errorText = '';
  let errorData: any = null;
  
  try {
    // 先读取响应文本
    errorText = await response.text();
    
    // 尝试解析JSON
    if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        // JSON解析失败，使用原始文本
        console.error('JSON解析失败，响应内容:', errorText.substring(0, 500));
      }
    }
  } catch (readError) {
    // 读取响应失败
    console.error('读取响应失败:', readError);
  }
  
  let errorMessage = '';
  
  // 从JSON中提取错误信息
  if (errorData) {
    if (errorData.message) {
      errorMessage = errorData.message;
    } else if (errorData.error) {
      errorMessage = typeof errorData.error === 'string' 
        ? errorData.error 
        : errorData.error.message || JSON.stringify(errorData.error);
    } else if (errorData.msg) {
      errorMessage = errorData.msg;
    } else if (errorData.detail) {
      errorMessage = errorData.detail;
    }
  }
  
  // 如果JSON解析失败，尝试从文本中提取有用信息
  if (!errorMessage && errorText) {
    // 如果是HTML响应，提取<title>或常见错误信息
    if (errorText.includes('<title>')) {
      const titleMatch = errorText.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        errorMessage = titleMatch[1];
      }
    }
    // 如果是简短的文本错误，直接使用
    if (!errorMessage && errorText.length < 500 && !errorText.includes('<html')) {
      errorMessage = errorText.trim();
    }
  }
  
  // 根据状态码提供更具体的错误信息
  if (response.status === 400) {
    throw new Error(errorMessage || '请求参数错误，请检查输入');
  }
  if (response.status === 401) {
    throw new Error(errorMessage || 'API密钥无效，请检查API密钥');
  }
  if (response.status === 403) {
    throw new Error(errorMessage || 'API密钥权限不足');
  }
  if (response.status === 429) {
    throw new Error(errorMessage || '请求频率过高，请稍后重试');
  }
  if (response.status === 500 || response.status === 502 || response.status === 503) {
    throw new Error(errorMessage || `服务器错误 (HTTP ${response.status})，请稍后重试`);
  }
  
  // 其他状态码
  throw new Error(errorMessage || `${defaultMessage} (HTTP ${response.status})`);
}

/**
 * 创建视频
 * 端点：POST /v1/video/create
 */
export async function createVeo3Video(params: Veo3VideoRequest): Promise<Veo3VideoResponse> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/v1/video/create`;
  
  const apiKey = getApiKeyValue();
  if (!apiKey) {
    throw new Error('请先设置API密钥');
  }

  // 构建请求体
  const body: any = {
    model: params.model,
    prompt: params.prompt,
  };

  if (params.images && params.images.length > 0) {
    body.images = params.images;
  }

  // 根据 API 文档，这些字段都是必需的
  body.enhance_prompt = params.enhance_prompt !== undefined ? params.enhance_prompt : false;
  
  // enable_upsample 应该是布尔类型（API 期望 bool，不是 string）
  if (params.enable_upsample !== undefined) {
    if (typeof params.enable_upsample === 'boolean') {
      body.enable_upsample = params.enable_upsample;
    } else if (typeof params.enable_upsample === 'string') {
      // 如果传入的是字符串，转换为布尔值
      body.enable_upsample = params.enable_upsample === 'true' || params.enable_upsample === 'True';
    } else {
      body.enable_upsample = false;
    }
  } else {
    body.enable_upsample = false;
  }

  // aspect_ratio 是必需字段
  body.aspect_ratio = params.aspect_ratio || '16:9';

  // 调试：检查实际发送的数据类型
  console.log('📤 发送的请求体:', JSON.stringify(body, null, 2));
  console.log('🔍 enable_upsample 类型:', typeof body.enable_upsample, '值:', body.enable_upsample);
  console.log('🔍 enhance_prompt 类型:', typeof body.enhance_prompt, '值:', body.enhance_prompt);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000), // 30秒超时
  });

  if (!response.ok) {
    await handleApiError(response, '生成视频失败');
  }

  return response.json();
}

/**
 * 创建视频（OpenAI格式）
 * 端点：POST /v1/videos
 * 格式：multipart/form-data
 * 支持模型：veo_3_1, veo_3_1-fast
 */
export async function createVeo3VideoOpenAI(params: Veo3VideoOpenAIRequest): Promise<Veo3VideoOpenAIResponse> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/v1/videos`;
  
  const apiKey = getApiKeyValue();
  if (!apiKey) {
    throw new Error('请先设置API密钥');
  }

  // 构建 FormData
  const formData = new FormData();
  formData.append('model', params.model);
  formData.append('prompt', params.prompt);
  formData.append('seconds', params.seconds);
  formData.append('input_reference', params.input_reference);
  formData.append('size', params.size);
  
  if (params.watermark !== undefined) {
    formData.append('watermark', params.watermark);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      // 不设置 Content-Type，让浏览器自动设置 boundary
    },
    body: formData,
    signal: AbortSignal.timeout(30000), // 30秒超时
  });

  if (!response.ok) {
    await handleApiError(response, '生成视频失败');
  }

  return response.json();
}

/**
 * 查询任务状态
 * 根据任务ID格式自动判断使用哪个查询端点：
 * - 统一格式接口（任务ID包含冒号，如 veo3-fast-frames:1757555257-PORrVn9sa9）：使用 /v1/video/query?id=xxx
 * - OpenAI格式接口（任务ID格式如 video_xxx）：使用 /v1/videos/{id}
 */
export async function getVeo3TaskStatus(taskId: string): Promise<Veo3TaskStatusResponse> {
  const baseUrl = getApiUrl();
  const apiKey = getApiKeyValue();
  
  if (!apiKey) {
    throw new Error('请先设置API密钥');
  }

  // 判断使用哪个查询端点
  let url = '';
  let isUnifiedFormat = false;
  
  if (taskId.includes(':') || taskId.startsWith('veo')) {
    // 统一格式接口：任务ID包含冒号或以 veo 开头
    // 使用 GET /v1/video/query?id=xxx
    isUnifiedFormat = true;
    url = `${baseUrl}/v1/video/query?id=${encodeURIComponent(taskId)}`;
  } else if (taskId.startsWith('video_')) {
    // OpenAI格式接口：任务ID以 video_ 开头
    // 使用 GET /v1/videos/{id}
    url = `${baseUrl}/v1/videos/${encodeURIComponent(taskId)}`;
  } else {
    // 默认尝试统一格式接口
    isUnifiedFormat = true;
    url = `${baseUrl}/v1/video/query?id=${encodeURIComponent(taskId)}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey,
      },
      signal: AbortSignal.timeout(60000), // 60秒超时
    });

    if (!response.ok) {
      await handleApiError(response, '查询任务状态失败');
    }

    const data = await response.json();
    
    // 统一格式接口响应：{ id, status, video_url, enhanced_prompt, status_update_time, progress? }
    // OpenAI格式接口响应：{ id, object, model, status, progress, created_at, seconds, size }
    
    if (isUnifiedFormat) {
      // 统一格式接口响应处理
      // 检查是否有 progress 字段，如果有则使用，否则根据状态估算
      let progress: number | undefined = undefined;
      
      if (data.progress !== undefined && data.progress !== null) {
        // API 直接返回了进度
        progress = typeof data.progress === 'number' ? data.progress : parseInt(data.progress) || 0;
      } else {
        // 根据状态估算进度（如果没有返回具体进度）
        const statusProgressMap: Record<string, number> = {
          'pending': 0,
          'queued': 5,
          'image_downloading': 10, // 图片下载中
          'processing': 30,
          'in_progress': 50,
          'video_generating': 60,
          'video_upsampling': 80,
          'completed': 100,
          'succeeded': 100,
          'failed': 0,
        };
        // 如果状态包含某些关键词，也映射到对应的进度
        if (data.status && typeof data.status === 'string') {
          if (data.status.includes('image') || data.status.includes('download')) {
            progress = 10;
          } else if (data.status.includes('generating')) {
            progress = 60;
          } else if (data.status.includes('upsampling') || data.status.includes('upsample')) {
            progress = 80;
          } else {
            progress = statusProgressMap[data.status] !== undefined ? statusProgressMap[data.status] : undefined;
          }
        } else {
          progress = statusProgressMap[data.status] !== undefined ? statusProgressMap[data.status] : undefined;
        }
      }
      
      return {
        id: data.id,
        status: data.status,
        video_url: data.video_url || null,
        status_update_time: data.status_update_time,
        progress: progress,
        error: data.error,
        enhanced_prompt: data.enhanced_prompt, // 保留增强后的提示词
      };
    } else {
      // OpenAI格式接口响应处理
      return {
        id: data.id,
        status: data.status,
        video_url: data.video_url || null,
        status_update_time: data.created_at,
        progress: data.progress,
        error: data.error,
        // OpenAI格式特有字段
        object: data.object,
        model: data.model,
        created_at: data.created_at,
        seconds: data.seconds,
        size: data.size,
      };
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('请求超时，请稍后重试');
    }
    if (error.message === 'Failed to fetch') {
      throw new Error('网络请求失败，请检查网络连接');
    }
    throw error;
  }
}

/**
 * 下载视频
 * 端点：GET /v1/videos/{id}/content
 * 
 * @param videoId - 视频ID
 * @returns 视频 Blob 对象，可用于创建下载链接或显示视频
 */
export async function downloadVeo3Video(videoId: string): Promise<Blob> {
  const baseUrl = getApiUrl();
  
  // 处理任务ID格式（如果包含冒号，可能需要提取实际ID）
  let cleanId = videoId;
  if (videoId.includes(':')) {
    // 对于格式如 "video_xxx" 或 "veo3-fast-frames:1757555257-PORrVn9sa9"
    // OpenAI 格式的 ID 通常是 "video_xxx"，可以直接使用
    // JSON 格式的 ID 可能包含冒号，需要提取实际ID部分
    if (videoId.startsWith('video_')) {
      cleanId = videoId;
    } else {
      cleanId = videoId.split(':')[1] || videoId;
    }
  }
  
  // 端点格式：/v1/videos/{id}/content
  const url = `${baseUrl}/v1/videos/${encodeURIComponent(cleanId)}/content`;
  
  const apiKey = getApiKeyValue();
  if (!apiKey) {
    throw new Error('请先设置API密钥');
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': apiKey,
      'Accept': '*/*', // 接受任何类型的响应（可能是视频文件）
    },
    signal: AbortSignal.timeout(60000), // 60秒超时
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
export async function downloadVeo3VideoAsFile(
  videoId: string,
  filename?: string
): Promise<void> {
  const blob = await downloadVeo3Video(videoId);
  
  // 创建下载链接
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // 清理文件名中的特殊字符
  const safeId = videoId.replace(/[^a-zA-Z0-9-_]/g, '_');
  link.download = filename || `video_${safeId}.mp4`;
  
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
export async function getVeo3VideoUrl(videoId: string): Promise<string> {
  const blob = await downloadVeo3Video(videoId);
  return window.URL.createObjectURL(blob);
}

/**
 * 判断模型是否使用 OpenAI 格式接口
 */
export function shouldUseOpenAIFormat(model: string): boolean {
  return model === 'veo_3_1' || model === 'veo_3_1-fast';
}

