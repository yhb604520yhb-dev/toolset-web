#!/usr/bin/env node

/**
 * 清理脚本 - 准备部署到 Cloudflare Pages
 * 移除不需要推送的文件和目录
 */

const fs = require('fs');
const path = require('path');

const FILES_TO_REMOVE = [
  // 构建输出
  '.next',
  'out',
  'dist',
  'build',
  '.vercel',
  
  // 缓存和临时文件
  '.cache',
  '.turbo',
  'node_modules/.cache',
  '*.tsbuildinfo',
  'next-env.d.ts',
  
  // 日志文件
  '*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  'pnpm-debug.log*',
  
  // 系统文件
  '.DS_Store',
  'Thumbs.db',
  
  // IDE 配置
  '.vscode',
  '.idea',
  '*.suo',
  '*.ntvs*',
  '*.njsproj',
  '*.sln',
  '*.sw?',
];

const FILES_TO_KEEP = [
  'package.json',
  'package-lock.json',
  '.npmrc',
  'next.config.mjs',
  'tsconfig.json',
  'tailwind.config.ts',
  'postcss.config.mjs',
  'wrangler.toml',
  '.gitignore',
  'README.md',
];

function removeFileOrDir(target) {
  try {
    const fullPath = path.resolve(process.cwd(), target);
    if (!fs.existsSync(fullPath)) {
      return { success: true, skipped: true };
    }
    
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      return { success: true, type: 'directory' };
    } else {
      fs.unlinkSync(fullPath);
      return { success: true, type: 'file' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🧹 开始清理项目文件...\n');
  
  const results = {
    removed: [],
    skipped: [],
    errors: [],
  };
  
  FILES_TO_REMOVE.forEach(pattern => {
    // 处理通配符模式
    if (pattern.includes('*')) {
      // 简化处理：只处理已知的文件模式
      return;
    }
    
    const result = removeFileOrDir(pattern);
    if (result.success && !result.skipped) {
      results.removed.push({ path: pattern, type: result.type });
      console.log(`✅ 已删除: ${pattern}`);
    } else if (result.skipped) {
      results.skipped.push(pattern);
    } else {
      results.errors.push({ path: pattern, error: result.error });
      console.log(`⚠️  跳过: ${pattern} (${result.error})`);
    }
  });
  
  console.log('\n📊 清理统计:');
  console.log(`   - 已删除: ${results.removed.length} 项`);
  console.log(`   - 跳过: ${results.skipped.length} 项`);
  console.log(`   - 错误: ${results.errors.length} 项`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ 清理过程中的错误:');
    results.errors.forEach(err => {
      console.log(`   - ${err.path}: ${err.error}`);
    });
  }
  
  console.log('\n✅ 清理完成！');
  console.log('💡 提示: 这些文件不会被推送到 Git，已经在 .gitignore 中排除');
}

if (require.main === module) {
  main();
}

module.exports = { removeFileOrDir };

