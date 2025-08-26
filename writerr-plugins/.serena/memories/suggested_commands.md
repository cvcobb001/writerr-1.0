# Essential Commands

**Build Commands**:
- `npm run build:all` - Build all plugins
- `npm run build:writerr-chat` - Build chat plugin specifically
- `npm run build:prod:all` - Production build all plugins
- `npm run clean` - Clean compiled files

**Development**:
- `npm run typecheck` - Type checking
- `npm run lint` - ESLint checking
- `npm run test` - Build and test all plugins
- `npm run validate` - Validate plugins

**Individual Plugin Builds**:
- Track edits: `esbuild plugins/track-edits/src/main.ts --bundle --external:obsidian --external:@codemirror/state --external:@codemirror/view --outfile=plugins/track-edits/main.js --format=cjs --target=es2018 --sourcemap`
- Writerr Chat: `esbuild plugins/writerr-chat/src/main.ts --bundle --external:obsidian --outfile=plugins/writerr-chat/main.js --format=cjs --target=es2018 --sourcemap`