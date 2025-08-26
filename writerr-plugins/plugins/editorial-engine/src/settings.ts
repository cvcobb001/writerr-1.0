import { App, PluginSettingTab, Setting } from 'obsidian';
import EditorialEnginePlugin from './main';
import { EditorialEngineSettings } from './types';

export const DEFAULT_SETTINGS: EditorialEngineSettings = {
  version: '1.0.0',
  enabledModes: ['proofreader', 'copy-editor', 'developmental-editor'],
  defaultMode: 'proofreader',
  constraintValidation: {
    strictMode: true,
    maxProcessingTime: 10000, // 10 seconds
    memoryLimits: {
      maxRulesetSize: 1000,
      maxConcurrentJobs: 3
    }
  },
  adapters: {
    'track-edits': {
      enabled: true,
      config: {
        batchSize: 10,
        timeout: 5000
      },
      priority: 1
    }
  },
  performance: {
    enableCaching: true,
    cacheSize: 100,
    backgroundProcessing: true
  }
};

export class EditorialEngineSettingsTab extends PluginSettingTab {
  plugin: EditorialEnginePlugin;

  constructor(app: App, plugin: EditorialEnginePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async display(): Promise<void> {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Editorial Engine Settings' });

    // General Settings
    this.createGeneralSettings(containerEl);
    
    // Mode Settings
    await this.createModeSettings(containerEl);
    
    // Adapter Settings
    this.createAdapterSettings(containerEl);
    
    // Performance Settings
    this.createPerformanceSettings(containerEl);
  }

  private createGeneralSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'General Settings' });

    // Get available modes dynamically
    const availableModes = this.plugin.modeRegistry.getAllModes();

    new Setting(containerEl)
      .setName('Default Mode')
      .setDesc('The default editing mode to use when no specific mode is selected')
      .addDropdown(dropdown => {
        // Add dynamic modes to dropdown
        for (const mode of availableModes) {
          dropdown.addOption(mode.id, mode.name);
        }
        
        dropdown
          .setValue(this.plugin.settings.defaultMode)
          .onChange(async (value) => {
            this.plugin.settings.defaultMode = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Strict Mode')
      .setDesc('Enable strict constraint validation (recommended)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.constraintValidation.strictMode)
        .onChange(async (value) => {
          this.plugin.settings.constraintValidation.strictMode = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Max Processing Time')
      .setDesc('Maximum time (in seconds) to wait for processing completion')
      .addSlider(slider => slider
        .setLimits(5, 60, 5)
        .setValue(this.plugin.settings.constraintValidation.maxProcessingTime / 1000)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.constraintValidation.maxProcessingTime = value * 1000;
          await this.plugin.saveSettings();
        }));
  }

  private async createModeSettings(containerEl: HTMLElement): Promise<void> {
    containerEl.createEl('h3', { text: 'Mode Configuration' });

    const modesContainer = containerEl.createDiv('modes-container');
    modesContainer.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    `;

    // Add info about file-based mode system
    const infoEl = modesContainer.createEl('p', { 
      text: 'Modes are loaded from .obsidian/plugins/editorial-engine/modes/ folder. Add or edit .md files to create custom modes.',
      cls: 'setting-item-description'
    });
    infoEl.style.cssText = `
      color: var(--text-muted);
      font-size: 0.9em;
      margin-bottom: 15px;
      padding: 8px;
      background: var(--background-secondary);
      border-radius: 3px;
    `;

    const enabledModes = this.plugin.settings.enabledModes;
    
    // Get modes dynamically from the mode registry
    const availableModes = this.plugin.modeRegistry.getAllModes();
    
    if (availableModes.length === 0) {
      modesContainer.createEl('p', { 
        text: 'No modes found. Add mode files to .obsidian/plugins/editorial-engine/modes/ folder.',
        cls: 'setting-item-description'
      });
      return;
    }

    for (const mode of availableModes) {
      new Setting(modesContainer)
        .setName(mode.name)
        .setDesc(mode.description || `${mode.name} mode`)
        .addToggle(toggle => toggle
          .setValue(enabledModes.includes(mode.id))
          .onChange(async (value) => {
            if (value) {
              if (!enabledModes.includes(mode.id)) {
                enabledModes.push(mode.id);
              }
            } else {
              const index = enabledModes.indexOf(mode.id);
              if (index > -1) {
                enabledModes.splice(index, 1);
              }
            }
            await this.plugin.saveSettings();
          }));
    }
  }

  private createAdapterSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Adapter Configuration' });

    const adaptersContainer = containerEl.createDiv('adapters-container');
    adaptersContainer.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    `;

    // Track Edits Adapter
    const trackEditsConfig = this.plugin.settings.adapters['track-edits'];
    
    new Setting(adaptersContainer)
      .setName('Track Edits Integration')
      .setDesc('Enable integration with Track Edits plugin for change management')
      .addToggle(toggle => toggle
        .setValue(trackEditsConfig.enabled)
        .onChange(async (value) => {
          trackEditsConfig.enabled = value;
          await this.plugin.saveSettings();
        }));

    new Setting(adaptersContainer)
      .setName('Batch Size')
      .setDesc('Number of changes to batch together for Track Edits')
      .addSlider(slider => slider
        .setLimits(1, 50, 1)
        .setValue(trackEditsConfig.config.batchSize)
        .setDynamicTooltip()
        .onChange(async (value) => {
          trackEditsConfig.config.batchSize = value;
          await this.plugin.saveSettings();
        }));
  }

  private createPerformanceSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Performance Settings' });

    new Setting(containerEl)
      .setName('Enable Caching')
      .setDesc('Cache processing results to improve performance')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.performance.enableCaching)
        .onChange(async (value) => {
          this.plugin.settings.performance.enableCaching = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Cache Size')
      .setDesc('Maximum number of results to keep in cache')
      .addSlider(slider => slider
        .setLimits(10, 500, 10)
        .setValue(this.plugin.settings.performance.cacheSize)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.performance.cacheSize = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Background Processing')
      .setDesc('Process long-running tasks in the background')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.performance.backgroundProcessing)
        .onChange(async (value) => {
          this.plugin.settings.performance.backgroundProcessing = value;
          await this.plugin.saveSettings();
        }));

    // Performance monitoring display
    const performanceContainer = containerEl.createDiv('performance-monitor');
    performanceContainer.style.cssText = `
      background: var(--background-secondary);
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
    `;
    
    performanceContainer.createEl('h4', { text: 'Performance Metrics' });
    
    const metricsEl = performanceContainer.createDiv();
    this.updatePerformanceMetrics(metricsEl);
  }

  private updatePerformanceMetrics(container: HTMLElement): void {
    container.empty();
    
    const metrics = this.plugin.getPerformanceMetrics();
    
    if (metrics) {
      const metricsGrid = container.createDiv();
      metricsGrid.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 10px;
      `;
      
      const metricItems = [
        { label: 'Avg Processing Time', value: `${metrics.avgProcessingTime.toFixed(2)}ms` },
        { label: 'Success Rate', value: `${(metrics.successRate * 100).toFixed(1)}%` },
        { label: 'Total Requests', value: metrics.totalRequests.toString() },
        { label: 'Cache Hit Rate', value: `${(metrics.cacheHitRate * 100).toFixed(1)}%` }
      ];
      
      for (const item of metricItems) {
        const metricEl = metricsGrid.createDiv();
        metricEl.style.cssText = `
          padding: 8px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 3px;
        `;
        metricEl.createEl('div', { text: item.label, cls: 'metric-label' });
        const valueEl = metricEl.createEl('div', { text: item.value, cls: 'metric-value' });
        valueEl.style.fontWeight = 'bold';
      }
    } else {
      container.createEl('p', { text: 'No performance data available yet.' });
    }
  }
}