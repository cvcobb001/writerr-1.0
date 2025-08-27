import { BaseComponent, ComponentOptions } from './BaseComponent';
import { Icons, createStyledIcon } from '../utils/icons';

interface ChatToolbarOptions extends ComponentOptions {
  events: ChatToolbarEvents;
}

export interface ChatToolbarEvents {
  onAddDocument: () => void;
  onCopyChat: () => void;
  onClearChat: () => void;
  onModelChange: (model: string) => void;
  onPromptChange: (prompt: string) => void;
  onModelProviderReady?: () => void;
}

import { BaseComponent, ComponentOptions } from './BaseComponent';
import { Icons, createStyledIcon } from '../utils/icons';
import { WriterMenu, WriterMenuFactory } from './menus/WriterMenu';

interface ChatToolbarOptions extends ComponentOptions {
  events: ChatToolbarEvents;
}

export interface ChatToolbarEvents {
  onAddDocument: () => void;
  onCopyChat: () => void;
  onClearChat: () => void;
  onModelChange: (model: string) => void;
  onPromptChange: (prompt: string) => void;
  onModelProviderReady?: () => void;
}

export class ChatToolbar extends BaseComponent {
  private events: ChatToolbarEvents;
  private statusIndicator: HTMLElement;
  private modelSelect: HTMLSelectElement;
  private modelButton: HTMLButtonElement;
  private promptSelect: HTMLSelectElement;
  private tokenCounter: HTMLElement;

  constructor(options: ChatToolbarOptions) {
    super(options);
    this.events = options.events;
  }

  render(): void {
    this.createToolbarContainer();
    this.createLeftSection();
    this.createRightSection();
  }

  private createToolbarContainer(): void {
    this.container.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
      font-size: 12px;
      color: var(--text-muted);
      min-height: 44px;
      overflow: hidden;
    `;
  }

  private createLeftSection(): void {
    const leftContainer = this.createElement('div', {
      cls: 'writerr-toolbar-left',
      styles: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexShrink: '0'
      }
    });

    // Add document button - using centralized icon system
    this.createActionButton(leftContainer, 'Add document to chat', 
      createStyledIcon('filePlus2', 'toolbar'), 
      () => this.events.onAddDocument()
    );

    // Copy chat button - using centralized icon system
    this.createActionButton(leftContainer, 'Copy entire chat', 
      createStyledIcon('copy', 'toolbar'), 
      () => this.events.onCopyChat()
    );

    // Clear chat button - using centralized icon system
    this.createActionButton(leftContainer, 'Clear chat', 
      createStyledIcon('paintbrush', 'toolbar'), 
      () => this.events.onClearChat()
    );
  }

  private createRightSection(): void {
    const rightContainer = this.createElement('div', {
      cls: 'toolbar-right',
      styles: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flex: '1',
        justifyContent: 'flex-end',
        minWidth: '0',
        overflow: 'hidden'
      }
    });

    // Prompt dropdown FIRST (switched order)
    this.createPromptSelect(rightContainer);
    
    // Model dropdown SECOND (switched order) 
    this.createModelSelect(rightContainer);
    
    // Token counter
    this.createTokenCounter(rightContainer);
  }

  private createActionButton(parent: HTMLElement, tooltip: string, icon: string, onClick: () => void): void {
    const button = parent.createEl('button', { 
      cls: 'writerr-toolbar-button'
    });
    button.innerHTML = icon;
    button.onclick = onClick;
    
    // Add unified tooltip
    this.addTooltip(button, tooltip);
  }

  private createModelSelect(parent: HTMLElement): void {
    const modelContainer = parent.createDiv();
    modelContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      position: relative;
      flex-shrink: 1;
      min-width: 80px;
    `;

    // Status indicator dot
    this.statusIndicator = modelContainer.createEl('div', { cls: 'status-indicator' });
    this.updateStatusIndicator();

    // Create model button for WriterMenu
    const modelButton = modelContainer.createEl('button');
    modelButton.style.cssText = `
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 4px 16px 4px 4px !important;
      margin: 0 !important;
      font-size: 12px;
      color: var(--text-faint);
      cursor: pointer;
      outline: none;
      min-width: 0;
      max-width: 100px;
      width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    `;

    // Set initial button text
    modelButton.textContent = 'Select Model';

    // Add caret using centralized icon system
    const caret = modelContainer.createEl('div');
    caret.innerHTML = Icons.chevronDown({ width: 10, height: 10 });
    caret.style.cssText = `
      pointer-events: none;
      color: var(--text-faint);
      position: absolute;
      right: 2px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `;

    // Store button reference for updates
    this.modelButton = modelButton;

    // Set up click handler to show WriterMenu
    modelButton.addEventListener('click', (event) => {
      this.showModelMenu(event);
    });

    // Restore saved selection
    if (this.plugin.settings.selectedModel) {
      this.updateModelButtonText(this.plugin.settings.selectedModel);
    }
  }

  private showModelMenu(event: MouseEvent): void {
    try {
      // Get available providers and models using the working logic we already had
      const app = (window as any).app;
      const plugins = app?.plugins?.plugins;
      const aiProvidersPlugin = plugins?.['ai-providers'];
      
      if (!aiProvidersPlugin) {
        console.log('WriterMenu: No AI providers available');
        return;
      }

      const aiProviders = aiProvidersPlugin.aiProviders;
      if (!aiProviders?.providers) {
        console.log('WriterMenu: No providers array found');
        return;
      }

      // Build provider map with display names but keep IDs for selection
      const providerMap: Record<string, Record<string, string[]>> = {};
      const idToDisplayName: Record<string, string> = {};
      
      for (const provider of aiProviders.providers) {
        const providerId = provider.id || provider.name || provider.type || 'unknown';
        
        // Pass the full provider object to getProviderDisplayName for better inference
        const displayName = this.getProviderDisplayName(providerId, provider);
        
        // Store mapping
        idToDisplayName[providerId] = displayName;
        
        const models = provider.models || provider.availableModels || provider.supportedModels || [];
        
        if (models.length > 0) {
          const families = this.organizeModelsByFamily(models);
          if (Object.keys(families).length > 0) {
            providerMap[displayName] = families;
            console.log(`WriterMenu: Added provider "${displayName}" with ${models.length} models`);
          }
        }
      }

      if (Object.keys(providerMap).length === 0) {
        console.log('WriterMenu: No providers with models available');
        return;
      }

      // Create WriterMenu with provider → family → model hierarchy
      const menu = WriterMenuFactory.createModelMenu(
        providerMap,
        this.plugin.settings.selectedModel,
        (providerDisplayName: string, model: string) => {
          // Find the provider ID that corresponds to this display name
          const providerId = Object.keys(idToDisplayName).find(id => 
            idToDisplayName[id] === providerDisplayName
          ) || providerDisplayName;
          
          const selection = `${providerId}:${model}`;
          console.log(`WriterMenu: Selected ${providerDisplayName} - ${model} (${selection})`);

          this.plugin.settings.selectedModel = selection;
          this.plugin.saveSettings();
          this.updateModelButtonText(selection);
          this.events.onModelChange(selection);
        }
      );

      menu.showAtMouseEvent(event);
    } catch (error) {
      console.error('WriterMenu: Error showing model menu:', error);
    }
  }

  private updateModelButtonText(selection: string): void {
    if (!this.modelButton) return;
    
    if (selection && selection.includes(':')) {
      const [, model] = selection.split(':', 2);
      this.modelButton.textContent = model;
    } else {
      this.modelButton.textContent = 'Select Model';
    }
  }

  private getAvailableProvidersAndModels(): Record<string, Record<string, string[]>> {
    // This method is no longer used - keeping for compatibility
    return {};
  }

  private createPromptSelect(parent: HTMLElement): void {
    const promptContainer = parent.createDiv();
    promptContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      position: relative;
      flex-shrink: 1;
      min-width: 60px;
    `;

    this.promptSelect = promptContainer.createEl('select');
    this.promptSelect.style.cssText = `
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 4px 16px 4px 4px !important;
      margin: 0 !important;
      font-size: 12px;
      color: var(--text-faint);
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      min-width: 0;
      max-width: 80px;
      width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    // Add caret using centralized icon system  
    const caret = promptContainer.createEl('div');
    caret.innerHTML = Icons.chevronDown({ width: 10, height: 10 });
    caret.style.cssText = `
      pointer-events: none;
      color: var(--text-faint);
      position: absolute;
      right: 2px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `;

    // Populate prompts asynchronously
    this.populatePromptOptions().then(() => {
      // Restore saved selection after prompts are loaded
      if (this.plugin.settings.selectedPrompt) {
        this.promptSelect.value = this.plugin.settings.selectedPrompt;
      }
    });

    this.promptSelect.addEventListener('change', async () => {
      // Save selection to settings
      this.plugin.settings.selectedPrompt = this.promptSelect.value;
      await this.plugin.saveSettings();
      
      this.events.onPromptChange(this.promptSelect.value);
    });
  }

  private createTokenCounter(parent: HTMLElement): void {
    this.tokenCounter = parent.createEl('span', { cls: 'writerr-token-count' });
    this.updateTokenCounter(0, 90000);
  }

  private getProviderDisplayName(providerId: string, provider?: any): string {
    // First, try to get a display name from the provider object itself
    if (provider) {
      // Check if provider has a display name or readable name
      if (provider.displayName && typeof provider.displayName === 'string') {
        return provider.displayName;
      }
      
      if (provider.name && typeof provider.name === 'string' && !provider.name.startsWith('id-')) {
        return provider.name;
      }
      
      // Check if the provider type gives us a clue
      if (provider.type && typeof provider.type === 'string') {
        const displayNames: Record<string, string> = {
          'openai': 'OpenAI',
          'anthropic': 'Anthropic', 
          'google': 'Google',
          'ollama': 'Local/Ollama',
          'azure': 'Azure OpenAI'
        };
        
        const typeDisplayName = displayNames[provider.type.toLowerCase()];
        if (typeDisplayName) {
          return typeDisplayName;
        }
      }
    }
    
    // Fallback to static ID mapping
    const displayNames: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic', 
      'google': 'Google',
      'ollama': 'Local/Ollama',
      'azure': 'Azure OpenAI'
    };
    
    const staticResult = displayNames[providerId.toLowerCase()];
    if (staticResult) {
      return staticResult;
    }
    
    // If providerId looks like a dynamic ID (starts with "id-"), try to infer from context
    if (providerId.startsWith('id-') && provider) {
      // Try to find patterns in the provider object to guess the type
      const providerStr = JSON.stringify(provider).toLowerCase();
      
      if (providerStr.includes('openai') || providerStr.includes('gpt')) {
        console.log('WriterMenu: Inferred OpenAI from provider content for ID:', providerId);
        return 'OpenAI';
      } else if (providerStr.includes('anthropic') || providerStr.includes('claude')) {
        console.log('WriterMenu: Inferred Anthropic from provider content for ID:', providerId);
        return 'Anthropic';
      } else if (providerStr.includes('google') || providerStr.includes('gemini')) {
        console.log('WriterMenu: Inferred Google from provider content for ID:', providerId);
        return 'Google';
      } else if (providerStr.includes('ollama')) {
        console.log('WriterMenu: Inferred Local/Ollama from provider content for ID:', providerId);
        return 'Local/Ollama';
      }
      
      console.log('WriterMenu: Could not infer provider type for ID:', providerId);
    }
    
    // Return the original providerId as fallback
    return providerId;
  }

  private organizeModelsByFamily(models: string[]): Record<string, string[]> {
    const families: Record<string, string[]> = {};
    
    for (const model of models) {
        let family = 'Other';
        const modelLower = model.toLowerCase();
        
        // Organize models by family based on naming patterns
        if (modelLower.includes('gpt-4o')) {
            family = 'GPT-4o';
        } else if (modelLower.includes('gpt-4')) {
            family = 'GPT-4';
        } else if (modelLower.includes('gpt-3.5')) {
            family = 'GPT-3.5';
        } else if (modelLower.includes('claude-3-5')) {
            family = 'Claude 3.5';
        } else if (modelLower.includes('claude-3')) {
            family = 'Claude 3';
        } else if (modelLower.includes('claude-2')) {
            family = 'Claude 2';
        } else if (modelLower.includes('claude')) {
            family = 'Claude';
        } else if (modelLower.includes('gemini-pro')) {
            family = 'Gemini Pro';
        } else if (modelLower.includes('gemini')) {
            family = 'Gemini';
        } else if (modelLower.includes('llama-3')) {
            family = 'Llama 3';
        } else if (modelLower.includes('llama')) {
            family = 'Llama';
        } else if (modelLower.includes('mistral')) {
            family = 'Mistral';
        } else if (modelLower.includes('codellama')) {
            family = 'Code Llama';
        } else if (modelLower.includes('phi')) {
            family = 'Phi';
        } else if (modelLower.includes('qwen')) {
            family = 'Qwen';
        } else if (modelLower.includes('mixtral')) {
            family = 'Mixtral';
        }
        
        if (!families[family]) {
            families[family] = [];
        }
        families[family].push(model);
    }
    
    return families;
  }

  private async populatePromptOptions(): Promise<void> {
    // Add default option
    this.promptSelect.createEl('option', { value: '', text: 'Prompts' });

    try {
      const pluginDir = this.plugin.manifest.dir;
      const promptsPath = `${pluginDir}/prompts`;
      
      console.log(`🔍 Looking for prompts in: ${promptsPath}`);
      
      // Try using the file system adapter directly
      const adapter = this.plugin.app.vault.adapter;
      console.log(`📂 Vault adapter type:`, adapter.constructor.name);
      
      // Check if prompts directory exists using adapter
      const promptsDirExists = await adapter.exists(promptsPath);
      console.log(`📂 Prompts directory exists: ${promptsDirExists}`);
      
      if (promptsDirExists) {
        // List files in the prompts directory using adapter
        const promptFiles = await adapter.list(promptsPath);
        console.log(`📋 Files in prompts directory:`, promptFiles);
        
        if (promptFiles.files && promptFiles.files.length > 0) {
          const mdFiles = promptFiles.files.filter(file => file.endsWith('.md'));
          console.log(`📋 MD files found: ${mdFiles.length}`, mdFiles);
          
          if (mdFiles.length > 0) {
            console.log(`✅ Adding ${mdFiles.length} prompts to dropdown`);
            
            mdFiles.forEach(filePath => {
              const fileName = filePath.split('/').pop() || filePath;
              const baseName = fileName.replace('.md', '');
              console.log(`   Adding: ${baseName} (${filePath})`);
              
              this.promptSelect.createEl('option', { 
                value: filePath, 
                text: baseName 
              });
            });
            return;
          }
        }
      }
      
      // NO FALLBACK - if it doesn't work, it's broken and should be fixed
      console.error(`❌ PROMPTS NOT FOUND - Plugin is broken! No prompts directory found at: ${promptsPath}`);
      
      // Add a clear error indicator
      this.promptSelect.createEl('option', { 
        value: 'ERROR', 
        text: '⚠️ PROMPTS NOT FOUND' 
      });
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR loading prompts:', error);
      this.promptSelect.createEl('option', { 
        value: 'ERROR', 
        text: '⚠️ LOAD ERROR' 
      });
    }
  }

  public updateStatusIndicator(): void {
    if (!this.statusIndicator) return;

    // Check system availability
    const hasEditorialEngine = !!window.Writerr?.editorial;
    const hasTrackEdits = !!window.WriterrlAPI?.trackEdits;
    
    let color = 'var(--color-green)';
    let status = 'All systems ready';
    
    if (!hasEditorialEngine && !hasTrackEdits) {
      color = 'var(--color-red)';
      status = 'Limited functionality';
    } else if (!hasEditorialEngine || !hasTrackEdits) {
      color = 'var(--color-orange)';
      status = 'Some features unavailable';
    }
    
    this.statusIndicator.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${color};
      transition: background-color 0.3s ease;
      flex-shrink: 0;
    `;
    
    this.statusIndicator.title = status;
  }

  public updateTokenCounter(used: number, total: number): void {
    if (!this.tokenCounter) return;

    const percentage = (used / total) * 100;
    let color = 'var(--text-muted)';

    if (percentage > 90) {
      color = 'var(--color-red)';
    } else if (percentage > 70) {
      color = 'var(--color-orange)';
    }

    this.tokenCounter.textContent = `${used.toLocaleString()} / ${total.toLocaleString()}`;
    this.tokenCounter.style.color = color;
  }

  public refreshModelOptions(): void {
    // Re-populate model options - no longer needed with WriterMenu approach
    console.log('Model options refresh requested - using WriterMenu system');
  }

  public setSelectedModel(providerAndModel: string): void {
    this.plugin.settings.selectedModel = providerAndModel;
    this.updateModelButtonText(providerAndModel);
  }

  public getSelectedModel(): { provider: string; model: string } | null {
    const value = this.plugin.settings.selectedModel;
    if (!value || !value.includes(':')) {
      return null;
    }
    
    const [provider, model] = value.split(':', 2);
    return { provider, model };
  }

  public refreshAvailableModels(): void {
    // Called when AI Providers plugin becomes available or providers change
    console.log('Available models refresh requested - using WriterMenu system');
  }
}