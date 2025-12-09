# 项目启动指南

## 快速启动（推荐）

### 方式一：使用批处理文件（CMD/PowerShell）

**在 CMD 中：**
```cmd
quick-start.bat
```

**在 PowerShell 中：**
```powershell
.\quick-start.bat
```

### 方式二：使用 npm 命令

```bash
npm run quick
```

### 方式三：完整修复脚本

**CMD：**
```cmd
fix-and-start.bat
```

**PowerShell：**
```powershell
.\fix-and-start.bat
```

**npm：**
```bash
npm run fix
```

## 功能说明

这些脚本会自动执行：
1. ✅ 停止所有 Node 进程
2. ✅ 清理 `.next` 缓存
3. ✅ 删除空的 `app/sora` 和 `app/veo` 目录
4. ✅ 检查端口占用
5. ✅ 启动开发服务器

## 注意事项

- **PowerShell 用户**：运行批处理文件时必须在文件名前加 `.\` 前缀
- **CMD 用户**：可以直接输入文件名运行
- 服务器启动后，访问地址：http://localhost:3000

## 常见问题

### 问题：端口被占用
**解决方案**：脚本会自动停止所有 Node 进程并清理端口

### 问题：404 错误
**解决方案**：运行修复脚本清理缓存和空目录

### 问题：无法加载页面
**解决方案**：使用 `npm run quick` 或 `.\quick-start.bat` 重新启动

