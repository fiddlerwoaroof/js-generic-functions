import babel from 'rollup-plugin-babel';
import npm_resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import livereload from 'rollup-plugin-livereload';

export default {
  input: 'main.js',
  output: {
    file: 'main.o.js',
    browser: true,
    sourcemap: true,
  format: 'iife',
  },
  plugins: [
    replace({'process.env.NODE_ENV': JSON.stringify('development')}),
    babel({ exclude: 'node_modules/**' }),
    npm_resolve({ module: true, jsnext: true, main: true, browser: true }),
    commonjs(),
    livereload(),
  ]
};