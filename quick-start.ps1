# 快速启动脚本（包含修复功能）
# 用途：一键修复并启动项目

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  快速启动工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取脚本所在目录
$scriptRoot = $PSScriptRoot
Set-Location $scriptRoot

# 快速检查和修复
Write-Host "[1/3] 停止旧进程..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "[2/3] 清理缓存..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "[3/3] 清理空目录..." -ForegroundColor Yellow
$soraDir = "app\sora"
$veoDir = "app\veo"

if (Test-Path $soraDir) {
    $soraFiles = Get-ChildItem $soraDir -Recurse -Force -ErrorAction SilentlyContinue
    if (-not $soraFiles -or $soraFiles.Count -eq 0) {
        Remove-Item $soraDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if (Test-Path $veoDir) {
    $veoFiles = Get-ChildItem $veoDir -Recurse -Force -ErrorAction SilentlyContinue
    if (-not $veoFiles -or $veoFiles.Count -eq 0) {
        Remove-Item $veoDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "✓ 修复完成，正在启动服务器..." -ForegroundColor Green
Write-Host "  访问地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

# 启动服务器
npm run dev

