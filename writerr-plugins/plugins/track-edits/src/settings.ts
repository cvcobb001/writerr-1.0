import { App, PluginSettingTab, Setting } from 'obsidian';
import TrackEditsPlugin from './main';

export class TrackEditsSettingsTab extends PluginSettingTab {
  plugin: TrackEditsPlugin;

  constructor(app: App, plugin: TrackEditsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Track Edits Settings' });

    new Setting(containerEl)
      .setName('Enable tracking')
      .setDesc('Automatically track edits when documents are modified')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableTracking)
        .onChange(async (value) => {
          this.plugin.settings.enableTracking = value;
          await this.plugin.saveSettings();
          if (value) {
            this.plugin.startTracking();
          } else {
            this.plugin.stopTracking();
          }
        }));

    new Setting(containerEl)
      .setName('Show line numbers')
      .setDesc('Display line numbers in the editor')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showLineNumbers)
        .onChange(async (value) => {
          this.plugin.settings.showLineNumbers = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Highlight changes')
      .setDesc('Visually highlight recent changes in the editor')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.highlightChanges)
        .onChange(async (value) => {
          this.plugin.settings.highlightChanges = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Data retention')
      .setDesc('Number of days to keep edit history (0 = keep forever)')
      .addSlider(slider => slider
        .setLimits(0, 365, 1)
        .setValue(this.plugin.settings.retentionDays)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.retentionDays = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Color scheme')
      .setDesc('Choose the color scheme for change highlighting')
      .addDropdown(dropdown => dropdown
        .addOption('default', 'Default')
        .addOption('colorblind', 'Colorblind friendly')
        .addOption('dark', 'Dark theme optimized')
        .setValue(this.plugin.settings.colorScheme)
        .onChange(async (value: 'default' | 'colorblind' | 'dark') => {
          this.plugin.settings.colorScheme = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auto-save sessions')
      .setDesc('Automatically save edit sessions as they occur')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSave)
        .onChange(async (value) => {
          this.plugin.settings.autoSave = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Export format')
      .setDesc('Default format for exporting edit sessions')
      .addDropdown(dropdown => dropdown
        .addOption('json', 'JSON')
        .addOption('csv', 'CSV')
        .addOption('markdown', 'Markdown')
        .setValue(this.plugin.settings.exportFormat)
        .onChange(async (value: 'json' | 'csv' | 'markdown') => {
          this.plugin.settings.exportFormat = value;
          await this.plugin.saveSettings();
        }));

    // Event Bus Integration section
    containerEl.createEl('h3', { text: 'Event Bus Integration' });

    new Setting(containerEl)
      .setName('Enable event bus')
      .setDesc('Enable cross-plugin coordination through the Writerr event bus')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableEventBus)
        .onChange(async (value) => {
          this.plugin.settings.enableEventBus = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Event bus debug mode')
      .setDesc('Enable debug logging for event bus operations')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.eventBusDebugMode)
        .onChange(async (value) => {
          this.plugin.settings.eventBusDebugMode = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Max reconnection attempts')
      .setDesc('Maximum number of reconnection attempts when event bus is unavailable')
      .addSlider(slider => slider
        .setLimits(1, 10, 1)
        .setValue(this.plugin.settings.eventBusMaxReconnectAttempts)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.eventBusMaxReconnectAttempts = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Reconnection delay')
      .setDesc('Delay between reconnection attempts (milliseconds)')
      .addSlider(slider => slider
        .setLimits(500, 5000, 100)
        .setValue(this.plugin.settings.eventBusReconnectDelay)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.eventBusReconnectDelay = value;
          await this.plugin.saveSettings();
        }));

    // Actions section
    containerEl.createEl('h3', { text: 'Actions' });

    new Setting(containerEl)
      .setName('Export current session')
      .setDesc('Export the current editing session')
      .addButton(button => button
        .setButtonText('Export')
        .setCta()
        .onClick(() => {
          if (this.plugin.currentSession) {
            this.plugin.exportSession(this.plugin.currentSession.id);
          }
        }));

    new Setting(containerEl)
      .setName('Clear all history')
      .setDesc('Delete all stored edit history (cannot be undone)')
      .addButton(button => button
        .setButtonText('Clear')
        .setWarning()
        .onClick(() => {
          this.plugin.clearEditHistory();
        }));
  }
}