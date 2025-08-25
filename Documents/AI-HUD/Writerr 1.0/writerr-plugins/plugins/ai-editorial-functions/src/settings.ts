import { App, PluginSettingTab, Setting } from 'obsidian';
import AIEditorialFunctionsPlugin from './main';

export class AIEditorialFunctionsSettingsTab extends PluginSettingTab {
  plugin: AIEditorialFunctionsPlugin;

  constructor(app: App, plugin: AIEditorialFunctionsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'AI Editorial Functions Settings' });

    // Current Mode
    new Setting(containerEl)
      .setName('Current writing mode')
      .setDesc('Choose the active writing mode for context-aware functions')
      .addDropdown(dropdown => dropdown
        .addOption('general', 'General Writing')
        .addOption('academic', 'Academic Writing')
        .addOption('business', 'Business Writing')
        .addOption('fiction', 'Fiction Writing')
        .addOption('technical', 'Technical Writing')
        .setValue(this.plugin.settings.currentMode)
        .onChange(async (value) => {
          this.plugin.settings.currentMode = value;
          await this.plugin.saveSettings();
        }));

    // Interface Settings
    containerEl.createEl('h3', { text: 'Interface' });

    new Setting(containerEl)
      .setName('Enable quick access')
      .setDesc('Add editorial functions to the context menu when text is selected')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableQuickAccess)
        .onChange(async (value) => {
          this.plugin.settings.enableQuickAccess = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show category icons')
      .setDesc('Display category icons in function menus')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showCategoryIcons)
        .onChange(async (value) => {
          this.plugin.settings.showCategoryIcons = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Confirm before applying')
      .setDesc('Show a preview before applying editorial changes')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.confirmBeforeApply)
        .onChange(async (value) => {
          this.plugin.settings.confirmBeforeApply = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auto-apply formatting')
      .setDesc('Automatically apply basic formatting fixes (punctuation, spacing)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoApplyFormatting)
        .onChange(async (value) => {
          this.plugin.settings.autoApplyFormatting = value;
          await this.plugin.saveSettings();
        }));

    // Function Categories
    containerEl.createEl('h3', { text: 'Available Functions by Category' });

    const categories = [
      {
        name: 'Academic',
        key: 'academic',
        functions: [
          'Argument Structure Analysis',
          'Citation Formatting',
          'Thesis Statement Enhancement',
          'Academic Tone Adjustment',
          'Literature Review Synthesis'
        ]
      },
      {
        name: 'Business',
        key: 'business',
        functions: [
          'Executive Summary Creation',
          'Professional Tone Enhancement',
          'Action Item Extraction',
          'Meeting Notes Formatting',
          'Proposal Structure'
        ]
      },
      {
        name: 'Fiction',
        key: 'fiction',
        functions: [
          'Dialogue Enhancement',
          'Character Development',
          'Narrative Flow Improvement',
          'Setting Description',
          'Pacing Analysis'
        ]
      },
      {
        name: 'Technical',
        key: 'technical',
        functions: [
          'API Documentation',
          'Code Comment Enhancement',
          'Technical Specification',
          'Troubleshooting Guide',
          'User Manual Creation'
        ]
      }
    ];

    for (const category of categories) {
      const categoryEl = containerEl.createEl('div', { cls: 'function-category-info' });
      categoryEl.style.cssText = `
        margin: 15px 0;
        padding: 15px;
        background: var(--background-secondary);
        border-radius: 6px;
      `;

      categoryEl.createEl('h4', { text: category.name });
      
      const functionList = categoryEl.createEl('ul');
      functionList.style.cssText = `
        margin: 8px 0 0 20px;
        color: var(--text-muted);
      `;

      for (const func of category.functions) {
        functionList.createEl('li', { text: func });
      }
    }

    // Custom Functions (placeholder for future expansion)
    containerEl.createEl('h3', { text: 'Custom Functions' });
    
    const customFunctionsNote = containerEl.createEl('div', { cls: 'setting-note' });
    customFunctionsNote.style.cssText = `
      padding: 10px;
      background: var(--background-modifier-form-field);
      border-radius: 4px;
      font-style: italic;
      color: var(--text-muted);
    `;
    customFunctionsNote.textContent = 'Custom function creation will be available in a future update. Stay tuned!';

    // Usage Tips
    containerEl.createEl('h3', { text: 'Usage Tips' });
    
    const tipsContainer = containerEl.createEl('div', { cls: 'usage-tips' });
    tipsContainer.style.cssText = `
      background: var(--background-secondary);
      padding: 15px;
      border-radius: 6px;
      margin: 10px 0;
    `;

    const tips = [
      'Select text and right-click to access quick editorial functions',
      'Use Ctrl/Cmd + P to search for "editorial" commands',
      'Switch writing modes to get context-appropriate suggestions',
      'The status bar shows your current writing mode',
      'Use the ribbon icon to access all available functions'
    ];

    const tipsList = tipsContainer.createEl('ul');
    for (const tip of tips) {
      tipsList.createEl('li', { text: tip });
    }

    // Keyboard Shortcuts
    containerEl.createEl('h3', { text: 'Keyboard Shortcuts' });
    
    const shortcutsContainer = containerEl.createEl('div', { cls: 'keyboard-shortcuts' });
    shortcutsContainer.style.cssText = `
      background: var(--background-secondary);
      padding: 15px;
      border-radius: 6px;
      margin: 10px 0;
    `;

    const shortcuts = [
      { command: 'Quick edit selection', shortcut: 'Set in Hotkeys settings' },
      { command: 'Show function menu', shortcut: 'Set in Hotkeys settings' },
      { command: 'Improve clarity', shortcut: 'Set in Hotkeys settings' },
      { command: 'Fix grammar', shortcut: 'Set in Hotkeys settings' }
    ];

    const shortcutTable = shortcutsContainer.createEl('table');
    shortcutTable.style.cssText = `
      width: 100%;
      border-collapse: collapse;
    `;

    const headerRow = shortcutTable.createEl('tr');
    headerRow.createEl('th', { text: 'Command' }).style.cssText = 'text-align: left; padding: 8px; border-bottom: 1px solid var(--background-modifier-border);';
    headerRow.createEl('th', { text: 'Shortcut' }).style.cssText = 'text-align: left; padding: 8px; border-bottom: 1px solid var(--background-modifier-border);';

    for (const shortcut of shortcuts) {
      const row = shortcutTable.createEl('tr');
      row.createEl('td', { text: shortcut.command }).style.cssText = 'padding: 6px 8px;';
      row.createEl('td', { text: shortcut.shortcut }).style.cssText = 'padding: 6px 8px; color: var(--text-muted); font-style: italic;';
    }

    const shortcutsNote = shortcutsContainer.createEl('p', { 
      text: 'Go to Settings → Hotkeys and search for "AI Editorial" to set custom keyboard shortcuts.' 
    });
    shortcutsNote.style.cssText = 'margin-top: 10px; font-size: 0.9em; color: var(--text-muted);';
  }
}