import { sharedPlugins } from '../../rollup.config.shared.js';

export default {
  input: 'src/index.ts',
  plugins: sharedPlugins,
  external: ['obsidian'],
  output: {
    dir: 'dist',
    format: 'es',
    sourcemap: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
    preserveModules: true,
    preserveModulesRoot: 'src'
  }
};