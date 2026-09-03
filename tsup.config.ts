import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    core: "src/core/index.ts",
    "react-router": "src/react-router.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // The consumer's Tailwind scans dist for utility classes; minification would
  // still keep class strings intact, but readable output is easier to debug.
  minify: false,
});
