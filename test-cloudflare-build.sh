#!/bin/bash
# Cloudflare Pages 构建测试脚本

echo "🚀 开始测试 Cloudflare Pages 构建..."

# 检查是否安装了依赖
if [ ! -d "node_modules/@cloudflare/next-on-pages" ]; then
    echo "⚠️  未找到 @cloudflare/next-on-pages，正在安装..."
    npm install --save-dev @cloudflare/next-on-pages
fi

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf .next .vercel

# 标准 Next.js 构建
echo "📦 执行 Next.js 标准构建..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Next.js 构建失败！"
    exit 1
fi

# Cloudflare Pages 构建
echo "☁️  执行 Cloudflare Pages 构建..."
npm run pages:build

if [ $? -ne 0 ]; then
    echo "❌ Cloudflare Pages 构建失败！"
    exit 1
fi

# 检查输出目录
if [ -d ".vercel/output/static" ]; then
    echo "✅ Cloudflare Pages 构建成功！"
    echo "📁 输出目录: .vercel/output/static"
    echo ""
    echo "💡 本地预览命令: npm run preview:cloudflare"
else
    echo "❌ 未找到构建输出目录！"
    exit 1
fi

