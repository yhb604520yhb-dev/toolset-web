# Cloudflare Pages 一键部署脚本
# 功能：自动化完成部署前的所有检查和准备工作

param(
    [string]$Branch = "new-branch-name",
    [string]$GitHubToken = "",
    [string]$GitHubUser = "yhb604520yhb-dev",
    [string]$Repo = "toolset-web",
    [switch]$SkipPush = $false
)

$ErrorActionPreference = "Stop"

# 颜色输出
function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { param($msg) Write-ColorOutput Green "✅ $msg" }
function Write-Error { param($msg) Write-ColorOutput Red "❌ $msg" }
function Write-Info { param($msg) Write-ColorOutput Cyan "ℹ️  $msg" }
function Write-Warning { param($msg) Write-ColorOutput Yellow "⚠️  $msg" }
function Write-Step { param($num, $msg) Write-ColorOutput Magenta "📋 [$num] $msg" }

Write-Info "🚀 Cloudflare Pages 部署准备脚本"
Write-Info "====================================="
Write-Info ""

# 步骤 1: 检查项目结构
Write-Step "1" "检查项目结构..."

$requiredFiles = @(
    "package.json",
    "next.config.mjs",
    "wrangler.toml",
    ".npmrc",
    ".gitignore"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Error "缺少必需文件:"
    $missingFiles | ForEach-Object { Write-Output "   - $_" }
    exit 1
}
Write-Success "项目结构检查通过"

# 步骤 2: 检查敏感信息
Write-Step "2" "检查敏感信息..."
if (Test-Path "scripts/prepare-deploy.js") {
    $checkResult = node scripts/prepare-deploy.js 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "检测到敏感信息，请先处理"
        Write-Output $checkResult
        exit 1
    }
    Write-Success "未发现敏感信息"
} else {
    Write-Warning "prepare-deploy.js 不存在，跳过敏感信息检查"
}

# 步骤 3: 检查依赖安装
Write-Step "3" "检查依赖..."
if (Test-Path "node_modules") {
    Write-Info "node_modules 已存在"
} else {
    Write-Info "安装依赖..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "依赖安装失败"
        exit 1
    }
    Write-Success "依赖安装完成"
}

# 步骤 4: 本地构建测试
Write-Step "4" "本地构建测试..."
Write-Info "执行 npm run build..."
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "本地构建失败，请检查错误信息"
    exit 1
}
Write-Success "本地构建成功"

# 步骤 5: 检查 Git 状态
Write-Step "5" "检查 Git 状态..."
if (-not (Test-Path ".git")) {
    Write-Warning "当前目录不是 Git 仓库，初始化..."
    git init
    git remote add origin "https://github.com/$GitHubUser/$Repo.git"
}

$status = git status --porcelain
if ($status) {
    Write-Warning "发现未提交的更改"
    Write-Output $status
    $response = Read-Host "是否现在提交？(y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        git add .
        $commitMsg = Read-Host "请输入提交信息（直接回车使用默认）"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "准备部署到 Cloudflare Pages"
        }
        git commit -m $commitMsg
        Write-Success "代码已提交"
    }
}

# 步骤 6: 推送代码
if (-not $SkipPush) {
    Write-Step "6" "推送到 GitHub..."
    
    if ([string]::IsNullOrWhiteSpace($GitHubToken)) {
        Write-Warning "未提供 GitHub Token，跳过推送"
        Write-Info "可以稍后手动推送，或使用以下命令："
        Write-Info "  .\scripts\git-push.ps1 -Branch $Branch -GitHubToken `$token"
    } else {
        Write-Info "执行推送脚本..."
        & ".\scripts\git-push.ps1" -Branch $Branch -GitHubToken $GitHubToken -GitHubUser $GitHubUser -Repo $Repo
        if ($LASTEXITCODE -eq 0) {
            Write-Success "代码已推送到 GitHub"
        } else {
            Write-Error "推送失败"
            exit 1
        }
    }
} else {
    Write-Info "跳过推送（使用 -SkipPush 参数）"
}

# 完成
Write-Info ""
Write-Success "====================================="
Write-Success "✅ 部署准备完成！"
Write-Info ""
Write-Info "📋 下一步："
Write-Info "   1. 如果代码已推送，Cloudflare Pages 会自动开始构建"
Write-Info "   2. 在 Cloudflare Dashboard 中查看构建状态"
Write-Info "   3. 构建成功后，访问部署地址验证功能"
Write-Info ""
Write-Info "📖 详细文档请查看: DEPLOY-GUIDE.md"

