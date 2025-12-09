/**
 * 项目目录重组脚本
 * 按功能模块分类存放文件和文件夹
 * 自动更新所有引用路径，确保功能正常
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// 新的目录结构映射
// 注意：Next.js 要求 app 目录必须在根目录，不能移动
const structure = {
  // 前端页面（Next.js 要求，保持原位置）
  'app': 'app',
  
  // 公共组件
  'components': 'src/components',
  
  // 工具库和 API
  'lib': 'src/lib',
  
  // 配置文件
  'config': 'src/config',
  
  // 静态资源
  'public': 'public',
  
  // 脚本文件
  'scripts': 'scripts',
  
  // 文档文件
  'docs': 'docs',
};

// 需要移动到 public 的静态文件
const staticFiles = [
  { from: 'app/favicon.ico', to: 'public/favicon.ico' },
  { from: 'app/fonts', to: 'public/fonts' },
];

// 需要移动到 docs 的文档文件
const docFiles = [
  { from: 'README.md', to: 'docs/README.md' },
  { from: 'project-core.md', to: 'docs/project-core.md' },
  { from: 'OPTIMIZATION.md', to: 'docs/OPTIMIZATION.md' },
  { from: 'config/API_REQUIREMENTS.md', to: 'docs/API_REQUIREMENTS.md' },
  { from: 'config/README.md', to: 'docs/config-README.md' },
  { from: 'python_example.py', to: 'docs/python_example.py' },
];

// 路径映射表（用于更新引用）
const pathMappings = {
  '@/components': '@/src/components',
  '@/lib': '@/src/lib',
  '@/config': '@/src/config',
};

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 创建目录: ${path.relative(projectRoot, dirPath)}`);
  }
}

function moveFile(from, to) {
  const fromPath = path.join(projectRoot, from);
  const toPath = path.join(projectRoot, to);
  
  if (!fs.existsSync(fromPath)) {
    console.warn(`⚠️  源文件不存在: ${from}`);
    return false;
  }
  
  // 创建目标目录
  const toDir = path.dirname(toPath);
  createDirectory(toDir);
  
  // 移动文件
  try {
    fs.renameSync(fromPath, toPath);
    console.log(`✅ 移动文件: ${from} -> ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ 移动文件失败: ${from}`, error.message);
    return false;
  }
}

function moveDirectory(from, to) {
  const fromPath = path.join(projectRoot, from);
  const toPath = path.join(projectRoot, to);
  
  if (!fs.existsSync(fromPath)) {
    console.warn(`⚠️  源目录不存在: ${from}`);
    return false;
  }
  
  // 创建目标目录
  createDirectory(toPath);
  
  // 复制所有文件
  function copyRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        createDirectory(destPath);
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  try {
    copyRecursive(fromPath, toPath);
    // 删除原目录
    fs.rmSync(fromPath, { recursive: true, force: true });
    console.log(`✅ 移动目录: ${from} -> ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ 移动目录失败: ${from}`, error.message);
    return false;
  }
}

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // 更新路径映射
    Object.entries(pathMappings).forEach(([oldPath, newPath]) => {
      const regex = new RegExp(oldPath.replace(/\//g, '\\/'), 'g');
      if (content.match(regex)) {
        content = content.replace(regex, newPath);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ 更新引用路径: ${path.relative(projectRoot, filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ 更新文件失败: ${filePath}`, error.message);
    return false;
  }
}

function scanAndUpdateImports(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
        continue;
      }
      scanAndUpdateImports(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'].includes(ext)) {
        updateImportsInFile(fullPath);
      }
    }
  }
}

function fixAbsolutePath(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // 修复 python_example.py 中的绝对路径
    if (filePath.endsWith('python_example.py')) {
      // 将绝对路径改为相对路径或注释说明
      const oldPattern = /"file:\/\/\/Users\/xxx\/Desktop\/纯白占位图\.png"/g;
      const newPattern = '"placeholder.png"  # 请替换为实际占位图路径（相对路径或绝对路径）';
      
      if (content.match(oldPattern)) {
        content = content.replace(oldPattern, newPattern);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ 修复绝对路径: ${path.relative(projectRoot, filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ 修复文件失败: ${filePath}`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 开始重组项目目录结构...\n');
  
  // 1. 创建新目录结构
  console.log('📁 创建目录结构...');
  Object.values(structure).forEach(dir => {
    if (dir !== 'app') { // app 目录已存在
      createDirectory(path.join(projectRoot, dir));
    }
  });
  createDirectory(path.join(projectRoot, 'public'));
  createDirectory(path.join(projectRoot, 'docs'));
  
  // 2. 移动组件目录
  console.log('\n📦 移动组件目录...');
  if (fs.existsSync(path.join(projectRoot, 'components'))) {
    moveDirectory('components', 'src/components');
  }
  
  // 3. 移动工具库目录
  console.log('\n📚 移动工具库目录...');
  if (fs.existsSync(path.join(projectRoot, 'lib'))) {
    moveDirectory('lib', 'src/lib');
  }
  
  // 4. 移动配置目录
  console.log('\n⚙️  移动配置目录...');
  if (fs.existsSync(path.join(projectRoot, 'config'))) {
    moveDirectory('config', 'src/config');
  }
  
  // 5. 移动静态文件
  console.log('\n🖼️  移动静态文件...');
  staticFiles.forEach(({ from, to }) => {
    if (fs.existsSync(path.join(projectRoot, from))) {
      if (fs.statSync(path.join(projectRoot, from)).isDirectory()) {
        moveDirectory(from, to);
      } else {
        moveFile(from, to);
      }
    }
  });
  
  // 6. 移动文档文件
  console.log('\n📄 移动文档文件...');
  docFiles.forEach(({ from, to }) => {
    if (fs.existsSync(path.join(projectRoot, from))) {
      moveFile(from, to);
    }
  });
  
  // 7. 修复绝对路径
  console.log('\n🔧 修复绝对路径...');
  if (fs.existsSync(path.join(projectRoot, 'docs/python_example.py'))) {
    fixAbsolutePath(path.join(projectRoot, 'docs/python_example.py'));
  }
  
  // 8. 更新所有文件的引用路径
  console.log('\n🔄 更新引用路径...');
  scanAndUpdateImports(projectRoot);
  
  // 9. 更新 tsconfig.json 路径配置
  console.log('\n⚙️  更新 TypeScript 配置...');
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      // tsconfig 中的 paths 配置使用 @/* 指向根目录，不需要修改
      // 但需要确保 include 路径正确
      if (!tsconfig.include) {
        tsconfig.include = ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'];
      }
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf-8');
      console.log('✅ 更新 tsconfig.json');
    } catch (error) {
      console.error('❌ 更新 tsconfig.json 失败:', error.message);
    }
  }
  
  // 10. 更新 tailwind.config.ts
  console.log('\n🎨 更新 Tailwind 配置...');
  const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.ts');
  if (fs.existsSync(tailwindConfigPath)) {
    try {
      let content = fs.readFileSync(tailwindConfigPath, 'utf-8');
      // 更新 content 路径
      content = content.replace(
        /"\.\/components/g,
        '"./src/components'
      );
      content = content.replace(
        /"\.\/lib/g,
        '"./src/lib'
      );
      fs.writeFileSync(tailwindConfigPath, content, 'utf-8');
      console.log('✅ 更新 tailwind.config.ts');
    } catch (error) {
      console.error('❌ 更新 tailwind.config.ts 失败:', error.message);
    }
  }
  
  console.log('\n✅ 目录重组完成！');
  console.log('\n📋 新目录结构:');
  console.log('  app/              - 前端页面（Next.js 要求）');
  console.log('  src/              - 源代码目录');
  console.log('    components/     - 公共组件');
  console.log('    lib/            - 工具库和 API');
  console.log('    config/         - 配置文件');
  console.log('  public/           - 静态资源');
  console.log('  scripts/          - 脚本文件');
  console.log('  docs/             - 文档文件');
  console.log('\n💡 提示: 请运行 npm run dev 测试项目是否正常');
}

// 执行前确认
console.log('⚠️  警告: 此操作将重组项目目录结构');
console.log('⚠️  请确保已提交所有更改到版本控制');
console.log('⚠️  按 Ctrl+C 取消，或等待 3 秒后自动执行...\n');

setTimeout(() => {
  main();
}, 3000);

