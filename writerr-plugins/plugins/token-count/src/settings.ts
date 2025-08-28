import { App, PluginSettingTab, Setting } from 'obsidian';
import TokenCountPlugin from '../main';

export interface TokenCountSettings {
  enableExternalAPIs: boolean;
  apiEndpoint: string;
  cacheExpiration: number; // hours
  fallbackMode: 'unavailable' | 'basic-estimates';
  enableDebugLogs: boolean;
}

export const DEFAULT_SETTINGS: TokenCountSettings = {
  enableExternalAPIs: true,
  apiEndpoint: 'https://openrouter.ai/api/v1/models',
  cacheExpiration: 24,
  fallbackMode: 'unavailable',
  enableDebugLogs: false
};

export class TokenCountSettingTab extends PluginSettingTab {
  plugin: TokenCountPlugin;

  constructor(app: App, plugin: TokenCountPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Token Count Settings' });

    // External API toggle
    new Setting(containerEl)
      .setName('Enable external API calls')
      .setDesc('Allow fetching model data from external sources. Disable for privacy or offline use.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableExternalAPIs)
        .onChange(async (value) => {
          this.plugin.settings.enableExternalAPIs = value;
          await this.plugin.saveSettings();
          
          // Refresh display to show/hide API-related settings
          this.display();
        }));

    if (this.plugin.settings.enableExternalAPIs) {
      // API endpoint setting
      new Setting(containerEl)
        .setName('API endpoint')
        .setDesc('URL for fetching model token limits. Default: OpenRouter API')
        .addText(text => text
          .setPlaceholder('https://openrouter.ai/api/v1/models')
          .setValue(this.plugin.settings.apiEndpoint)
          .onChange(async (value) => {
            this.plugin.settings.apiEndpoint = value || DEFAULT_SETTINGS.apiEndpoint;
            await this.plugin.saveSettings();
          }));

      // Cache expiration
      new Setting(containerEl)
        .setName('Cache expiration')
        .setDesc('Hours to cache model data before refreshing')
        .addSlider(slider => slider
          .setLimits(1, 168, 1) // 1 hour to 1 week
          .setValue(this.plugin.settings.cacheExpiration)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.cacheExpiration = value;
            await this.plugin.saveSettings();
          }));
    }

    // Fallback mode
    new Setting(containerEl)
      .setName('Fallback mode')
      .setDesc('What to show when model token limits are unknown')
      .addDropdown(dropdown => dropdown
        .addOption('unavailable', 'Show "unavailable" (honest)')
        .addOption('basic-estimates', 'Show basic estimates (less accurate)')
        .setValue(this.plugin.settings.fallbackMode)
        .onChange(async (value: 'unavailable' | 'basic-estimates') => {
          this.plugin.settings.fallbackMode = value;
          await this.plugin.saveSettings();
        }));

    // Debug logs toggle
    new Setting(containerEl)
      .setName('Enable debug logging')
      .setDesc('Show detailed logs in developer console (for troubleshooting)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableDebugLogs)
        .onChange(async (value) => {
          this.plugin.settings.enableDebugLogs = value;
          await this.plugin.saveSettings();
        }));

    // Cache info section
    containerEl.createEl('h3', { text: 'Cache Status' });
    
    const cacheInfo = this.plugin.api?.getCacheInfo();
    if (cacheInfo) {
      const cacheDiv = containerEl.createEl('div', { cls: 'token-cache-info' });
      
      cacheDiv.createEl('p', { 
        text: `Models cached: ${cacheInfo.modelCount}` 
      });
      
      cacheDiv.createEl('p', { 
        text: `Cache expires: ${cacheInfo.expiresAt.toLocaleString()}` 
      });
      
      if (cacheInfo.isExpired) {
        cacheDiv.createEl('p', { 
          text: '⚠️ Cache is expired', 
          cls: 'token-cache-warning' 
        });
      }

      // Manual refresh button
      new Setting(containerEl)
        .setName('Refresh model data')
        .setDesc('Force refresh of model token limits from API')
        .addButton(button => button
          .setButtonText('Refresh Now')
          .onClick(async () => {
            if (this.plugin.api) {
              try {
                button.setButtonText('Refreshing...');
                button.setDisabled(true);
                
                await this.plugin.api.refreshModelData();
                
                // Refresh the display to show updated cache info
                this.display();
              } catch (error) {
                console.error('Failed to refresh model data:', error);
                button.setButtonText('Refresh Failed');
                setTimeout(() => {
                  button.setButtonText('Refresh Now');
                  button.setDisabled(false);
                }, 2000);
              }
            }
          }));
    }
  }
}