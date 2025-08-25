import { obsidianPluginConfig } from '../../rollup.config.shared.js';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/main.ts',
  ...obsidianPluginConfig,
  external: [...obsidianPluginConfig.external, '@writerr/shared'],
  plugins: [
    ...obsidianPluginConfig.plugins,
    copy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'styles.css', dest: '.' }
      ],
      hook: 'writeBundle'
    })
  ],
  output: {
    ...obsidianPluginConfig.output,
    file: 'main.js'
  }
};