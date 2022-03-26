import { babel } from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

export default {
  input: "main.js",
  output: {
    file: "dist/main.o.js",
    sourcemap: true,
    format: "iife",
  },
  plugins: [
    replace({
      "process.env.NODE_ENV": JSON.stringify("development"),
      preventAssignment: true,
    }),
    babel({ exclude: "node_modules/**", babelHelpers: "bundled" }),
    nodeResolve({ browser: true }),
    commonjs(),
  ],
};
