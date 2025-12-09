/**
 * Sora2 视频生成 API 配置
 */

/**
 * API 端点类型
 */
export type ApiEndpointType = 
  | 'openai-official'  // OpenAI官方视频格式: /v1/videos
  | 'unified-format'   // 视频统一格式: /v1/video/create
  | 'custom';          // 自定义端点

export interface Sora2ApiConfig {
  /** API 基础地址 */
  baseUrl: string;
  /** API Key */
  apiKey?: string;
  /** API Secret */
  apiSecret?: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 默认模型版本 */
  defaultModel?: string;
  /** API 端点类型 */
  endpointType?: ApiEndpointType;
  /** 自定义视频生成端点路径（当 endpointType 为 'custom' 时使用） */
  customVideoEndpoint?: string;
  /** 其他自定义配置 */
  [key: string]: any;
}

/**
 * API 端点路径映射
 */
const ENDPOINT_PATHS: Record<ApiEndpointType, string> = {
  'openai-official': '/v1/videos',           // OpenAI官方视频格式（推荐）
  'unified-format': '/v1/video/create',      // 视频统一格式
  'custom': '',                              // 自定义（需要设置 customVideoEndpoint）
};

/**
 * 获取 API Key（优先从本地存储读取，否则使用环境变量）
 * 注意：此函数在客户端和服务端都能工作
 */
function getApiKeyValue(): string {
  // 服务端渲染时，只使用环境变量
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SORA2_API_KEY || '';
  }
  
  // 客户端：优先从本地存储读取
  try {
    const storedKey = localStorage.getItem('sora2_api_key');
    if (storedKey) {
      return storedKey;
    }
  } catch (e) {
    // localStorage 不可用时，使用环境变量
  }
  
  return process.env.NEXT_PUBLIC_SORA2_API_KEY || '';
}

/**
 * Sora2 API 配置
 * 可以通过环境变量覆盖默认配置
 * API Key 优先从本地存储读取
 */
export const sora2Config: Sora2ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_SORA2_API_URL || 'https://ai.604520.top',
  apiKey: getApiKeyValue(),
  apiSecret: process.env.NEXT_PUBLIC_SORA2_API_SECRET || '',
  timeout: parseInt(process.env.NEXT_PUBLIC_SORA2_TIMEOUT || '30000', 10),
  defaultModel: process.env.NEXT_PUBLIC_SORA2_DEFAULT_MODEL || 'sora-2',
  endpointType: (process.env.NEXT_PUBLIC_SORA2_ENDPOINT_TYPE as ApiEndpointType) || 'openai-official',
  customVideoEndpoint: process.env.NEXT_PUBLIC_SORA2_CUSTOM_ENDPOINT || '',
};

/**
 * 获取当前 API Key（动态读取，优先本地存储）
 * 在客户端组件中使用此函数获取最新的 API Key
 */
export function getCurrentApiKey(): string {
  return getApiKeyValue();
}

/**
 * 获取完整的 API 请求头（用于 JSON 请求）
 */
export function getSora2Headers(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const apiKey = getCurrentApiKey();
  if (apiKey) {
    // 如果 API Key 已经包含 "Bearer " 前缀，直接使用；否则添加前缀
    if (apiKey.startsWith('Bearer ')) {
      headers['Authorization'] = apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  if (sora2Config.apiSecret) {
    headers['X-API-Secret'] = sora2Config.apiSecret;
  }

  return headers;
}

/**
 * 获取 multipart/form-data 请求头（用于文件上传）
 * 注意：不设置 Content-Type，让浏览器自动设置 boundary
 */
export function getSora2MultipartHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  const apiKey = getCurrentApiKey();
  if (apiKey) {
    // 如果 API Key 已经包含 "Bearer " 前缀，直接使用；否则添加前缀
    if (apiKey.startsWith('Bearer ')) {
      headers['Authorization'] = apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  if (sora2Config.apiSecret) {
    headers['X-API-Secret'] = sora2Config.apiSecret;
  }

  return headers;
}

/**
 * 获取视频生成端点路径
 */
export function getVideoEndpoint(): string {
  const endpointType = sora2Config.endpointType || 'openai-official';
  
  if (endpointType === 'custom' && sora2Config.customVideoEndpoint) {
    return sora2Config.customVideoEndpoint;
  }
  
  return ENDPOINT_PATHS[endpointType] || ENDPOINT_PATHS['openai-official'];
}

/**
 * 构建完整的 API 端点 URL
 */
export function getSora2ApiUrl(endpoint?: string): string {
  const baseUrl = sora2Config.baseUrl.replace(/\/$/, '');
  
  // 如果没有指定端点，使用视频生成端点
  if (!endpoint) {
    const videoEndpoint = getVideoEndpoint();
    return `${baseUrl}${videoEndpoint}`;
  }
  
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
}

