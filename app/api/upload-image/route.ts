import { NextRequest, NextResponse } from 'next/server';

// 兼容 Edge Runtime 和 Node.js Runtime
export const runtime = 'edge';

/**
 * 上传图片到图床（将base64转换为URL）
 * 使用 Cloudflare Pages 图床服务 (telegraph-image-clr.pages.dev)
 */
export async function POST(request: NextRequest) {
  let imageBase64: string = '';
  try {
    const body = await request.json();
    imageBase64 = body.imageBase64 || '';

    if (!imageBase64) {
      return NextResponse.json(
        { error: '图片数据不能为空' },
        { status: 400 }
      );
    }

    // 提取base64数据（移除data:image/...;base64,前缀）
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    // 获取图片格式
    let imageType = 'image/png';
    if (imageBase64.startsWith('data:image/')) {
      const match = imageBase64.match(/data:image\/([^;]+)/);
      if (match) {
        imageType = `image/${match[1]}`;
      }
    }

    // 将 base64 转换为 Uint8Array（兼容 Edge Runtime 和 Node.js）
    // Edge Runtime 不支持 Buffer，使用 atob + Uint8Array
    const binaryString = atob(base64Data);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    
    // 获取文件扩展名
    const ext = imageType.split('/')[1] || 'png';
    const fileName = `image.${ext}`;

    // 创建 Blob
    const blob = new Blob([uint8Array], { type: imageType });

    console.log('📋 准备上传:', {
      fileName,
      blobSize: blob.size,
      imageType,
      bufferSize: uint8Array.length,
    });

    // 上传到 Cloudflare Pages 图床服务
    console.log('📤 开始上传到 Cloudflare Pages 图床 (telegraph-image-clr.pages.dev)...');
    
    const formData = new FormData();
    formData.append('file', blob, fileName);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    try {
        const response = await fetch('https://telegraph-image-clr.pages.dev/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // 先读取响应文本（因为响应体只能读取一次）
        const responseText = await response.text();
        
        console.log('📥 图床服务响应状态:', response.status, response.statusText);
        console.log('📥 图床服务响应内容:', responseText.substring(0, 500));
        
        if (!response.ok) {
          const errorMsg = `HTTP ${response.status}: ${responseText.substring(0, 200)}`;
          console.error('❌ 图床服务返回错误:', errorMsg);
          throw new Error(errorMsg);
        }
        
        // 尝试解析 JSON 响应
        let data: any;
        try {
          data = JSON.parse(responseText);
          console.log('📋 解析后的响应数据:', JSON.stringify(data).substring(0, 500));
        } catch (jsonError) {
          // 如果不是 JSON，尝试从文本中提取 URL
          console.log('⚠️ 响应不是 JSON 格式，尝试从文本中提取 URL...');
          const urlMatch = responseText.match(/https?:\/\/[^\s"<>'"]+/);
          if (urlMatch) {
            console.log('✅ 从文本中提取到 URL:', urlMatch[0]);
            return NextResponse.json({ 
              url: urlMatch[0],
              success: true,
              host: 'Cloudflare Pages 图床'
            });
          }
          throw new Error(`响应不是有效的 JSON 格式: ${responseText.substring(0, 100)}`);
        }
        
        // 处理不同的响应格式
        // 常见格式：
        // 1. { url: "https://..." } 或 { src: "https://..." }
        // 2. [{ src: "/file/..." }] - Cloudflare Pages 图床可能返回数组格式，src 为相对路径
        // 3. { code: 200, data: { url: "https://..." } }
        // 4. { success: true, url: "https://..." }
        // 5. 直接返回 URL 字符串
        let imageUrl: string | null = null;
        
        // 如果是数组格式（Cloudflare Pages 图床）
        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0];
          if (firstItem && typeof firstItem === 'object') {
            if (firstItem.src) {
              // src 可能是相对路径或完整 URL
              if (firstItem.src.startsWith('http')) {
                imageUrl = firstItem.src;
              } else if (firstItem.src.startsWith('/')) {
                // 相对路径，拼接域名
                imageUrl = `https://telegraph-image-clr.pages.dev${firstItem.src}`;
              }
            } else if (firstItem.url && typeof firstItem.url === 'string') {
              imageUrl = firstItem.url.startsWith('http') ? firstItem.url : `https://telegraph-image-clr.pages.dev${firstItem.url}`;
            }
          }
        }
        
        // 如果不是数组，处理对象格式
        if (!imageUrl) {
          if (data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
            imageUrl = data.url;
          } else if (data.src && typeof data.src === 'string') {
            // src 可能是相对路径
            if (data.src.startsWith('http')) {
              imageUrl = data.src;
            } else if (data.src.startsWith('/')) {
              imageUrl = `https://telegraph-image-clr.pages.dev${data.src}`;
            }
          } else if (data.code === 200 && data.data?.url) {
            imageUrl = data.data.url;
          } else if (data.success && data.url) {
            imageUrl = data.url;
          } else if (typeof data === 'string' && data.startsWith('http')) {
            imageUrl = data;
          } else if (data.result && data.result.url) {
            imageUrl = data.result.url;
          } else if (data.image && data.image.url) {
            imageUrl = data.image.url;
          }
        }
        
        // 如果都不匹配，尝试从响应对象中递归查找 URL 或相对路径
        if (!imageUrl) {
          const findUrlInObject = (obj: any): string | null => {
            if (typeof obj === 'string') {
              if (obj.startsWith('http')) {
                return obj;
              } else if (obj.startsWith('/')) {
                // 找到相对路径，拼接域名
                return `https://telegraph-image-clr.pages.dev${obj}`;
              }
            }
            if (typeof obj === 'object' && obj !== null) {
              for (const key in obj) {
                const value = obj[key];
                if (typeof value === 'string') {
                  if (value.startsWith('http')) {
                    return value;
                  } else if (value.startsWith('/') && (key === 'src' || key === 'url' || key === 'path')) {
                    return `https://telegraph-image-clr.pages.dev${value}`;
                  }
                }
                if (typeof value === 'object') {
                  const found = findUrlInObject(value);
                  if (found) return found;
                }
              }
            }
            return null;
          };
          
          imageUrl = findUrlInObject(data);
        }
        
        if (imageUrl) {
          console.log('✅ Cloudflare Pages 图床上传成功，URL:', imageUrl);
          return NextResponse.json({ 
            url: imageUrl,
            success: true,
            host: 'Cloudflare Pages 图床 (telegraph-image-clr.pages.dev)'
          });
        }
        
        throw new Error(`无法解析图片 URL。响应格式: ${JSON.stringify(data).substring(0, 300)}`);
        
      } catch (uploadError: any) {
        clearTimeout(timeoutId);
        
        // 详细记录错误信息
        const errorName = uploadError?.name || 'UnknownError';
        const errorMessage = uploadError?.message || String(uploadError) || '上传失败';
        const errorCode = uploadError?.code;
        const errorCause = uploadError?.cause;
        
        console.error('❌ Cloudflare Pages 图床上传失败');
        console.error('❌ 错误名称:', errorName);
        console.error('❌ 错误消息:', errorMessage);
        console.error('❌ 错误代码:', errorCode);
        console.error('❌ 错误原因:', errorCause);
        console.error('❌ 错误堆栈:', uploadError?.stack);
        
        // 特殊处理网络错误
        if (errorName === 'AbortError') {
          throw new Error('图床上传超时（30秒），请检查网络连接或稍后重试');
        } else if (errorName === 'TypeError' && errorMessage.includes('fetch')) {
          throw new Error(`网络请求失败: ${errorMessage}。可能原因：1) 图床服务不可用；2) 网络连接问题；3) CORS 策略限制。请检查服务器端控制台日志。`);
        }
        
      throw new Error(`图床上传失败: ${errorMessage}`);
    }

  } catch (error: any) {
    const errorMessage = error?.message || String(error) || '上传图片失败';
    console.error('❌ 上传图片失败:', errorMessage);
    console.error('❌ 错误堆栈:', error.stack);
    console.error('❌ 错误详情:', {
      message: errorMessage,
      name: error.name,
      code: error.code,
    });
    
    // 如果图床上传失败，返回 fallback 的 base64 URL
    // 让客户端知道上传失败，但可以使用 base64 作为备用
    return NextResponse.json({ 
      url: imageBase64,
      success: false,
      error: errorMessage,
      fallback: true,
      details: {
        name: error?.name,
        code: error?.code,
      }
    });
  }
}

