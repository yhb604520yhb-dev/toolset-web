import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  // 重定向到 public 目录中的 favicon.ico
  return NextResponse.redirect('/favicon.ico', 301);
}

