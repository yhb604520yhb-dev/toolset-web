# Git 自动推送脚本
# 功能：自动检查、推送代码到 GitHub，处理各种错误情况

param(
    [string]$Branch = "new-branch-name",
    [string]$GitHubToken = "",
    [string]$GitHubUser = "yhb604520yhb-dev",
    [string]$Repo = "toolset-web"
)

$ErrorActionPreference = "Stop"

# 颜色输出函数
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

Write-Info "🚀 开始 Git 自动推送流程..."
Write-Info "目标分支: $Branch"
Write-Info "仓库: $GitHubUser/$Repo"
Write-Info ""

# 1. 检查是否为 Git 仓库
if (-not (Test-Path ".git")) {
    Write-Error "当前目录不是 Git 仓库！"
    exit 1
}

# 2. 检查是否有未提交的更改
$status = git status --porcelain
if ($status) {
    Write-Warning "发现未提交的更改，请先提交："
    Write-Output $status
    $response = Read-Host "是否现在提交？(y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        git add .
        $commitMsg = Read-Host "请输入提交信息"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "更新代码"
        }
        git commit -m $commitMsg
        Write-Success "代码已提交"
    } else {
        Write-Error "请先提交更改后再推送"
        exit 1
    }
}

# 3. 检查敏感信息
Write-Info "🔍 检查敏感信息..."
$sensitiveCheck = node scripts/prepare-deploy.js 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "检测到敏感信息，请先处理后再推送"
    Write-Output $sensitiveCheck
    exit 1
}
Write-Success "未发现敏感信息"

# 4. 尝试推送
Write-Info "📤 开始推送..."

# 先尝试 SSH 方式
Write-Info "尝试 SSH 方式推送..."
$sshRemote = "git@github.com:$GitHubUser/$Repo.git"
git remote set-url origin $sshRemote 2>&1 | Out-Null

$pushResult = git push -u origin $Branch 2>&1
$pushSuccess = $LASTEXITCODE -eq 0

# 如果 SSH 失败，切换到 HTTPS
if (-not $pushSuccess) {
    Write-Warning "SSH 推送失败，切换到 HTTPS 方式..."
    
    if ([string]::IsNullOrWhiteSpace($GitHubToken)) {
        Write-Error "GitHub Token 未提供，无法使用 HTTPS 方式推送"
        Write-Info "请在脚本中设置 `$GitHubToken 参数，或手动推送"
        exit 1
    }
    
    # 配置 HTTPS 远程地址
    $httpsRemote = "https://${GitHubUser}:${GitHubToken}@github.com/$GitHubUser/$Repo.git"
    git remote set-url origin $httpsRemote 2>&1 | Out-Null
    
    # 临时关闭 SSL 验证
    $oldSslVerify = git config --global http.sslVerify
    git config --global http.sslVerify false
    
    try {
        # 尝试推送
        Write-Info "使用 HTTPS 方式推送..."
        $pushResult = git push -u origin $Branch -f 2>&1
        $pushSuccess = $LASTEXITCODE -eq 0
        
        if ($pushSuccess) {
            Write-Success "推送成功！"
        } else {
            # 检查是否是 GitHub Push Protection
            if ($pushResult -match "GH013|Push cannot contain secrets|Push Protection") {
                Write-Error "GitHub Push Protection 拦截：检测到敏感信息"
                Write-Info "请访问提示的 URL 允许推送，或从代码中移除敏感信息"
                
                # 提取 URL
                $urlMatch = [regex]::Match($pushResult, "https://[^\s]+")
                if ($urlMatch.Success) {
                    Write-Info "允许推送 URL: $($urlMatch.Value)"
                }
            } else {
                Write-Error "推送失败："
                Write-Output $pushResult
            }
        }
    } finally {
        # 恢复 SSL 验证设置
        if ($oldSslVerify) {
            git config --global http.sslVerify $oldSslVerify
        } else {
            git config --global --unset http.sslVerify
        }
    }
} else {
    Write-Success "SSH 推送成功！"
}

if ($pushSuccess) {
    Write-Success "✅ 代码已成功推送到 GitHub！"
    Write-Info "分支: $Branch"
    Write-Info "仓库: https://github.com/$GitHubUser/$Repo"
    Write-Info ""
    Write-Warning "⚠️  如果本次推送包含敏感 Token，请立即到 GitHub 作废相关 Token："
    Write-Info "   https://github.com/settings/tokens"
} else {
    Write-Error "推送失败，请检查错误信息并重试"
    exit 1
}

