/**
 * 验证项目中的路径引用
 * 检查所有 import/require 语句的路径是否有效
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const errors = [];
const warnings = [];

// 解析路径别名
function resolvePath(importPath, fromFile) {
  // 处理 @/ 别名
  if (importPath.startsWith('@/')) {
    const relativePath = importPath.replace('@/', '');
    return path.join(projectRoot, relativePath);
  }
  
  // 处理相对路径
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const fromDir = path.dirname(fromFile);
    return path.resolve(fromDir, importPath);
  }
  
  // node_modules 中的包，不检查
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }
  
  return null;
}

// 检查文件是否存在
function checkFileExists(filePath, extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']) {
  // 直接检查文件
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return true;
  }
  
  // 检查带扩展名的文件
  for (const ext of extensions) {
    const fileWithExt = filePath + ext;
    if (fs.existsSync(fileWithExt) && fs.statSync(fileWithExt).isFile()) {
      return true;
    }
  }
  
  // 检查目录（可能是 index 文件）
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    for (const ext of extensions) {
      const indexFile = path.join(filePath, `index${ext}`);
      if (fs.existsSync(indexFile)) {
        return true;
      }
    }
  }
  
  return false;
}

// 分析文件
function analyzeFile(filePath) {
  const relativePath = path.relative(projectRoot, filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 匹配 import 语句
      const importMatch = line.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const importPath = importMatch[1];
        const resolvedPath = resolvePath(importPath, filePath);
        
        if (resolvedPath && !checkFileExists(resolvedPath)) {
          errors.push({
            file: relativePath,
            line: index + 1,
            import: importPath,
            resolved: path.relative(projectRoot, resolvedPath),
            type: 'import'
          });
        }
      }
      
      // 匹配 require 语句
      const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (requireMatch) {
        const requirePath = requireMatch[1];
        const resolvedPath = resolvePath(requirePath, filePath);
        
        if (resolvedPath && !checkFileExists(resolvedPath)) {
          errors.push({
            file: relativePath,
            line: index + 1,
            import: requirePath,
            resolved: path.relative(projectRoot, resolvedPath),
            type: 'require'
          });
        }
      }
      
      // 检查绝对路径（排除注释）
      const trimmedLine = line.trim();
      if (trimmedLine.match(/[CDEF]:\\|file:\/\/|^\/[^\/]/) && 
          !trimmedLine.startsWith('//') && 
          !trimmedLine.startsWith('#') &&
          !trimmedLine.startsWith('/**') &&
          !trimmedLine.startsWith('*') &&
          !trimmedLine.startsWith('*/')) {
        warnings.push({
          file: relativePath,
          line: index + 1,
          content: trimmedLine,
          type: 'absolute-path'
        });
      }
    });
  } catch (error) {
    errors.push({
      file: relativePath,
      error: error.message,
      type: 'read-error'
    });
  }
}

// 扫描所有文件
function scanFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
        continue;
      }
      scanFiles(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
        analyzeFile(fullPath);
      }
    }
  }
}

// 生成报告
function generateReport() {
  console.log('\n📊 路径验证报告\n');
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ 所有路径引用正常，未发现错误！\n');
    return;
  }
  
  if (errors.length > 0) {
    console.log(`❌ 发现 ${errors.length} 个路径错误:\n`);
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.file}:${error.line}`);
      console.log(`   引用: ${error.import}`);
      if (error.resolved) {
        console.log(`   解析路径: ${error.resolved} (不存在)`);
      }
      if (error.error) {
        console.log(`   错误: ${error.error}`);
      }
      console.log('');
    });
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  发现 ${warnings.length} 个警告（可能的绝对路径）:\n`);
    warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning.file}:${warning.line}`);
      console.log(`   内容: ${warning.content.substring(0, 80)}...`);
      console.log('');
    });
  }
  
  console.log('\n💡 提示: 请检查并修复上述错误和警告');
}

// 主函数
function main() {
  console.log('🔍 开始验证项目路径引用...\n');
  scanFiles(projectRoot);
  generateReport();
  
  if (errors.length > 0) {
    process.exit(1);
  }
}

main();

