import { obsidianPluginConfig } from '../../rollup.config.shared.js';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/main.ts',
  ...obsidianPluginConfig,
  external: [...obsidianPluginConfig.external, '@writerr/shared', 'react', 'react-dom'],
  plugins: [
    ...obsidianPluginConfig.plugins,
    copy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'src/ui/styles.css', dest: '.', rename: 'styles.css' }
      ],
      hook: 'writeBundle'
    })
  ],
  output: {
    ...obsidianPluginConfig.output,
    file: 'main.js'
  }
};