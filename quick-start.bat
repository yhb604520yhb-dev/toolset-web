@echo off
chcp 65001 >nul
echo ========================================
echo   快速启动工具
echo ========================================
echo.

REM 快速修复
echo [1/3] 停止旧进程...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/3] 清理缓存...
if exist ".next" (
    rmdir /s /q ".next" >nul 2>&1
)

echo [3/3] 清理空目录...
if exist "app\sora" (
    dir /b "app\sora" >nul 2>&1
    if %errorlevel% neq 0 (
        rmdir /s /q "app\sora" >nul 2>&1
    )
)

if exist "app\veo" (
    dir /b "app\veo" >nul 2>&1
    if %errorlevel% neq 0 (
        rmdir /s /q "app\veo" >nul 2>&1
    )
)

echo.
echo ✓ 修复完成，正在启动服务器...
echo   访问地址: http://localhost:3000
echo   按 Ctrl+C 停止服务器
echo.

REM 启动服务器
npm run dev

