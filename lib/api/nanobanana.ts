import { getCurrentApiKey, getSora2Headers } from "@/config/sora2";

const API_BASE_URL = process.env.NEXT_PUBLIC_SORA2_API_URL || 'https://ai.604520.top';

/**
 * nano-banana/edit 图片编辑 API 响应类型
 */
export interface NanoBananaEditResponse {
  status: string;
  request_id: string;
  response_url: string;
  status_url: string;
  cancel_url: string;
  logs: null | any;
  metrics: Record<string, any>;
  queue_position: number;
}

/**
 * nano-banana/edit 任务状态响应
 */
export interface NanoBananaStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  request_id: string;
  response?: {
    images?: Array<{
      url: string;
      content_type: string;
      width: number;
      height: number;
    }>;
  };
  error?: string;
}

/**
 * 调用 nano-banana/edit 图片编辑 API
 */
export async function editImageWithNanoBanana(params: {
  prompt: string;
  image_urls: string[];
  num_images?: number;
}): Promise<NanoBananaEditResponse> {
  const url = `${API_BASE_URL}/fal-ai/nano-banana/edit`;
  
  // 使用统一的请求头函数，自动处理 Bearer 前缀
  const headers = getSora2Headers();

  const body = {
    prompt: params.prompt,
    image_urls: params.image_urls,
    num_images: params.num_images || 1,
  };

  console.log('📤 发送 API 请求:', {
    url,
    method: 'POST',
    prompt: params.prompt.substring(0, 50) + '...',
    imageUrlsCount: params.image_urls.length,
    numImages: params.num_images || 1,
    firstImageUrlPreview: params.image_urls[0]?.substring(0, 100) + '...',
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000), // 60秒超时
    });

    console.log('📥 API 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      // 尝试解析错误响应
      let errorMessage = `HTTP ${response.status}`;
      let errorDetails: any = null;

      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorDetails = await response.json();
          // 尝试从不同的可能字段中提取错误信息
          const extractedError = errorDetails.error || 
                                 errorDetails.message || 
                                 errorDetails.detail || 
                                 errorDetails.msg ||
                                 errorDetails.reason ||
                                 null;
          
          // 确保 errorMessage 始终是字符串
          if (extractedError) {
            if (typeof extractedError === 'string') {
              errorMessage = extractedError;
            } else if (typeof extractedError === 'object') {
              errorMessage = JSON.stringify(extractedError);
            } else {
              errorMessage = String(extractedError);
            }
          } else {
            // 如果没有找到错误字段，序列化整个对象
            errorMessage = JSON.stringify(errorDetails);
          }
        } else {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
      } catch (parseError) {
        // 如果解析失败，使用状态码
        errorMessage = `HTTP ${response.status}`;
      }

      // 针对特定状态码提供友好提示
      if (response.status === 503) {
        // 检查是否是图片 URL 格式问题
        const isBase64 = params.image_urls.some(url => url.startsWith('data:'));
        
        // 确保 errorMessage 是字符串
        const errorDetailStr = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
        
        console.error('❌ 503 错误详情:', {
          errorMessage: errorDetailStr,
          errorDetails: errorDetails ? JSON.stringify(errorDetails).substring(0, 500) : null,
          isBase64,
          imageUrlsCount: params.image_urls.length,
          imageUrls: params.image_urls.map(url => url.substring(0, 100) + '...'),
        });
        
        if (isBase64) {
          // 提供详细的错误信息，说明可能是图片格式问题
          const errorMsg = '❌ 503 错误：服务暂时不可用\n\n可能原因：\n1. API 不支持 base64 data URL，需要真实的 HTTP URL\n2. 服务器暂时过载或维护中\n\n解决方案：\n- 请使用真实的图片 HTTP URL\n- 或配置图床服务将图片上传后获取 URL\n\n提示：当前使用的是 base64 格式，API 可能要求 HTTP URL';
          const error = new Error(errorMsg);
          console.error('❌ 抛出错误（base64格式问题）:', error.message);
          throw error;
        }
        
        // 构建友好的错误消息
        let finalErrorMessage = '服务暂时不可用，请稍后重试（503 Service Unavailable）';
        if (errorDetailStr && errorDetailStr !== `HTTP ${response.status}`) {
          finalErrorMessage += `。${errorDetailStr.substring(0, 200)}`;
        }
        
        const error = new Error(finalErrorMessage);
        console.error('❌ 抛出错误:', error.message);
        throw error;
      } else if (response.status === 401) {
        throw new Error('API 密钥无效或已过期，请检查密钥设置');
      } else if (response.status === 403) {
        throw new Error('没有权限访问此 API，请检查 API 密钥权限');
      } else if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后再试');
      } else {
        throw new Error(`图片编辑请求失败: ${errorMessage}`);
      }
    }

    return await response.json();
  } catch (error: any) {
    console.error('❌ API 调用异常:', {
      error,
      errorType: typeof error,
      errorMessage: error?.message,
      errorName: error?.name,
    });

    // 如果已经是我们抛出的错误，直接重新抛出
    if (error instanceof Error && error.message && !error.message.includes('[object Object]')) {
      console.error('❌ 重新抛出已知错误:', error.message);
      throw error;
    }

    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('请求超时，请稍后重试');
    }
    if (error.message === 'Failed to fetch') {
      throw new Error('网络请求失败，请检查网络连接');
    }
    
    // 尝试提取错误信息
    let errorMessage = '图片编辑失败';
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = String(error);
      }
    }

    throw new Error(errorMessage);
  }
}

/**
 * 查询 nano-banana/edit 任务状态
 */
export async function getNanoBananaTaskStatus(statusUrl: string): Promise<NanoBananaStatusResponse> {
  // 使用统一的请求头函数，自动处理 Bearer 前缀
  // 注意：这里不需要 Content-Type，所以只提取 Authorization
  const fullHeaders = getSora2Headers();
  const headers: Record<string, string> = {};
  
  if (fullHeaders['Authorization']) {
    headers['Authorization'] = fullHeaders['Authorization'];
  }

  try {
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000), // 30秒超时
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `查询任务状态失败 (HTTP ${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('请求超时，请稍后重试');
    }
    if (error.message === 'Failed to fetch') {
      throw new Error('网络请求失败，请检查网络连接');
    }
    if (error.message) {
      throw error;
    }
    throw new Error(`查询任务状态失败: ${error.toString()}`);
  }
}

