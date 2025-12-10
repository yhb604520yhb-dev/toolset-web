import { defineConfig } from "@opennextjs/cloudflare";

export default defineConfig({
  // OpenNext Cloudflare 配置
  buildCommand: "npm run build",
  packageJsonPath: "./package.json",
  openNextConfig: {
    default: {
      override: {
        wrapper: "cloudflare-node",
        converter: "aws-apigw-v2",
        incrementalCache: "s3-lite",
        queue: "sqs-lite",
        tagCache: "dummy",
      },
    },
  },
});

