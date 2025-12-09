/**
 * 分析项目中的导入路径
 * 用于目录重组前的路径分析
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const imports = new Map();
const files = [];

// 扫描所有 TypeScript/JavaScript 文件
function scanFiles(dir, baseDir = projectRoot) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    // 跳过 node_modules, .next 等目录
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
        continue;
      }
      scanFiles(fullPath, baseDir);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
        files.push(relativePath);
        analyzeFile(fullPath, relativePath);
      }
    }
  }
}

// 分析文件中的导入语句
function analyzeFile(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 匹配 import 语句
      const importMatch = line.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const importPath = importMatch[1];
        if (!imports.has(relativePath)) {
          imports.set(relativePath, []);
        }
        imports.get(relativePath).push({
          line: index + 1,
          path: importPath,
          type: 'import'
        });
      }
      
      // 匹配 require 语句
      const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (requireMatch) {
        const requirePath = requireMatch[1];
        if (!imports.has(relativePath)) {
          imports.set(relativePath, []);
        }
        imports.get(relativePath).push({
          line: index + 1,
          path: requirePath,
          type: 'require'
        });
      }
      
      // 检查绝对路径
      if (line.match(/[CDEF]:\\|file:\/\/|^\/[^\/]/)) {
        console.warn(`⚠️  发现可能的绝对路径: ${relativePath}:${index + 1}`);
        console.warn(`   内容: ${line.trim()}`);
      }
    });
  } catch (error) {
    console.error(`❌ 读取文件失败: ${relativePath}`, error.message);
  }
}

// 生成报告
function generateReport() {
  console.log('\n📊 导入路径分析报告\n');
  console.log(`总文件数: ${files.length}`);
  console.log(`有导入的文件数: ${imports.size}\n`);
  
  // 统计路径类型
  const pathTypes = {
    '@/': 0,
    './': 0,
    '../': 0,
    '绝对路径': 0,
    'node_modules': 0,
    '其他': 0
  };
  
  imports.forEach((importsList, file) => {
    importsList.forEach(imp => {
      if (imp.path.startsWith('@/')) {
        pathTypes['@/']++;
      } else if (imp.path.startsWith('./')) {
        pathTypes['./']++;
      } else if (imp.path.startsWith('../')) {
        pathTypes['../']++;
      } else if (imp.path.match(/^[CDEF]:\\|^\/[^\/]/)) {
        pathTypes['绝对路径']++;
      } else if (!imp.path.startsWith('.')) {
        pathTypes['node_modules']++;
      } else {
        pathTypes['其他']++;
      }
    });
  });
  
  console.log('路径类型统计:');
  Object.entries(pathTypes).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`  ${type}: ${count}`);
    }
  });
  
  console.log('\n✅ 分析完成！');
}

// 主函数
function main() {
  console.log('🔍 开始分析项目导入路径...\n');
  scanFiles(projectRoot);
  generateReport();
}

main();

