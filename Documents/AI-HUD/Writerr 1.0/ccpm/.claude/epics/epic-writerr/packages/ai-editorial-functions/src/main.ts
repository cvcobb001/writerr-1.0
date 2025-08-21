import { Plugin } from 'obsidian';
import { globalRegistry, globalEventBus } from '@writerr/shared';

export default class AIEditorialFunctionsPlugin extends Plugin {
  async onload() {
    console.log('Loading AI Editorial Functions plugin');
    
    // Register plugin capabilities
    globalRegistry.register({
      id: 'ai-editorial-functions',
      name: 'AI Editorial Functions',
      version: '1.0.0',
      capabilities: ['ai-editing', 'grammar-check', 'style-improvement', 'content-generation']
    });
    
    // Listen for relevant events
    globalEventBus.on('edit-request', (event) => {
      console.log('Edit request received:', event);
    });
  }

  onunload() {
    console.log('Unloading AI Editorial Functions plugin');
    globalRegistry.unregister('ai-editorial-functions');
  }
}