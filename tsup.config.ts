import { defineConfig } from "tsup";

// CJS 単一バンドルを出力する。依存をすべてインライン化することで
// @yao-pkg/pkg で standalone exe をビルドできる状態にする。
export default defineConfig({
  entry: [
    "src/cli/main.ts",
    "src/mcp/server.ts",
    "src/webhook/server.ts",
  ],
  format: ["cjs"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  noExternal: [/.*/],
  outExtension: () => ({ js: ".cjs" }),
});
