/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用压缩（Gzip/Brotli）
  compress: true,
  
  // 构建时忽略 ESLint 错误（用于测试 Cloudflare 构建）
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 构建时忽略 TypeScript 类型错误（用于测试）
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Cloudflare Pages 兼容：允许同时支持本地开发和 Cloudflare 部署
  // 本地开发时使用默认配置，Cloudflare 部署时通过 @cloudflare/next-on-pages 适配
  output: process.env.CF_PAGES ? undefined : undefined, // 不强制 output，让适配器处理
  
  // 代码分割和按需加载优化
  webpack: (config, { isServer }) => {
    // 处理 Node.js 内置模块（用于 Cloudflare Pages 兼容）
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'async_hooks': false,
        'fs': false,
        'net': false,
        'tls': false,
        'crypto': false,
        'stream': false,
        'url': false,
        'zlib': false,
        'http': false,
        'https': false,
        'assert': false,
        'os': false,
        'path': false,
      };
    }
    
    // 生产环境优化
    if (!isServer) {
      // 代码分割：将大型依赖拆分为独立 chunk
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // React 相关库单独打包
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: 'react',
              priority: 20,
            },
            // Next.js 相关库单独打包
            nextjs: {
              test: /[\\/]node_modules[\\/](next)[\\/]/,
              name: 'nextjs',
              priority: 20,
            },
            // 其他第三方库
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 10,
              minSize: 0,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // 生产环境优化
  productionBrowserSourceMaps: false, // 禁用源码映射以减小体积
  
  // 实验性功能：优化包大小
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  
};

export default nextConfig;
