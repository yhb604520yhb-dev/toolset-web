# 项目连接检测和自动修复脚本
# 用途：检测项目是否正常，连接失败时自动修复

param(
    [string]$Url = "http://localhost:3000",
    [int]$Timeout = 5
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  项目连接检测和自动修复工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检测函数
function Test-ServerConnection {
    param([string]$TestUrl, [int]$TimeOut)
    
    try {
        $response = Invoke-WebRequest -Uri $TestUrl -TimeoutSec $TimeOut -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# 检测服务器是否正常运行
Write-Host "[检测] 正在检测服务器连接..." -ForegroundColor Yellow
$isRunning = Test-ServerConnection -TestUrl $Url -TimeOut $Timeout

if ($isRunning) {
    Write-Host "  ✓ 服务器运行正常！" -ForegroundColor Green
    Write-Host "  地址: $Url" -ForegroundColor Green
    exit 0
} else {
    Write-Host "  ✗ 服务器连接失败，开始自动修复..." -ForegroundColor Red
    Write-Host ""
    
    # 执行修复和启动
    $scriptPath = Join-Path $PSScriptRoot "fix-and-start.ps1"
    if (Test-Path $scriptPath) {
        & $scriptPath
    } else {
        Write-Host "  错误: 找不到修复脚本 fix-and-start.ps1" -ForegroundColor Red
        exit 1
    }
}

