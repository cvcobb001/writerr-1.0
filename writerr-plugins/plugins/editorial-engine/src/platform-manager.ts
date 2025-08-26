// Platform Manager for Global API Registration
import { WritterrPlatformAPI } from '@shared/types';

interface PluginInfo {
  version: string;
  loaded: boolean;
  api?: any;
}

export class PlatformManager {
  private static instance?: PlatformManager;
  private plugins: Map<string, any> = new Map();
  
  static getInstance(): PlatformManager {
    if (!PlatformManager.instance) {
      PlatformManager.instance = new PlatformManager();
    }
    return PlatformManager.instance;
  }

  registerPlugin(name: string, plugin: any, api: any): void {
    this.plugins.set(name, { plugin, api });
    
    // Update or create global platform object
    const platform = this.getPlatform();
    (platform as any)[name] = api;
    
    // Update plugin info
    if (plugin.manifest) {
      platform.plugins[name as keyof typeof platform.plugins] = {
        version: plugin.manifest.version,
        loaded: true,
        api
      };
    }
    
    console.log(`Registered ${name} plugin with platform API`);
  }

  unregisterPlugin(name: string): void {
    if (this.plugins.has(name)) {
      this.plugins.delete(name);
      
      const platform = this.getPlatform();
      delete (platform as any)[name];
      
      if (platform.plugins[name as keyof typeof platform.plugins]) {
        platform.plugins[name as keyof typeof platform.plugins] = {
          version: '',
          loaded: false
        };
      }
      
      console.log(`Unregistered ${name} plugin from platform API`);
    }
  }

  getPlatform(): WritterrPlatformAPI {
    if (!window.Writerr) {
      this.createPlatform();
    }
    return window.Writerr as WritterrPlatformAPI;
  }

  getPlugin(name: string): any {
    return this.plugins.get(name);
  }

  isPluginRegistered(name: string): boolean {
    return this.plugins.has(name);
  }

  getAllPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  private createPlatform(): void {
    const platform: WritterrPlatformAPI = {
      version: '1.0.0',
      plugins: {}
    };

    (window as any).Writerr = platform;
    
    console.log('Created Writerr platform object');
  }

  // Utility methods for cross-plugin communication
  async waitForPlugin(name: string, timeout: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkPlugin = () => {
        const plugin = this.plugins.get(name);
        if (plugin) {
          resolve(plugin.api);
          return;
        }
        
        // Check again in 100ms
        setTimeout(checkPlugin, 100);
      };
      
      // Set timeout
      setTimeout(() => {
        reject(new Error(`Plugin ${name} not registered within ${timeout}ms`));
      }, timeout);
      
      checkPlugin();
    });
  }

  notifyPluginReady(name: string): void {
    const platform = this.getPlatform();
    
    // Emit event if event bus is available
    if (platform.events && typeof platform.events.emit === 'function') {
      platform.events.emit('plugin-ready', { name });
    }
  }
}

// Global declaration is already handled in shared types