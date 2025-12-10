/** @type {import('@cloudflare/next-on-pages').NextOnPagesConfig} */
module.exports = {
  // 配置 esbuild 以处理 Node.js 内置模块
  buildCommand: undefined, // 使用默认构建命令
  outputDirectory: '.vercel/output/static',
  // 传递给 esbuild 的选项
  esbuildOptions: {
    platform: 'browser', // 使用 browser 平台而不是 node
    format: 'esm',
    external: ['async_hooks'], // 将 async_hooks 标记为外部依赖
  },
};

