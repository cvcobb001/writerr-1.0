import { obsidianPluginConfig } from '../../rollup.config.shared.js';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/main.ts',
  external: [...obsidianPluginConfig.external, '@writerr/shared', 'react', 'react-dom'],
  plugins: [
    ...obsidianPluginConfig.plugins,
    copy({
      targets: [
        { src: 'src/ui/styles.css', dest: '.', rename: 'styles.css' }
      ],
      hook: 'writeBundle'
    })
  ],
  output: {
    file: 'main.js',
    sourcemap: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
    format: 'cjs',
    exports: 'default'
  }
};