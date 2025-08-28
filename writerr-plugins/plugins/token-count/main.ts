import { Plugin } from 'obsidian';
import { TokenCalculator } from './src/TokenCalculator';
import { TokenLimitService } from './src/TokenLimitService';
import { TokenAPIService } from './src/TokenAPIService';
import { TokenCountSettings, DEFAULT_SETTINGS, TokenCountSettingTab } from './src/settings';

export default class TokenCountPlugin extends Plugin {
  settings: TokenCountSettings;
  tokenCalculator: TokenCalculator;
  tokenLimitService: TokenLimitService;
  api: TokenAPIService;
  
  async onload() {
    // Load settings
    await this.loadSettings();

    if (this.settings.enableDebugLogs) {
      console.log('🔢 Loading Token Count plugin...');
    }

    // Initialize core services
    this.tokenCalculator = new TokenCalculator();
    this.tokenLimitService = new TokenLimitService(this.settings);
    
    // Initialize external data
    try {
      await this.tokenLimitService.initialize();
    } catch (error) {
      if (this.settings.enableDebugLogs) {
        console.warn('Token Count: Failed to load model data:', error);
      }
    }

    // Setup public API (pure service - no UI commands)
    this.api = new TokenAPIService(this.tokenCalculator, this.tokenLimitService);
    
    // Add settings tab
    this.addSettingTab(new TokenCountSettingTab(this.app, this));

    if (this.settings.enableDebugLogs) {
      console.log('✅ Token Count plugin loaded successfully');
      
      // Log cache info in debug mode
      const cacheInfo = this.api.getCacheInfo();
      console.log(`📊 Token Count: ${cacheInfo.modelCount} models loaded, expires: ${cacheInfo.expiresAt.toLocaleString()}`);
    }
  }

  onunload() {
    if (this.settings.enableDebugLogs) {
      console.log('🔢 Token Count plugin unloaded');
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update services when settings change
    if (this.tokenLimitService) {
      this.tokenLimitService.updateSettings(this.settings);
    }
  }
}