import { Plugin, Editor, MarkdownView, Modal, Notice, Menu } from 'obsidian';
import { AIEditorialFunctionsSettingsTab } from './settings';
import { FunctionManager } from './function-manager';
import { ModeManager } from './mode-manager';
import { EditorialFunction, WritingMode, WriterrlGlobalAPI } from '@shared/types';

interface AIEditorialFunctionsSettings {
  currentMode: string;
  enableQuickAccess: boolean;
  showCategoryIcons: boolean;
  autoApplyFormatting: boolean;
  confirmBeforeApply: boolean;
  customFunctions: EditorialFunction[];
  customModes: WritingMode[];
}

const DEFAULT_SETTINGS: AIEditorialFunctionsSettings = {
  currentMode: 'general',
  enableQuickAccess: true,
  showCategoryIcons: true,
  autoApplyFormatting: true,
  confirmBeforeApply: true,
  customFunctions: [],
  customModes: []
};

export default class AIEditorialFunctionsPlugin extends Plugin {
  settings: AIEditorialFunctionsSettings;
  functionManager: FunctionManager;
  modeManager: ModeManager;
  statusBarItem: HTMLElement;

  async onload() {
    await this.loadSettings();

    this.functionManager = new FunctionManager(this);
    this.modeManager = new ModeManager(this);

    // Initialize global API
    this.initializeGlobalAPI();

    // Add commands
    this.addCommands();

    // Add context menu items
    this.registerContextMenus();

    // Add ribbon icon with menu
    this.addRibbonIcon('wand-2', 'AI Editorial Functions', (event) => {
      this.showFunctionMenu(event);
    });

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();

    // Add settings tab
    this.addSettingTab(new AIEditorialFunctionsSettingsTab(this.app, this));

    console.log('AI Editorial Functions plugin loaded');
  }

  onunload() {
    this.cleanupGlobalAPI();
    console.log('AI Editorial Functions plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateStatusBar();
  }

  private initializeGlobalAPI() {
    if (!window.WriterrlAPI) {
      window.WriterrlAPI = {} as WriterrlGlobalAPI;
    }

    window.WriterrlAPI.editorialFunctions = {
      getFunctions: (category?: string) => this.functionManager.getFunctions(category),
      executeFunction: (functionId: string, text: string, parameters?: Record<string, any>) => 
        this.functionManager.executeFunction(functionId, text, parameters),
      getModes: (category?: string) => this.modeManager.getModes(category),
      setMode: (modeId: string) => this.setMode(modeId)
    };
  }

  private cleanupGlobalAPI() {
    if (window.WriterrlAPI && window.WriterrlAPI.editorialFunctions) {
      delete window.WriterrlAPI.editorialFunctions;
    }
  }

  private addCommands() {
    // Mode switching commands
    this.addCommand({
      id: 'switch-to-academic-mode',
      name: 'Switch to Academic Writing Mode',
      callback: () => this.setMode('academic')
    });

    this.addCommand({
      id: 'switch-to-business-mode',
      name: 'Switch to Business Writing Mode',
      callback: () => this.setMode('business')
    });

    this.addCommand({
      id: 'switch-to-fiction-mode',
      name: 'Switch to Fiction Writing Mode',
      callback: () => this.setMode('fiction')
    });

    this.addCommand({
      id: 'switch-to-technical-mode',
      name: 'Switch to Technical Writing Mode',
      callback: () => this.setMode('technical')
    });

    // Function execution commands
    this.addCommand({
      id: 'show-function-menu',
      name: 'Show editorial functions menu',
      editorCallback: (editor, view) => {
        this.showFunctionMenu();
      }
    });

    this.addCommand({
      id: 'quick-edit-selection',
      name: 'Quick edit selected text',
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (selection) {
          this.showQuickEditModal(selection, editor);
        } else {
          new Notice('No text selected');
        }
      }
    });

    // Specific function commands (most common ones)
    this.addCommand({
      id: 'improve-clarity',
      name: 'Improve clarity of selected text',
      editorCallback: (editor) => this.executeQuickFunction('improve-clarity', editor)
    });

    this.addCommand({
      id: 'fix-grammar',
      name: 'Fix grammar of selected text',
      editorCallback: (editor) => this.executeQuickFunction('fix-grammar', editor)
    });

    this.addCommand({
      id: 'enhance-style',
      name: 'Enhance writing style of selected text',
      editorCallback: (editor) => this.executeQuickFunction('enhance-style', editor)
    });

    this.addCommand({
      id: 'summarize-text',
      name: 'Summarize selected text',
      editorCallback: (editor) => this.executeQuickFunction('summarize', editor)
    });
  }

  private registerContextMenus() {
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
        const selection = editor.getSelection();
        if (selection) {
          menu.addSeparator();
          
          const submenu = menu.addItem((item) => {
            item.setTitle('AI Editorial Functions');
            item.setIcon('wand-2');
          });

          // Add quick functions to context menu
          const quickFunctions = [
            { id: 'improve-clarity', title: 'Improve Clarity' },
            { id: 'fix-grammar', title: 'Fix Grammar' },
            { id: 'enhance-style', title: 'Enhance Style' },
            { id: 'summarize', title: 'Summarize' }
          ];

          for (const func of quickFunctions) {
            submenu.addItem((item) => {
              item.setTitle(func.title);
              item.onClick(() => this.executeQuickFunction(func.id, editor));
            });
          }

          submenu.addSeparator();
          submenu.addItem((item) => {
            item.setTitle('More Functions...');
            item.onClick(() => this.showFunctionMenu());
          });
        }
      })
    );
  }

  private async executeQuickFunction(functionId: string, editor: Editor) {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice('No text selected');
      return;
    }

    try {
      const result = await this.functionManager.executeFunction(functionId, selection);
      if (this.settings.confirmBeforeApply) {
        this.showResultModal(selection, result, editor);
      } else {
        editor.replaceSelection(result);
        new Notice('Text updated');
      }
    } catch (error) {
      new Notice(`Error: ${error.message}`);
    }
  }

  private showFunctionMenu(event?: MouseEvent) {
    const modal = new FunctionMenuModal(this.app, this, (functionId: string) => {
      const editor = this.getActiveEditor();
      if (editor) {
        this.executeQuickFunction(functionId, editor);
      }
    });
    modal.open();
  }

  private showQuickEditModal(selectedText: string, editor: Editor) {
    const modal = new QuickEditModal(this.app, selectedText, async (prompt: string) => {
      try {
        const result = await this.functionManager.executeCustomPrompt(selectedText, prompt);
        if (this.settings.confirmBeforeApply) {
          this.showResultModal(selectedText, result, editor);
        } else {
          editor.replaceSelection(result);
          new Notice('Text updated');
        }
      } catch (error) {
        new Notice(`Error: ${error.message}`);
      }
    });
    modal.open();
  }

  private showResultModal(originalText: string, editedText: string, editor: Editor) {
    const modal = new ResultPreviewModal(this.app, originalText, editedText, (accept: boolean) => {
      if (accept) {
        editor.replaceSelection(editedText);
        new Notice('Text updated');
      }
    });
    modal.open();
  }

  private getActiveEditor(): Editor | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view ? view.editor : null;
  }

  setMode(modeId: string) {
    this.settings.currentMode = modeId;
    this.saveSettings();
    new Notice(`Switched to ${modeId} writing mode`);
  }

  getCurrentMode(): WritingMode | null {
    return this.modeManager.getMode(this.settings.currentMode);
  }

  private updateStatusBar() {
    const currentMode = this.getCurrentMode();
    if (currentMode) {
      this.statusBarItem.setText(`📝 ${currentMode.name}`);
      this.statusBarItem.title = `Current writing mode: ${currentMode.description}`;
    } else {
      this.statusBarItem.setText('📝 General');
      this.statusBarItem.title = 'No specific writing mode selected';
    }
  }
}

class FunctionMenuModal extends Modal {
  plugin: AIEditorialFunctionsPlugin;
  onSelect: (functionId: string) => void;

  constructor(app: any, plugin: AIEditorialFunctionsPlugin, onSelect: (functionId: string) => void) {
    super(app);
    this.plugin = plugin;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'AI Editorial Functions' });

    const functions = this.plugin.functionManager.getFunctions();
    const categories = ['academic', 'business', 'fiction', 'technical'];

    for (const category of categories) {
      const categoryFunctions = functions.filter(f => f.category === category);
      if (categoryFunctions.length === 0) continue;

      const categoryEl = contentEl.createEl('div', { cls: 'function-category' });
      categoryEl.createEl('h3', { text: category.charAt(0).toUpperCase() + category.slice(1) });

      for (const func of categoryFunctions) {
        const functionEl = categoryEl.createEl('div', { cls: 'function-item' });
        functionEl.style.cssText = `
          padding: 8px 12px;
          margin: 2px 0;
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        `;

        functionEl.createEl('strong', { text: func.name });
        functionEl.createEl('div', { text: func.description, cls: 'function-description' });

        functionEl.addEventListener('click', () => {
          this.onSelect(func.id);
          this.close();
        });

        functionEl.addEventListener('mouseenter', () => {
          functionEl.style.backgroundColor = 'var(--background-modifier-hover)';
        });

        functionEl.addEventListener('mouseleave', () => {
          functionEl.style.backgroundColor = '';
        });
      }
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class QuickEditModal extends Modal {
  selectedText: string;
  onSubmit: (prompt: string) => Promise<void>;

  constructor(app: any, selectedText: string, onSubmit: (prompt: string) => Promise<void>) {
    super(app);
    this.selectedText = selectedText;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Quick Edit with Custom Prompt' });

    const previewEl = contentEl.createEl('div', { cls: 'selected-text-preview' });
    previewEl.style.cssText = `
      background: var(--background-secondary);
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      max-height: 150px;
      overflow-y: auto;
    `;
    previewEl.textContent = this.selectedText;

    const promptInput = contentEl.createEl('textarea', {
      attr: { 
        placeholder: 'Enter your editing instructions (e.g., "Make this more formal", "Simplify the language", "Add more details")',
        rows: '3'
      }
    });
    promptInput.style.cssText = `
      width: 100%;
      margin: 10px 0;
      padding: 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
    `;

    const buttonContainer = contentEl.createEl('div', { cls: 'button-container' });
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 15px;
    `;

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.onclick = () => this.close();

    const submitButton = buttonContainer.createEl('button', { text: 'Apply Edit' });
    submitButton.style.cssText = `
      background: var(--interactive-accent);
      color: var(--text-on-accent);
    `;
    submitButton.onclick = async () => {
      const prompt = promptInput.value.trim();
      if (prompt) {
        this.close();
        await this.onSubmit(prompt);
      }
    };

    promptInput.focus();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class ResultPreviewModal extends Modal {
  originalText: string;
  editedText: string;
  onDecision: (accept: boolean) => void;

  constructor(app: any, originalText: string, editedText: string, onDecision: (accept: boolean) => void) {
    super(app);
    this.originalText = originalText;
    this.editedText = editedText;
    this.onDecision = onDecision;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Preview Changes' });

    const container = contentEl.createEl('div', { cls: 'diff-container' });
    container.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 15px 0;
    `;

    // Original text
    const originalContainer = container.createEl('div');
    originalContainer.createEl('h3', { text: 'Original' });
    const originalEl = originalContainer.createEl('div', { cls: 'text-preview original' });
    originalEl.style.cssText = `
      background: var(--background-secondary);
      padding: 15px;
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;
      border: 2px solid var(--background-modifier-error);
    `;
    originalEl.textContent = this.originalText;

    // Edited text
    const editedContainer = container.createEl('div');
    editedContainer.createEl('h3', { text: 'Edited' });
    const editedEl = editedContainer.createEl('div', { cls: 'text-preview edited' });
    editedEl.style.cssText = `
      background: var(--background-secondary);
      padding: 15px;
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;
      border: 2px solid var(--background-modifier-success);
    `;
    editedEl.textContent = this.editedText;

    // Buttons
    const buttonContainer = contentEl.createEl('div', { cls: 'button-container' });
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    `;

    const rejectButton = buttonContainer.createEl('button', { text: 'Keep Original' });
    rejectButton.onclick = () => {
      this.onDecision(false);
      this.close();
    };

    const acceptButton = buttonContainer.createEl('button', { text: 'Apply Changes' });
    acceptButton.style.cssText = `
      background: var(--interactive-accent);
      color: var(--text-on-accent);
    `;
    acceptButton.onclick = () => {
      this.onDecision(true);
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}