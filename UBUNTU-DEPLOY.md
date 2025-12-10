# Ubuntu 22.04 部署指南（超简单版）

## 🚀 一键部署（推荐）

### 步骤 1：上传项目到服务器

```bash
# 在本地（Windows）执行
git clone <你的仓库地址>
# 或直接上传整个项目文件夹到服务器
```

### 步骤 2：在服务器上执行部署脚本

```bash
# 1. 登录服务器（SSH）
ssh root@你的服务器IP

# 2. 进入项目目录
cd /root/toolset-web  # 或者你的项目路径

# 3. 给脚本添加执行权限
chmod +x deploy-ubuntu.sh

# 4. 运行部署脚本（一键完成所有步骤）
./deploy-ubuntu.sh
```

**完成！** 项目会在 `http://服务器IP:3000` 运行

---

## 📋 手动部署（如果脚本不工作）

### 1. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # 应该显示 v20.x.x
```

### 2. 安装依赖和构建

```bash
cd /root/toolset-web  # 你的项目路径
npm install
npm run build
```

### 3. 安装 PM2（进程管理器）

```bash
sudo npm install -g pm2
```

### 4. 启动项目

```bash
pm2 start npm --name "toolset-web" -- start
pm2 save
pm2 startup  # 设置开机自启
```

---

## 🔧 常用命令

```bash
# 查看运行状态
pm2 status

# 查看日志
pm2 logs toolset-web

# 重启
pm2 restart toolset-web

# 停止
pm2 stop toolset-web

# 删除
pm2 delete toolset-web
```

---

## 🌐 配置域名（可选）

如果需要使用域名访问：

### 1. 安装 Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

### 2. 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/toolset-web
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name hd.604520.top;  # 你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 启用配置并重启

```bash
sudo ln -s /etc/nginx/sites-available/toolset-web /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl restart nginx
```

### 4. 安装 SSL 证书（HTTPS）

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d hd.604520.top
```

---

## ✅ 验证部署

访问：`http://你的服务器IP:3000` 或 `https://hd.604520.top`

应该能看到正常的应用界面，而不是 "Hello world"！

---

## 🐛 遇到问题？

### 端口被占用

```bash
# 查看端口占用
sudo lsof -i :3000
# 或修改 Next.js 端口（在 package.json 的 start 脚本中添加 -p 3001）
```

### 防火墙问题

```bash
# 开放 3000 端口
sudo ufw allow 3000
sudo ufw allow 80
sudo ufw allow 443
```

### 查看错误日志

```bash
pm2 logs toolset-web --lines 50
```

