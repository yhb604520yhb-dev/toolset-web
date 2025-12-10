import { defineConfig } from "@opennextjs/cloudflare";

export default defineConfig({
  default: {
    wrapper: "cloudflare-node",
    converter: "edge",
    incrementalCache: "dummy",
    tagCache: "dummy",
  },
});

