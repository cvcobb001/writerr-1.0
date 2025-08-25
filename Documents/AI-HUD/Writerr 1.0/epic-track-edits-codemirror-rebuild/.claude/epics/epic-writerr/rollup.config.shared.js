import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export const sharedPlugins = [
  nodeResolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
    sourceMap: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
    inlineSources: !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
  })
];

export const sharedExternal = [
  'obsidian',
  '@codemirror/autocomplete',
  '@codemirror/collab',
  '@codemirror/commands',
  '@codemirror/language',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/lr'
];

export const obsidianPluginConfig = {
  plugins: sharedPlugins,
  external: sharedExternal,
  output: {
    dir: '.',
    sourcemap: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
    format: 'cjs',
    exports: 'default'
  }
};