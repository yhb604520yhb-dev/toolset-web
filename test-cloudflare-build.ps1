# Cloudflare Pages 构建测试脚本 (PowerShell)

Write-Host "🚀 开始测试 Cloudflare Pages 构建..." -ForegroundColor Cyan

# 检查是否安装了依赖
if (-not (Test-Path "node_modules/@cloudflare/next-on-pages")) {
    Write-Host "⚠️  未找到 @cloudflare/next-on-pages，正在安装..." -ForegroundColor Yellow
    npm install --save-dev @cloudflare/next-on-pages
}

# 清理之前的构建
Write-Host "🧹 清理之前的构建..." -ForegroundColor Cyan
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path ".vercel") { Remove-Item -Recurse -Force ".vercel" }

# 标准 Next.js 构建
Write-Host "📦 执行 Next.js 标准构建..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Next.js 构建失败！" -ForegroundColor Red
    exit 1
}

# Cloudflare Pages 构建
Write-Host "☁️  执行 Cloudflare Pages 构建..." -ForegroundColor Cyan
npm run pages:build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cloudflare Pages 构建失败！" -ForegroundColor Red
    exit 1
}

# 检查输出目录
if (Test-Path ".vercel/output/static") {
    Write-Host "✅ Cloudflare Pages 构建成功！" -ForegroundColor Green
    Write-Host "📁 输出目录: .vercel/output/static" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 本地预览命令: npm run preview:cloudflare" -ForegroundColor Yellow
} else {
    Write-Host "❌ 未找到构建输出目录！" -ForegroundColor Red
    exit 1
}

