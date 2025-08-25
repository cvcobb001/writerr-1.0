import { App, PluginSettingTab, Setting } from 'obsidian';
import WriterrlChatPlugin from './main';
import { AIProvider } from '@shared/types';
import { generateId } from '@shared/utils';

export class WriterrlChatSettingsTab extends PluginSettingTab {
  plugin: WriterrlChatPlugin;

  constructor(app: App, plugin: WriterrlChatPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Writerr Chat Settings' });

    // AI Provider Settings
    containerEl.createEl('h3', { text: 'AI Provider Configuration' });

    new Setting(containerEl)
      .setName('Default provider')
      .setDesc('Select the default AI provider for chat')
      .addDropdown(dropdown => {
        for (const provider of this.plugin.settings.providers) {
          dropdown.addOption(provider.id, provider.name);
        }
        dropdown.setValue(this.plugin.settings.defaultProvider)
          .onChange(async (value) => {
            this.plugin.settings.defaultProvider = value;
            await this.plugin.saveSettings();
          });
      });

    // Provider management
    for (let i = 0; i < this.plugin.settings.providers.length; i++) {
      const provider = this.plugin.settings.providers[i];
      this.createProviderSetting(containerEl, provider, i);
    }

    new Setting(containerEl)
      .setName('Add new provider')
      .setDesc('Add a new AI provider')
      .addButton(button => button
        .setButtonText('Add Provider')
        .setCta()
        .onClick(() => {
          this.plugin.settings.providers.push({
            id: generateId(),
            name: 'New Provider',
            model: 'gpt-3.5-turbo',
            baseUrl: '',
            apiKey: ''
          });
          this.display(); // Refresh settings
        }));

    // Chat Interface Settings
    containerEl.createEl('h3', { text: 'Chat Interface' });

    new Setting(containerEl)
      .setName('Chat position')
      .setDesc('Choose where the chat panel appears')
      .addDropdown(dropdown => dropdown
        .addOption('right', 'Right sidebar')
        .addOption('left', 'Left sidebar')
        .addOption('floating', 'Floating window')
        .setValue(this.plugin.settings.chatPosition)
        .onChange(async (value: 'right' | 'left' | 'floating') => {
          this.plugin.settings.chatPosition = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Theme')
      .setDesc('Choose the chat interface theme')
      .addDropdown(dropdown => dropdown
        .addOption('default', 'Default')
        .addOption('compact', 'Compact')
        .addOption('minimal', 'Minimal')
        .setValue(this.plugin.settings.theme)
        .onChange(async (value: 'default' | 'compact' | 'minimal') => {
          this.plugin.settings.theme = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show timestamps')
      .setDesc('Display timestamps for chat messages')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showTimestamps)
        .onChange(async (value) => {
          this.plugin.settings.showTimestamps = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable markdown')
      .setDesc('Render markdown in chat messages')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableMarkdown)
        .onChange(async (value) => {
          this.plugin.settings.enableMarkdown = value;
          await this.plugin.saveSettings();
        }));

    // Behavior Settings
    containerEl.createEl('h3', { text: 'Behavior' });

    new Setting(containerEl)
      .setName('Auto-save chats')
      .setDesc('Automatically save chat sessions')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSaveChats)
        .onChange(async (value) => {
          this.plugin.settings.autoSaveChats = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Context lines')
      .setDesc('Number of lines to include as context from the current document')
      .addSlider(slider => slider
        .setLimits(0, 50, 1)
        .setValue(this.plugin.settings.contextLines)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.contextLines = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Max tokens')
      .setDesc('Maximum number of tokens for AI responses')
      .addSlider(slider => slider
        .setLimits(100, 4000, 100)
        .setValue(this.plugin.settings.maxTokens)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.maxTokens = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Temperature')
      .setDesc('Creativity level for AI responses (0 = focused, 1 = creative)')
      .addSlider(slider => slider
        .setLimits(0, 1, 0.1)
        .setValue(this.plugin.settings.temperature)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.temperature = value;
          await this.plugin.saveSettings();
        }));

    // Actions
    containerEl.createEl('h3', { text: 'Actions' });

    new Setting(containerEl)
      .setName('Clear all chat history')
      .setDesc('Delete all saved chat sessions (cannot be undone)')
      .addButton(button => button
        .setButtonText('Clear All')
        .setWarning()
        .onClick(() => {
          this.plugin.chatSessions.clear();
          this.plugin.currentSession = null;
          this.plugin.saveChatSessions();
        }));
  }

  private createProviderSetting(containerEl: HTMLElement, provider: AIProvider, index: number) {
    const providerContainer = containerEl.createDiv('provider-setting');
    providerContainer.createEl('h4', { text: provider.name });

    new Setting(providerContainer)
      .setName('Provider name')
      .addText(text => text
        .setValue(provider.name)
        .onChange(async (value) => {
          provider.name = value;
          await this.plugin.saveSettings();
        }));

    new Setting(providerContainer)
      .setName('Model')
      .addText(text => text
        .setValue(provider.model)
        .onChange(async (value) => {
          provider.model = value;
          await this.plugin.saveSettings();
        }));

    new Setting(providerContainer)
      .setName('Base URL')
      .addText(text => text
        .setValue(provider.baseUrl || '')
        .onChange(async (value) => {
          provider.baseUrl = value;
          await this.plugin.saveSettings();
        }));

    new Setting(providerContainer)
      .setName('API Key')
      .addText(text => {
        text.inputEl.type = 'password';
        text.setValue(provider.apiKey || '')
          .onChange(async (value) => {
            provider.apiKey = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(providerContainer)
      .addButton(button => button
        .setButtonText('Remove')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.providers.splice(index, 1);
          await this.plugin.saveSettings();
          this.display(); // Refresh settings
        }));
  }
}