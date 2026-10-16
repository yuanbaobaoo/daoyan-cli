import { defineConfig } from "tsup";

// 单文件打包：dist/cli.mjs 由两个 bin（daoyan / dycli）共享。
// banner 的 shebang 使其可直接执行；npm 安装 bin 时会自动加执行位。
export default defineConfig({
  entry: ["src/cli.mts"],
  outDir: "dist",
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: true,
  sourcemap: true,
  // tsup 默认把 .mts 入口输出为 .js；显式指定 .mjs 以对齐 package.json 的 bin。
  outExtension: () => ({ js: ".mjs" }),
  banner: { js: "#!/usr/bin/env node" },
});
