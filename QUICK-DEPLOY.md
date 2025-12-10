# 🚀 Ubuntu 22.04 超简单部署（3步完成）

## 第一步：连接服务器

```bash
ssh root@你的服务器IP
```

## 第二步：进入项目目录

```bash
cd /root/toolset-web  # 或者你的项目存放路径
```

## 第三步：运行部署脚本

```bash
chmod +x deploy-ubuntu.sh
./deploy-ubuntu.sh
```

**完成！** ✅

项目会自动运行在：`http://你的服务器IP:3000`

---

## 📝 后续操作（可选）

### 查看运行状态
```bash
pm2 status
```

### 查看日志
```bash
pm2 logs toolset-web
```

### 重启服务
```bash
pm2 restart toolset-web
```

---

## 🌐 配置域名（如果需要）

1. **安装 Nginx**
```bash
sudo apt update && sudo apt install nginx -y
```

2. **创建配置文件**
```bash
sudo nano /etc/nginx/sites-available/toolset-web
```

3. **粘贴以下内容**（修改域名）
```nginx
server {
    listen 80;
    server_name hd.604520.top;  # 改成你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

4. **启用配置**
```bash
sudo ln -s /etc/nginx/sites-available/toolset-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **安装 SSL 证书（HTTPS）**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d hd.604520.top
```

**完成！** 现在可以用域名访问了 🎉

