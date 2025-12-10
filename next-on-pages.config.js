/** @type {import('@cloudflare/next-on-pages').NextOnPagesConfig} */
module.exports = {
  // 禁用 worker minification 以避免 async_hooks 错误
  // 这会增加 worker 文件大小，但可以绕过 esbuild 打包问题
  disableWorkerMinification: true,
  
  // 配置 esbuild 选项
  esbuildOptions: {
    // 使用 browser 平台而不是 node
    platform: 'browser',
    // 将 async_hooks 标记为外部依赖，不进行打包
    external: ['async_hooks'],
    // 使用 ESM 格式
    format: 'esm',
  },
};

