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

export class ChatToolbar extends BaseComponent {
  private events: ChatToolbarEvents;
  private statusIndicator: HTMLElement;
  private modelSelect: HTMLSelectElement;
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
      padding: 12px 16px;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
      font-size: 12px;
      color: var(--text-muted);
    `;
  }

  private createLeftSection(): void {
    const leftContainer = this.createElement('div', {
      cls: 'writerr-toolbar-left'
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
        gap: '8px'  // Reduced gap to make room
      }
    });

    // Model dropdown with status indicator
    this.createModelSelect(rightContainer);
    
    // Prompt dropdown
    this.createPromptSelect(rightContainer);
    
    // Token counter
    this.createTokenCounter(rightContainer);

    // NO CONTEXT BUTTON HERE - it belongs in the context area header
  }

  private createActionButton(parent: HTMLElement, tooltip: string, icon: string, onClick: () => void): void {
    const button = parent.createEl('button', { 
      cls: 'writerr-toolbar-button',
      attr: { 'data-tooltip': tooltip }
    });
    button.innerHTML = icon;
    button.onclick = onClick;
  }


  private createModelSelect(parent: HTMLElement): void {
    const modelContainer = parent.createDiv();
    modelContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      position: relative;
    `;

    // Status indicator dot
    this.statusIndicator = modelContainer.createEl('div', { cls: 'status-indicator' });
    this.updateStatusIndicator();

    // Model select
    this.modelSelect = modelContainer.createEl('select');
    this.modelSelect.style.cssText = `
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 4px 20px 4px 4px !important;
      margin: 0 !important;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      max-width: 120px;
    `;

    // Add caret using centralized icon system
    const caret = modelContainer.createEl('div');
    caret.innerHTML = Icons.chevronDown({ width: 12, height: 12 });
    caret.style.cssText = `
      pointer-events: none;
      color: var(--text-muted);
      position: absolute;
      right: 2px;
      display: flex;
      align-items: center;
    `;

    this.populateModelOptions();

    this.modelSelect.addEventListener('change', () => {
      this.events.onModelChange(this.modelSelect.value);
    });
  }

  private createPromptSelect(parent: HTMLElement): void {
    const promptContainer = parent.createDiv();
    promptContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      position: relative;
    `;

    this.promptSelect = promptContainer.createEl('select');
    this.promptSelect.style.cssText = `
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 4px 20px 4px 4px !important;
      margin: 0 !important;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      max-width: 100px;
    `;

    // Add caret using centralized icon system  
    const caret = promptContainer.createEl('div');
    caret.innerHTML = Icons.chevronDown({ width: 12, height: 12 });
    caret.style.cssText = `
      pointer-events: none;
      color: var(--text-muted);
      position: absolute;
      right: 2px;
      display: flex;
      align-items: center;
    `;

    this.populatePromptOptions();

    this.promptSelect.addEventListener('change', () => {
      this.events.onPromptChange(this.promptSelect.value);
    });
  }

  private createTokenCounter(parent: HTMLElement): void {
    this.tokenCounter = parent.createEl('span', { cls: 'writerr-token-count' });
    this.updateTokenCounter(0, 90000); // Changed from 1M to 90K
  }

  // Context button removed - belongs in context area header, not toolbar

  private populateModelOptions(): void {
    // Clear existing options
    this.modelSelect.innerHTML = '';

    // Try to get AI Providers plugin
    const app = (window as any).app;
    const plugins = app?.plugins?.plugins;
    const aiProvidersPlugin = plugins?.['ai-providers'];
    
    if (!aiProvidersPlugin) {
        console.log('AI Providers plugin not found');
        this.modelSelect.createEl('option', { 
          value: '', 
          text: 'AI Providers plugin not found'
        });
        return;
    }

    // Get the actual aiProviders SDK object
    const aiProviders = aiProvidersPlugin.aiProviders;
    
    if (!aiProviders) {
        console.log('AI Providers SDK not available on plugin object');
        this.modelSelect.createEl('option', { 
          value: '', 
          text: 'AI Providers SDK not available'
        });
        return;
    }

    console.log('✅ Found AI Providers SDK:', aiProviders);
    console.log('📋 AI Providers SDK methods:', Object.keys(aiProviders));

    // Check if this has the execute method we need
    if (typeof aiProviders.execute === 'function') {
        console.log('✅ AI Providers SDK has execute method');
    } else {
        console.log('❌ AI Providers SDK missing execute method');
    }

    try {
        // Get available providers and models from AI Providers SDK
        const availableProviders = this.getAvailableProvidersAndModels(aiProviders);
        
        if (Object.keys(availableProviders).length === 0) {
            console.log('No providers configured in AI Providers plugin');
            this.modelSelect.createEl('option', { 
              value: '', 
              text: 'No models configured' 
            });
            return;
        }

        // Build hierarchical structure
        for (const [provider, families] of Object.entries(availableProviders)) {
            const providerGroup = this.modelSelect.createEl('optgroup', { label: provider });
            
            for (const [family, models] of Object.entries(families)) {
                const familyGroup = this.modelSelect.createEl('optgroup', { label: `  ${family}` });
                
                (models as string[]).forEach(model => {
                    familyGroup.createEl('option', { 
                      value: `${provider}:${model}`, // Store provider:model for routing
                      text: `    ${model}` // Display only model name with indent
                    });
                });
            }
        }

        console.log('Successfully populated model dropdown with providers');

    } catch (error) {
        console.error('Error populating model options:', error);
        this.modelSelect.createEl('option', { 
          value: '', 
          text: 'Error loading models' 
        });
    }
  }

  private getAvailableProvidersAndModels(aiProviders: any): Record<string, Record<string, string[]>> {
    try {
        console.log('🔍 AI Providers plugin object:', aiProviders);
        console.log('🔍 Available methods/properties:', Object.keys(aiProviders));
        console.log('🔍 Plugin constructor:', aiProviders.constructor?.name);
        
        // Check for settings or configuration that might contain provider info
        if (aiProviders.settings) {
            console.log('📋 Plugin settings:', aiProviders.settings);
        }
        
        // Try different possible API methods to get providers
        let providers: any[] = [];
        
        const possibleMethods = [
            'getProviders',
            'getAvailableProviders', 
            'listProviders',
            'providers',
            'getConfiguredProviders'
        ];
        
        for (const method of possibleMethods) {
            if (typeof aiProviders[method] === 'function') {
                console.log(`📞 Trying method: ${method}()`);
                try {
                    providers = aiProviders[method]();
                    console.log(`✅ ${method}() returned:`, providers);
                    break;
                } catch (err) {
                    console.log(`❌ ${method}() failed:`, err);
                }
            } else if (aiProviders[method] !== undefined) {
                console.log(`📋 Found property: ${method} =`, aiProviders[method]);
                providers = Array.isArray(aiProviders[method]) ? aiProviders[method] : [aiProviders[method]];
                break;
            }
        }
        
        // If no providers found through methods, try to extract from settings
        if (providers.length === 0 && aiProviders.settings) {
            const settings = aiProviders.settings;
            if (settings.providers && Array.isArray(settings.providers)) {
                providers = settings.providers;
                console.log('📋 Using providers from settings:', providers);
            } else if (settings.provider) {
                providers = [settings.provider];
                console.log('📋 Using single provider from settings:', providers);
            }
        }
        
        if (providers.length === 0) {
            console.log('❌ No providers found in AI Providers plugin');
            return {};
        }
        
        const organized: Record<string, Record<string, string[]>> = {};
        
        for (const provider of providers) {
            console.log('🔧 Processing provider:', provider);
            
            // Extract provider info - the structure might vary
            const providerId = provider.id || provider.name || provider.type || 'unknown';
            const providerName = this.getProviderDisplayName(providerId);
            
            // Try to get models from various possible properties
            const models = provider.models || provider.availableModels || provider.supportedModels || [];
            console.log(`📋 Models for ${providerId}:`, models);
            
            if (models.length > 0) {
                const families = this.organizeModelsByFamily(models);
                if (Object.keys(families).length > 0) {
                    organized[providerName] = families;
                    console.log(`✅ Added provider ${providerName} with families:`, families);
                }
            }
        }
        
        console.log('🎯 Final organized providers:', organized);
        return organized;
        
    } catch (error) {
        console.error('❌ Error getting providers from AI Providers plugin:', error);
        return {};
    }
}

  private getProviderDisplayName(providerId: string): string {
    const displayNames: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic', 
      'google': 'Google',
      'ollama': 'Local/Ollama',
      'azure': 'Azure OpenAI'
    };
    
    return displayNames[providerId.toLowerCase()] || providerId;
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

  public refreshModelOptions(): void {
    // Re-populate model options from AI Providers plugin
    this.populateModelOptions();
  }

  public setSelectedModel(providerAndModel: string): void {
    // Set the selected model (format: "provider:model")
    this.modelSelect.value = providerAndModel;
  }

  public getSelectedModel(): { provider: string; model: string } | null {
    const value = this.modelSelect.value;
    if (!value || !value.includes(':')) {
      return null;
    }
    
    const [provider, model] = value.split(':', 2);
    return { provider, model };
  }

  public refreshAvailableModels(): void {
    // Called when AI Providers plugin becomes available or providers change
    this.refreshModelOptions();
  }

  private notifyModelProviderReady(): void {
    // Emit event that model provider is ready
    this.events.onModelProviderReady?.();
  }

  private populatePromptOptions(): void {
    // Add default option
    this.promptSelect.createEl('option', { value: '', text: 'Prompts' });

    // This will eventually load from markdown files dynamically
    const defaultPrompts = [
      'Creative Writing',
      'Technical Writing', 
      'Academic Style',
      'Casual Tone',
      'Professional'
    ];

    defaultPrompts.forEach(prompt => {
      this.promptSelect.createEl('option', { value: prompt.toLowerCase().replace(' ', '-'), text: prompt });
    });
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
}