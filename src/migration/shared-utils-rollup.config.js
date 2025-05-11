/**
 * Rollup configuration for bundling shared utilities
 */
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import path from 'path';

export default {
  input: 'src/migration/umd-wrapper.ts',
  output: {
    file: 'frontend/js/shared-utils.js',
    format: 'umd',
    name: 'SharedUtils',
    sourcemap: true,
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
    }),
    resolve(),
    commonjs(),
    terser(),
  ],
};
