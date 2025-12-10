import { NextResponse } from 'next/server';

// 使用 Node.js Runtime（OpenNext 会在 Cloudflare 中处理）
// export const runtime = 'edge';

export async function GET(request: Request) {
  // 从 public 目录获取 favicon.ico
  // 在 Edge Runtime 中，我们使用 fetch 从静态文件服务器获取
  const url = new URL(request.url);
  const origin = url.origin;
  
  try {
    const response = await fetch(`${origin}/favicon.ico`, {
      headers: {
        'Accept': 'image/x-icon',
      },
    });
    
    if (response.ok) {
      const blob = await response.blob();
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'image/x-icon',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch (error) {
    // 如果获取失败，返回 404
  }
  
  return new NextResponse(null, { status: 404 });
}

