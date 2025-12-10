#!/bin/bash
# Ubuntu 22.04 一键部署脚本

echo "🚀 开始部署..."

# 1. 安装 Node.js 20.x
echo "📦 安装 Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装 PM2（进程管理器）
echo "📦 安装 PM2..."
sudo npm install -g pm2

# 3. 安装项目依赖
echo "📦 安装项目依赖..."
npm install

# 4. 构建项目
echo "🔨 构建项目..."
npm run build

# 5. 启动项目（使用 PM2）
echo "🎉 启动项目..."
pm2 start npm --name "toolset-web" -- start
pm2 save
pm2 startup

echo "✅ 部署完成！"
echo "📝 查看状态: pm2 status"
echo "📝 查看日志: pm2 logs toolset-web"
echo "📝 重启: pm2 restart toolset-web"
echo "📝 停止: pm2 stop toolset-web"

