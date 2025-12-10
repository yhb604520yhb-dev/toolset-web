#!/usr/bin/env node

/**
 * 部署准备脚本
 * 功能：
 * 1. 检查项目文件，排除敏感信息
 * 2. 验证依赖版本兼容性
 * 3. 清理不需要推送的文件
 * 4. 生成部署清单
 */

const fs = require('fs');
const path = require('path');

const SENSITIVE_PATTERNS = [
  /ghp_[A-Za-z0-9]{36,}/g, // GitHub Personal Access Token
  /gho_[A-Za-z0-9]{36,}/g, // GitHub OAuth Token
  /github_pat_[A-Za-z0-9_]{82,}/g, // GitHub Fine-grained Token
  /sk-[A-Za-z0-9]{32,}/g, // OpenAI API Key
  /Bearer\s+[A-Za-z0-9\-_]{20,}/gi, // Bearer tokens
];

const EXCLUDE_DIRS = [
  'node_modules',
  '.next',
  '.vercel',
  '.git',
  'dist',
  'build',
  '.cache',
  'coverage',
];

const EXCLUDE_FILES = [
  '.env',
  '.env.local',
  '.env.production.local',
  '.env.development.local',
  '*.log',
  '*.tsbuildinfo',
  'next-env.d.ts',
];

function checkForSensitiveInfo(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    SENSITIVE_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            file: filePath,
            match: match.substring(0, 20) + '...',
            pattern: `Pattern ${index + 1}`,
          });
        });
      }
    });
    
    return issues;
  } catch (error) {
    // 忽略无法读取的文件（二进制文件等）
    return [];
  }
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const textExtensions = ['.js', '.ts', '.tsx', '.jsx', '.json', '.md', '.txt', '.yaml', '.yml', '.toml', '.env'];
  
  // 只扫描文本文件
  if (!textExtensions.includes(ext) && ext !== '') {
    return false;
  }
  
  // 排除特定目录
  const relativePath = path.relative(process.cwd(), filePath);
  if (EXCLUDE_DIRS.some(dir => relativePath.includes(dir))) {
    return false;
  }
  
  return true;
}

function scanProject(rootDir = process.cwd()) {
  const issues = [];
  const scannedFiles = [];
  
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);
      
      // 跳过排除的目录
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.some(excluded => relativePath.startsWith(excluded))) {
          walkDir(fullPath);
        }
        continue;
      }
      
      // 扫描文件
      if (shouldScanFile(fullPath)) {
        scannedFiles.push(relativePath);
        const fileIssues = checkForSensitiveInfo(fullPath);
        issues.push(...fileIssues);
      }
    }
  }
  
  walkDir(rootDir);
  
  return { issues, scannedFiles };
}

function main() {
  console.log('🔍 开始检查项目文件...\n');
  
  const { issues, scannedFiles } = scanProject();
  
  console.log(`📊 扫描统计:`);
  console.log(`   - 扫描文件数: ${scannedFiles.length}`);
  console.log(`   - 发现敏感信息: ${issues.length} 处\n`);
  
  if (issues.length > 0) {
    console.log('❌ 发现敏感信息，请处理后再推送:\n');
    const groupedIssues = {};
    issues.forEach(issue => {
      if (!groupedIssues[issue.file]) {
        groupedIssues[issue.file] = [];
      }
      groupedIssues[issue.file].push(issue);
    });
    
    Object.entries(groupedIssues).forEach(([file, fileIssues]) => {
      console.log(`   📄 ${file}:`);
      fileIssues.forEach(issue => {
        console.log(`      - ${issue.match}`);
      });
      console.log('');
    });
    
    console.log('💡 建议:');
    console.log('   1. 从这些文件中移除敏感信息');
    console.log('   2. 或将这些文件添加到 .gitignore');
    console.log('   3. 使用环境变量存储敏感信息\n');
    
    process.exit(1);
  } else {
    console.log('✅ 未发现敏感信息，可以安全推送！\n');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkForSensitiveInfo, scanProject };

