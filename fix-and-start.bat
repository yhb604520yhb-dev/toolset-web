@echo off
chcp 65001 >nul
echo ========================================
echo   项目自动修复和启动工具
echo ========================================
echo.

REM 1. 停止所有 Node 进程
echo [1/4] 正在停止所有 Node 进程...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ 已停止 Node 进程
    timeout /t 2 /nobreak >nul
) else (
    echo   ✓ 没有运行中的 Node 进程
)

REM 2. 清理 .next 缓存
echo [2/4] 正在清理 .next 缓存...
if exist ".next" (
    rmdir /s /q ".next" >nul 2>&1
    echo   ✓ 已清理 .next 缓存目录
) else (
    echo   ✓ .next 目录不存在，无需清理
)

REM 3. 删除空的 app/sora 和 app/veo 目录
echo [3/4] 正在检查并清理空目录...
if exist "app\sora" (
    dir /b "app\sora" >nul 2>&1
    if %errorlevel% neq 0 (
        rmdir /s /q "app\sora" >nul 2>&1
        echo   ✓ 已删除空的 app/sora 目录
    ) else (
        echo   ✓ app/sora 目录不为空，保留
    )
)

if exist "app\veo" (
    dir /b "app\veo" >nul 2>&1
    if %errorlevel% neq 0 (
        rmdir /s /q "app\veo" >nul 2>&1
        echo   ✓ 已删除空的 app/veo 目录
    ) else (
        echo   ✓ app/veo 目录不为空，保留
    )
)

REM 4. 检查端口占用
echo [4/4] 正在检查端口占用...
netstat -ano | findstr ":3000.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo   ⚠ 端口 3000 仍被占用，将在启动时自动使用其他端口
) else (
    echo   ✓ 端口 3000 可用
)

echo.
echo ========================================
echo   正在启动开发服务器...
echo ========================================
echo.
echo   访问地址: http://localhost:3000
echo   按 Ctrl+C 停止服务器
echo.

REM 启动服务器
npm run dev

