import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    // examples/ imports the package by name, the way a consumer does. Without
    // these aliases Node's self-reference resolution sends those specifiers to
    // dist, which does not exist before the build step; they also keep the
    // example tests running against the live sources.
    alias: {
      "@qrotux/gridraw-shadcn-react/react-router": src("./src/react-router.ts"),
      "@qrotux/gridraw-shadcn-react/core": src("./src/core/index.ts"),
      "@qrotux/gridraw-shadcn-react": src("./src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
  },
});
