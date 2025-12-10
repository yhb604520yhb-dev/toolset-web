// OpenNext Cloudflare 配置文件
export default {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "aws-apigw-v2",
      incrementalCache: "s3-lite",
      queue: "sqs-lite",
      tagCache: "dummy",
    },
  },
};

