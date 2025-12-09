/**
 * 清理 node_modules 中的冗余文件
 * 仅删除测试文件、文档、源码映射等非运行必需文件
 * 不影响依赖的完整性和功能
 */

const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

// 需要删除的文件模式
const patternsToRemove = [
  // 测试文件
  /\.test\.(js|ts|tsx|jsx)$/i,
  /\.spec\.(js|ts|tsx|jsx)$/i,
  /test\.(js|ts|tsx|jsx)$/i,
  /spec\.(js|ts|tsx|jsx)$/i,
  
  // 文档文件
  /\.md$/i,
  /\.markdown$/i,
  /^README/i,
  /^CHANGELOG/i,
  /^LICENSE/i,
  /^HISTORY/i,
  /^CONTRIBUTING/i,
  
  // 源码映射
  /\.map$/i,
  
  // 配置文件（开发用）
  /\.eslintrc/i,
  /\.prettierrc/i,
  /\.editorconfig$/i,
  /\.babelrc/i,
  /jest\.config\./i,
  /webpack\.config\./i,
  /rollup\.config\./i,
];

// 需要删除的目录
const dirsToRemove = [
  'test',
  '__tests__',
  'tests',
  'examples',
  'example',
  'docs',
  'doc',
  'documentation',
  'demo',
  'demos',
  '.github',
  '.vscode',
  '.idea',
];

let deletedFiles = 0;
let deletedDirs = 0;
let savedSize = 0;

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile() ? stats.size : 0;
  } catch {
    return 0;
  }
}

function shouldDeleteFile(fileName) {
  return patternsToRemove.some(pattern => pattern.test(fileName));
}

function shouldDeleteDir(dirName) {
  return dirsToRemove.includes(dirName.toLowerCase());
}

function deleteFile(filePath) {
  try {
    const size = getFileSize(filePath);
    fs.unlinkSync(filePath);
    deletedFiles++;
    savedSize += size;
    return true;
  } catch (error) {
    // 忽略删除失败的文件（可能是权限问题）
    return false;
  }
}

function deleteDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      const stats = fs.statSync(dirPath);
      if (stats.isDirectory()) {
        const size = getDirSize(dirPath);
        fs.rmSync(dirPath, { recursive: true, force: true });
        deletedDirs++;
        savedSize += size;
        return true;
      }
    }
    return false;
  } catch (error) {
    // 忽略删除失败的目录
    return false;
  }
}

function getDirSize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          size += stats.size;
        } else if (stats.isDirectory()) {
          size += getDirSize(filePath);
        }
      } catch {
        // 忽略无法访问的文件
      }
    }
  } catch {
    // 忽略无法访问的目录
  }
  return size;
}

function cleanDirectory(dirPath, depth = 0) {
  // 限制递归深度，避免处理过深
  if (depth > 10) return;
  
  try {
    if (!fs.existsSync(dirPath)) return;
    
    const entries = fs.readdirSync(dirPath);
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      
      try {
        const stats = fs.statSync(entryPath);
        
        if (stats.isDirectory()) {
          // 检查是否是需要删除的目录
          if (shouldDeleteDir(entry)) {
            deleteDirectory(entryPath);
          } else {
            // 递归处理子目录
            cleanDirectory(entryPath, depth + 1);
          }
        } else if (stats.isFile()) {
          // 检查是否是需要删除的文件
          if (shouldDeleteFile(entry)) {
            deleteFile(entryPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的文件/目录
        continue;
      }
    }
  } catch (error) {
    // 忽略无法访问的目录
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// 主函数
function main() {
  console.log('🧹 开始清理 node_modules 中的冗余文件...\n');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('❌ node_modules 目录不存在，请先运行 npm install');
    process.exit(1);
  }
  
  const startTime = Date.now();
  cleanDirectory(nodeModulesPath);
  const endTime = Date.now();
  
  console.log('\n✅ 清理完成！');
  console.log(`📊 统计信息:`);
  console.log(`   - 删除文件: ${deletedFiles} 个`);
  console.log(`   - 删除目录: ${deletedDirs} 个`);
  console.log(`   - 释放空间: ${formatSize(savedSize)}`);
  console.log(`   - 耗时: ${((endTime - startTime) / 1000).toFixed(2)} 秒`);
  console.log('\n💡 提示: 清理后的 node_modules 不影响项目运行');
  console.log('💡 下次运行 npm install 时会重新安装完整依赖');
}

main();

