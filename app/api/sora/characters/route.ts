/**
 * Sora 角色创建 API 代理路由
 * 用于解决 CORS 问题
 * 端点：POST /api/sora/characters
 */

import { NextRequest, NextResponse } from 'next/server';
import { sora2Config, getSora2Headers } from '@/config/sora2';

// 使用 Node.js Runtime（OpenNext 会在 Cloudflare 中处理）
// export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, timestamps } = body;

    if (!url || !timestamps) {
      return NextResponse.json(
        { error: '缺少必需参数: url 和 timestamps' },
        { status: 400 }
      );
    }

    // 从请求头中获取 Authorization，如果客户端传递了 API 密钥，优先使用
    const clientAuth = request.headers.get('Authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 优先使用客户端传递的 API 密钥
    if (clientAuth) {
      headers['Authorization'] = clientAuth;
      // 调试：检查 Authorization 头格式
      if (clientAuth.startsWith('Bearer ')) {
        console.log('✅ 服务器端：客户端传递的 Authorization 头格式正确（包含 Bearer 前缀）');
      } else {
        console.warn('⚠️ 服务器端：客户端传递的 Authorization 头缺少 Bearer 前缀');
      }
      console.log('🔐 服务器端 Authorization 头格式:', clientAuth.substring(0, 20) + '...');
    } else {
      // 如果没有客户端传递的密钥，使用服务器端配置（环境变量）
      const serverHeaders = getSora2Headers();
      if (serverHeaders['Authorization']) {
        headers['Authorization'] = serverHeaders['Authorization'];
        console.log('✅ 服务器端：使用环境变量中的 API 密钥');
      } else {
        console.warn('⚠️ 服务器端：未找到 API 密钥（客户端和服务器端都未提供）');
      }
    }

    // 如果配置中有 API Secret，也添加
    if (sora2Config.apiSecret) {
      headers['X-API-Secret'] = sora2Config.apiSecret;
    }

    const baseUrl = sora2Config.baseUrl.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/sora/v1/characters`;

    // 设置超时时间为60秒
    const timeout = sora2Config.timeout || 60000;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url,
          timestamps,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP ${response.status}` };
        }

        return NextResponse.json(
          { error: errorData.message || `请求失败 (HTTP ${response.status})` },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // 处理超时错误
      if (fetchError.name === 'AbortError' || controller.signal.aborted) {
        return NextResponse.json(
          { error: '请求超时，请稍后重试' },
          { status: 504 }
        );
      }
      
      // 重新抛出其他错误，由外层 catch 处理
      throw fetchError;
    }
  } catch (error: any) {
    console.error('❌ API 代理错误:', error);
    return NextResponse.json(
      { error: error.message || '服务器内部错误' },
      { status: 500 }
    );
  }
}

