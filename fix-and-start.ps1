# 项目自动修复和启动脚本
# 用途：一键修复端口占用、清理缓存、启动服务器

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  项目自动修复和启动工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 停止所有 Node 进程
Write-Host "[1/4] 正在停止所有 Node 进程..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ 已停止 $($nodeProcesses.Count) 个 Node 进程" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "  ✓ 没有运行中的 Node 进程" -ForegroundColor Green
}

# 2. 清理 .next 缓存
Write-Host "[2/4] 正在清理 .next 缓存..." -ForegroundColor Yellow
$nextDir = Join-Path $PSScriptRoot ".next"
if (Test-Path $nextDir) {
    Remove-Item $nextDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ 已清理 .next 缓存目录" -ForegroundColor Green
} else {
    Write-Host "  ✓ .next 目录不存在，无需清理" -ForegroundColor Green
}

# 3. 删除空的 app/sora 和 app/veo 目录
Write-Host "[3/4] 正在检查并清理空目录..." -ForegroundColor Yellow
$soraDir = Join-Path $PSScriptRoot "app\sora"
$veoDir = Join-Path $PSScriptRoot "app\veo"

if (Test-Path $soraDir) {
    $soraFiles = Get-ChildItem $soraDir -Recurse -Force -ErrorAction SilentlyContinue
    if (-not $soraFiles -or $soraFiles.Count -eq 0) {
        Remove-Item $soraDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ 已删除空的 app/sora 目录" -ForegroundColor Green
    } else {
        Write-Host "  ✓ app/sora 目录不为空，保留" -ForegroundColor Green
    }
}

if (Test-Path $veoDir) {
    $veoFiles = Get-ChildItem $veoDir -Recurse -Force -ErrorAction SilentlyContinue
    if (-not $veoFiles -or $veoFiles.Count -eq 0) {
        Remove-Item $veoDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ 已删除空的 app/veo 目录" -ForegroundColor Green
    } else {
        Write-Host "  ✓ app/veo 目录不为空，保留" -ForegroundColor Green
    }
}

# 4. 检查端口占用
Write-Host "[4/4] 正在检查端口占用..." -ForegroundColor Yellow
$port = 3000
$portInUse = netstat -ano | findstr ":$port.*LISTENING"
if ($portInUse) {
    Write-Host "  ⚠ 端口 $port 仍被占用，将在启动时自动使用其他端口" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ 端口 $port 可用" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  正在启动开发服务器..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  访问地址: http://localhost:3000" -ForegroundColor Green
Write-Host "  按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

# 启动服务器
Set-Location $PSScriptRoot
npm run dev

