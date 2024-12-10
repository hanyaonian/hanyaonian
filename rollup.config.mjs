import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";

/** @type {import('rollup').RollupOptions} */
export default {
  input: "src/index.ts",
  output: {
    file: "dist/index.mjs",
    format: "es",
  },
  // https://github.com/vitejs/vite/issues/11657
  preserveSymlinks: true,
  external: ["@octokit/core", "git-url-parse", "@actions/core"],
  plugins: [typescript(), nodeResolve({})],
};
