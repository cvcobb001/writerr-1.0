const { build } = require('esbuild');
const builtinModules = require('module').builtinModules || [];

const baseConfig = {
  platform: 'node',
  target: 'es2018',
  format: 'cjs',
  external: [
    'obsidian',
    'electron',
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
    '@lezer/lr',
    ...builtinModules
  ],
  bundle: true,
  sourcemap: true
};

async function buildPlugin(pluginName, options = {}) {
  const config = {
    ...baseConfig,
    entryPoints: [`plugins/${pluginName}/src/main.ts`],
    outfile: `plugins/${pluginName}/main.js`,
    ...options
  };

  try {
    await build(config);
    console.log(`✅ Built ${pluginName} plugin`);
  } catch (error) {
    console.error(`❌ Failed to build ${pluginName} plugin:`, error);
    process.exit(1);
  }
}

async function buildAll(production = false) {
  const options = production ? { minify: true, sourcemap: false } : {};
  
  console.log(`Building all plugins${production ? ' (production)' : ''}...`);
  
  await Promise.all([
    buildPlugin('track-edits', options),
    buildPlugin('writerr-chat', options),
    buildPlugin('ai-editorial-functions', options)
  ]);
  
  console.log('🎉 All plugins built successfully!');
}

module.exports = { buildPlugin, buildAll, baseConfig };