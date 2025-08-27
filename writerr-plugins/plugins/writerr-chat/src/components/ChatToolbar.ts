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

  async render(): Promise<void> {
    this.createToolbarContainer();
    this.createLeftSection();
    await this.createRightSection();
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

  private async createRightSection(): Promise<void> {
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

    // Prompt dropdown FIRST (switched order) - await async loading
    await this.createPromptSelect(rightContainer);
    
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

    // Model select - more responsive
    this.modelSelect = modelContainer.createEl('select');
    this.modelSelect.style.cssText = `
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
      max-width: 100px;
      width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

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

    this.populateModelOptions();

    // Restore saved selection
    if (this.plugin.settings.selectedModel) {
      this.modelSelect.value = this.plugin.settings.selectedModel;
    }

    this.modelSelect.addEventListener('change', async () => {
      // Save selection to settings
      this.plugin.settings.selectedModel = this.modelSelect.value;
      await this.plugin.saveSettings();
      
      this.events.onModelChange(this.modelSelect.value);
      
      // Refresh token counter with new model limits
      await this.refreshTokenCounter();
    });
  }

  private async createPromptSelect(parent: HTMLElement): Promise<void> {
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

    // Load prompts asynchronously
    await this.populatePromptOptions();

    // Restore saved selection
    if (this.plugin.settings.selectedPrompt) {
      this.promptSelect.value = this.plugin.settings.selectedPrompt;
    }

    this.promptSelect.addEventListener('change', async () => {
      // Save selection to settings
      this.plugin.settings.selectedPrompt = this.promptSelect.value;
      await this.plugin.saveSettings();
      
      this.events.onPromptChange(this.promptSelect.value);
      
      // Refresh token counter with new prompt tokens
      await this.refreshTokenCounter();
    });
  }

  private createTokenCounter(parent: HTMLElement): void {
    this.tokenCounter = parent.createEl('span', { cls: 'writerr-token-count' });
    
    // Initialize with comprehensive token counting
    this.refreshTokenCounter();
    
    // Refresh token counter when user types in input
    this.setupInputTokenTracking();
  }

  private setupInputTokenTracking(): void {
    // Set up interval to periodically check input changes
    setInterval(() => {
      this.refreshTokenCounter();
    }, 2000); // Update every 2 seconds
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

        // Build flat hierarchical structure (optgroups cannot be nested)
        for (const [provider, families] of Object.entries(availableProviders)) {
            for (const [family, models] of Object.entries(families)) {
                // Create one optgroup per provider+family combination
                const groupLabel = `${provider} → ${family}`;
                const familyGroup = this.modelSelect.createEl('optgroup', { label: groupLabel });
                
                (models as string[]).forEach(model => {
                    familyGroup.createEl('option', { 
                      value: `${provider}:${model}`, // Store provider:model for routing
                      text: model // Display only model name (clean)
                    });
                });
            }
        }

        console.log('Successfully populated model dropdown with provider → family grouping');

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

  private async populatePromptOptions(): Promise<void> {
    // Add default option
    this.promptSelect.createEl('option', { value: '', text: 'Prompts' });

    try {
      // Get all .md files in the Prompts folder
      const promptFiles = this.plugin.app.vault.getMarkdownFiles()
        .filter(file => file.path.startsWith('Prompts/'))
        .sort((a, b) => a.basename.localeCompare(b.basename));

      if (promptFiles.length === 0) {
        console.log('No prompt files found in /Prompts/ folder, using defaults');
        this.addDefaultPrompts();
        return;
      }

      // Add prompts from files
      for (const file of promptFiles) {
        const displayName = this.formatPromptName(file.basename);
        this.promptSelect.createEl('option', { 
          value: file.path, 
          text: displayName 
        });
      }

      console.log(`✅ Loaded ${promptFiles.length} prompt files from /Prompts/ folder`);

    } catch (error) {
      console.error('Error loading prompts from folder:', error);
      this.addDefaultPrompts();
    }
  }

  private addDefaultPrompts(): void {
    // Fallback prompts if folder loading fails
    const defaultPrompts = [
      'Creative Writing',
      'Technical Writing', 
      'Academic Style',
      'Casual Tone',
      'Professional'
    ];

    defaultPrompts.forEach(prompt => {
      this.promptSelect.createEl('option', { 
        value: prompt.toLowerCase().replace(/\s+/g, '-'), 
        text: prompt 
      });
    });
  }

  private formatPromptName(basename: string): string {
    // Convert filename to display name
    // e.g., "creative-writing" -> "Creative Writing"
    return basename
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
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

  // Token calculation and management methods
  
  private estimateTokens(text: string): number {
    const selectedModel = this.getSelectedModel();
    if (!selectedModel) {
        return Math.ceil(text.length / 4); // Fallback estimation
    }

    return this.calculateTokensForModel(text, selectedModel.model);
}

  private calculateTokensForModel(text: string, modelName: string): number {
    // Clean and normalize text
    const normalizedText = text.trim();
    if (!normalizedText) return 0;

    // Determine tokenizer type based on model
    const tokenizerType = this.getTokenizerType(modelName);
    
    switch (tokenizerType) {
      case 'cl100k':
        return this.cl100kTokenizer(normalizedText);
      case 'p50k':
        return this.p50kTokenizer(normalizedText);
      case 'gemini':
        return this.geminiTokenizer(normalizedText);
      case 'claude':
        return this.claudeTokenizer(normalizedText);
      default:
        return this.fallbackTokenizer(normalizedText);
    }
  }

  private getTokenizerType(modelName: string): string {
    // OpenAI GPT-4, GPT-4o, GPT-5, o1, o3, o4 use cl100k_base
    if (modelName.includes('gpt-4') || modelName.includes('gpt-5') || 
        modelName.includes('gpt-4o') || modelName.includes('o1') || 
        modelName.includes('o3') || modelName.includes('o4')) {
      return 'cl100k';
    }
    
    // OpenAI GPT-3.5 and older use p50k_base
    if (modelName.includes('gpt-3') || modelName.includes('davinci') || 
        modelName.includes('babbage') || modelName.includes('curie')) {
      return 'p50k';
    }
    
    // Google Gemini models
    if (modelName.includes('gemini') || modelName.includes('models/gemini')) {
      return 'gemini';
    }
    
    // Anthropic Claude models
    if (modelName.includes('claude')) {
      return 'claude';
    }
    
    return 'cl100k'; // Default to most common modern tokenizer
  }

  private cl100kTokenizer(text: string): number {
    // cl100k_base tokenizer approximation for GPT-4/GPT-4o/GPT-5/o1/o3/o4
    // This is more sophisticated than simple character counting
    
    // Step 1: Handle special tokens and patterns
    let tokenCount = 0;
    
    // Count newlines (each newline is typically 1 token)
    const newlines = (text.match(/\n/g) || []).length;
    tokenCount += newlines;
    
    // Remove newlines for further processing
    let processedText = text.replace(/\n/g, ' ');
    
    // Step 2: Split on whitespace and punctuation
    const words = processedText.split(/\s+/).filter(word => word.length > 0);
    
    for (const word of words) {
      // Handle punctuation-heavy text
      if (/^[^\w\s]+$/.test(word)) {
        // Pure punctuation - usually 1 token per character or small group
        tokenCount += Math.ceil(word.length / 2);
      } else if (word.length <= 3) {
        // Short words are typically 1 token
        tokenCount += 1;
      } else if (word.length <= 7) {
        // Medium words are typically 1-2 tokens
        tokenCount += Math.ceil(word.length / 4);
      } else {
        // Long words get split more
        tokenCount += Math.ceil(word.length / 3.5);
      }
    }
    
    return Math.max(1, tokenCount);
  }

  private p50kTokenizer(text: string): number {
    // p50k_base tokenizer approximation for GPT-3.5 and older
    // Slightly less efficient than cl100k
    
    const words = text.split(/\s+/).filter(word => word.length > 0);
    let tokenCount = 0;
    
    for (const word of words) {
      if (word.length <= 4) {
        tokenCount += 1;
      } else {
        // p50k is less efficient, so slightly higher token count
        tokenCount += Math.ceil(word.length / 3.8);
      }
    }
    
    // Add newline tokens
    tokenCount += (text.match(/\n/g) || []).length;
    
    return Math.max(1, tokenCount);
  }

  private geminiTokenizer(text: string): number {
    // Google Gemini tokenizer approximation
    // Generally more efficient than GPT tokenizers
    
    const words = text.split(/\s+/).filter(word => word.length > 0);
    let tokenCount = 0;
    
    for (const word of words) {
      if (word.length <= 4) {
        tokenCount += 1;
      } else {
        // Gemini is typically more efficient
        tokenCount += Math.ceil(word.length / 4.2);
      }
    }
    
    // Handle newlines
    tokenCount += (text.match(/\n/g) || []).length * 0.8; // Gemini handles newlines more efficiently
    
    return Math.max(1, Math.ceil(tokenCount));
  }

  private claudeTokenizer(text: string): number {
    // Anthropic Claude tokenizer approximation
    // Similar efficiency to GPT-4 family
    
    const words = text.split(/\s+/).filter(word => word.length > 0);
    let tokenCount = 0;
    
    for (const word of words) {
      if (word.length <= 3) {
        tokenCount += 1;
      } else {
        tokenCount += Math.ceil(word.length / 3.7);
      }
    }
    
    // Handle newlines
    tokenCount += (text.match(/\n/g) || []).length;
    
    return Math.max(1, tokenCount);
  }

  private fallbackTokenizer(text: string): number {
    // Conservative fallback estimation
    return Math.ceil(text.length / 4);
  }

  private async getContextTokens(): Promise<number> {
    try {
      // Get context documents from ContextArea
      const contextContainer = document.querySelector('.context-documents');
      if (!contextContainer) return 0;

      let totalTokens = 0;
      const documentChips = contextContainer.querySelectorAll('.context-document-chip');
      
      for (const chip of documentChips) {
        const docName = chip.querySelector('span:nth-child(2)')?.textContent;
        if (docName) {
          // Find the file and calculate its token count
          const files = this.plugin.app.vault.getMarkdownFiles();
          const file = files.find(f => f.basename + '.md' === docName);
          if (file) {
            const content = await this.plugin.app.vault.read(file);
            totalTokens += this.estimateTokens(content);
          }
        }
      }

      return totalTokens;
    } catch (error) {
      console.error('Error calculating context tokens:', error);
      return 0;
    }
  }

  private async getPromptTokens(): Promise<number> {
    try {
      const selectedPrompt = this.promptSelect.value;
      if (!selectedPrompt || selectedPrompt === '') return 0;

      // If it's a file path, read the file
      if (selectedPrompt.startsWith('Prompts/') && selectedPrompt.endsWith('.md')) {
        const file = this.plugin.app.vault.getAbstractFileByPath(selectedPrompt);
        if (file) {
          const content = await this.plugin.app.vault.read(file);
          return this.estimateTokens(content);
        }
      }

      // If it's a default prompt, estimate based on typical prompt length
      return this.estimateTokens('System prompt for ' + selectedPrompt + ' writing style with detailed instructions and examples (approximately 200 words)');
    } catch (error) {
      console.error('Error calculating prompt tokens:', error);
      return 50; // Reasonable fallback for system prompts
    }
  }

  private async getCurrentMessageTokens(): Promise<number> {
    try {
      // Get current input text
      const inputElement = document.querySelector('.chat-message-input') as HTMLTextAreaElement;
      if (!inputElement) return 0;

      return this.estimateTokens(inputElement.value);
    } catch (error) {
      console.error('Error calculating message tokens:', error);
      return 0;
    }
  }

  private async getModelMaxTokens(): Promise<number | null> {
    try {
        const selectedModel = this.getSelectedModel();
        if (!selectedModel) {
            return null;
        }

        const modelKey = `${selectedModel.provider}:${selectedModel.model}`;
        
        // Check cache first
        const cachedLimit = this.getCachedTokenLimit(modelKey);
        if (cachedLimit !== null) {
            return cachedLimit;
        }

        console.log(`🔍 Looking up fresh token limit for model: ${selectedModel.model}`);

        // Try to get dynamic model info from external sources
        const dynamicLimit = await this.fetchDynamicModelInfo(selectedModel);
        
        // Cache the result (even if null) to avoid repeated failed requests
        this.setCachedTokenLimit(modelKey, dynamicLimit);
        
        if (dynamicLimit) {
            console.log(`✅ Found dynamic token limit for ${selectedModel.model}: ${dynamicLimit}`);
            return dynamicLimit;
        }

        console.log(`🚫 No dynamic token limit available for ${selectedModel.provider}:${selectedModel.model}`);
        return null;

    } catch (error) {
        console.error('❌ Error getting model max tokens:', error);
        return null;
    }
}

  private async fetchDynamicModelInfo(selectedModel: {provider: string, model: string}): Promise<number | null> {
    try {
        console.log(`🔍 Fetching dynamic info for ${selectedModel.provider}:${selectedModel.model}`);

        // Method 1: Try model metadata service (community database)
        console.log(`📊 Trying model metadata service...`);
        const metadataService = await this.fetchFromModelMetadataService(selectedModel);
        if (metadataService) {
            console.log(`✅ Found via metadata service: ${metadataService}`);
            return metadataService;
        }

        // Method 2: Try OpenRouter registry (comprehensive model database)
        console.log(`🌐 Trying OpenRouter registry...`);
        const openRouterData = await this.fetchFromOpenRouterRegistry(selectedModel);
        if (openRouterData) {
            console.log(`✅ Found via OpenRouter registry: ${openRouterData}`);
            return openRouterData;
        }

        // Method 3: Try HuggingFace model hub
        console.log(`🤗 Trying HuggingFace model hub...`);
        const huggingFaceData = await this.fetchFromHuggingFace(selectedModel);
        if (huggingFaceData) {
            console.log(`✅ Found via HuggingFace: ${huggingFaceData}`);
            return huggingFaceData;
        }

        console.log(`❌ All external services failed for ${selectedModel.model}`);
        return null;
    } catch (error) {
        console.error('Error fetching dynamic model info:', error);
        return null;
    }
  }

  private async getProviderModelMetadata(selectedModel: {provider: string, model: string}): Promise<number | null> {
    try {
        const app = (window as any).app;
        const aiProvidersPlugin = app?.plugins?.plugins?.['ai-providers'];
        
        if (!aiProvidersPlugin?.aiProviders) {
            console.log(`❌ AI Providers plugin not available for metadata lookup`);
            return null;
        }

        console.log(`🔍 AI Providers SDK full structure:`, aiProvidersPlugin.aiProviders);
        
        const provider = aiProvidersPlugin.aiProviders.providers?.find((p: any) => {
            const providerId = p.id || p.name || p.type;
            return providerId === selectedModel.provider;
        });

        if (!provider) {
            console.log(`❌ Provider ${selectedModel.provider} not found`);
            return null;
        }

        console.log(`✅ Full provider object:`, provider);
        console.log(`🔍 All provider properties:`, Object.keys(provider));

        // Let's see if there's any model-specific data anywhere
        for (const key of Object.keys(provider)) {
            const value = provider[key];
            if (Array.isArray(value) && value.length > 0) {
                console.log(`📋 Provider.${key} (array with ${value.length} items):`, value.slice(0, 3));
                
                // Check if any array items are objects with token info
                const firstItem = value[0];
                if (typeof firstItem === 'object' && firstItem !== null) {
                    console.log(`🔍 First item in ${key}:`, firstItem);
                    console.log(`🔍 Properties of first item:`, Object.keys(firstItem));
                }
            } else if (typeof value === 'object' && value !== null) {
                console.log(`📋 Provider.${key} (object):`, value);
                console.log(`🔍 Properties:`, Object.keys(value));
            }
        }

        // Try a comprehensive search for our model name
        console.log(`🔍 Searching entire provider object for model "${selectedModel.model}"`);
        this.searchObjectForModel(provider, selectedModel.model, 'provider');

        return null;
    } catch (error) {
        console.error('❌ Error getting provider model metadata:', error);
        return null;
    }
  }

  private searchObjectForModel(obj: any, modelName: string, path: string): void {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = `${path}.${key}`;
      
      if (key === modelName || (typeof value === 'string' && value === modelName)) {
        console.log(`🎯 Found model reference at ${currentPath}:`, value);
      }
      
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item === modelName) {
            console.log(`🎯 Found model in array at ${currentPath}[${index}]:`, item);
          } else if (typeof item === 'object' && item !== null) {
            // Check if object contains our model name
            const objStr = JSON.stringify(item);
            if (objStr.includes(modelName)) {
              console.log(`🎯 Found model in object at ${currentPath}[${index}]:`, item);
            }
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Recursively search nested objects (but limit depth to avoid infinite loops)
        if (path.split('.').length < 5) {
          this.searchObjectForModel(value, modelName, currentPath);
        }
      }
    }
  }

  private async fetchFromProviderAPI(selectedModel: {provider: string, model: string}): Promise<number | null> {
    try {
        // For OpenAI models, try the models API endpoint
        if (selectedModel.model.includes('gpt') || selectedModel.model.includes('o1') || 
            selectedModel.model.includes('o3') || selectedModel.model.includes('o4')) {
            
            console.log(`🌐 Attempting OpenAI API fetch for ${selectedModel.model}`);
            
            const app = (window as any).app;
            const aiProvidersPlugin = app?.plugins?.plugins?.['ai-providers'];
            const provider = aiProvidersPlugin?.aiProviders?.providers?.find((p: any) => 
                (p.id || p.name || p.type) === selectedModel.provider
            );
            
            if (!provider) {
                console.log(`❌ Provider ${selectedModel.provider} not found for API fetch`);
                return null;
            }
            
            console.log(`✅ Found provider for API:`, provider);
            
            if (!provider.apiKey || !provider.url) {
                console.log(`❌ Missing apiKey or url:`, {
                    hasApiKey: !!provider.apiKey,
                    hasUrl: !!provider.url,
                    url: provider.url
                });
                return null;
            }
            
            const modelsUrl = `${provider.url}/models`;
            console.log(`🔗 Fetching from: ${modelsUrl}`);
            
            try {
                const response = await fetch(modelsUrl, {
                    headers: {
                        'Authorization': `Bearer ${provider.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`📡 API Response status: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`📋 API Response data structure:`, {
                        hasData: !!data.data,
                        dataLength: data.data?.length,
                        firstModel: data.data?.[0]
                    });
                    
                    const modelInfo = data.data?.find((m: any) => m.id === selectedModel.model);
                    
                    if (modelInfo) {
                        console.log(`🎯 Found model info from API:`, modelInfo);
                        console.log(`🔍 Model properties:`, Object.keys(modelInfo));
                        
                        if (modelInfo.context_length || modelInfo.max_tokens || modelInfo.context_window) {
                            const limit = modelInfo.context_length || modelInfo.max_tokens || modelInfo.context_window;
                            console.log(`✅ Found API limit for ${selectedModel.model}: ${limit}`);
                            return limit;
                        } else {
                            console.log(`❌ No token limit fields found in API response`);
                        }
                    } else {
                        console.log(`❌ Model ${selectedModel.model} not found in API response`);
                        console.log(`📋 Available model IDs:`, data.data?.slice(0, 5).map((m: any) => m.id));
                    }
                } else {
                    const errorText = await response.text();
                    console.log(`❌ API Error response:`, errorText);
                }
            } catch (fetchError: any) {
                console.log(`❌ API fetch failed for ${selectedModel.model}:`, fetchError.message);
                console.log(`🔍 Error details:`, fetchError);
            }
        }

        return null;
    } catch (error) {
        console.error('❌ Error fetching from provider API:', error);
        return null;
    }
  }

  private async fetchFromModelMetadataService(selectedModel: {provider: string, model: string}): Promise<number | null> {
    try {
        // Try a comprehensive model database API
        const response = await fetch('https://api.models-database.dev/v1/models', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel.model,
                provider: selectedModel.provider
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.context_length) {
                console.log(`📊 Model database returned: ${data.context_length}`);
                return data.context_length;
            }
        }
    } catch (error) {
        console.log(`❌ Model database service failed:`, error.message);
    }
    return null;
  }

  private async fetchFromOpenRouterRegistry(selectedModel: {provider: string, model: string}): Promise<number | null> {
    try {
        console.log(`🌐 Fetching from OpenRouter models API...`);
        
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`📋 OpenRouter returned ${data.data?.length} models`);
            
            // Try exact match first
            let modelInfo = data.data?.find((m: any) => m.id === selectedModel.model);
            
            // Try partial matches for OpenAI models routed through OpenRouter
            if (!modelInfo && selectedModel.model.includes('gpt')) {
                modelInfo = data.data?.find((m: any) => 
                    m.id.includes(selectedModel.model) || 
                    m.id.endsWith('/' + selectedModel.model) ||
                    m.id === 'openai/' + selectedModel.model
                );
            }
            
            if (modelInfo) {
                console.log(`🎯 Found OpenRouter model:`, modelInfo);
                if (modelInfo.context_length) {
                    console.log(`🌐 OpenRouter registry returned: ${modelInfo.context_length}`);
                    return modelInfo.context_length;
                }
            } else {
                console.log(`❌ Model ${selectedModel.model} not found in OpenRouter registry`);
            }
        } else {
            console.log(`❌ OpenRouter API error: ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ OpenRouter registry failed:`, error.message);
    }
    return null;
  }

  private async fetchFromHuggingFace(selectedModel: {provider: string, model: string}): Promise<number | null> {
    try {
        // For models that might be on HuggingFace
        const modelPath = selectedModel.model.includes('/') ? selectedModel.model : `openai/${selectedModel.model}`;
        console.log(`🤗 Checking HuggingFace for: ${modelPath}`);
        
        const response = await fetch(`https://huggingface.co/api/models/${modelPath}`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`🤗 HuggingFace model data:`, data);
            
            // Check various possible fields for context length
            const contextLength = data.config?.max_position_embeddings || 
                                 data.config?.n_positions ||
                                 data.config?.context_length ||
                                 data.context_length;
                                 
            if (contextLength) {
                console.log(`🤗 HuggingFace returned: ${contextLength}`);
                return contextLength;
            }
        } else {
            console.log(`❌ HuggingFace API error: ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ HuggingFace failed:`, error.message);
    }
    return null;
  }

  // Cache for token limits to avoid repeated API calls
  private static tokenLimitCache = new Map<string, {limit: number | null, timestamp: number}>();
  private static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private getCachedTokenLimit(modelKey: string): number | null {
    const cached = ChatToolbar.tokenLimitCache.get(modelKey);
    if (cached && (Date.now() - cached.timestamp) < ChatToolbar.CACHE_DURATION) {
      console.log(`💾 Using cached token limit for ${modelKey}: ${cached.limit}`);
      return cached.limit;
    }
    return null;
  }

  private setCachedTokenLimit(modelKey: string, limit: number | null): void {
    ChatToolbar.tokenLimitCache.set(modelKey, {
      limit,
      timestamp: Date.now()
    });
    console.log(`💾 Cached token limit for ${modelKey}: ${limit}`);
  }

  public async refreshTokenCounter(): Promise<void> {
    try {
      const [contextTokens, promptTokens, messageTokens, maxTokens] = await Promise.all([
        this.getContextTokens(),
        this.getPromptTokens(), 
        this.getCurrentMessageTokens(),
        this.getModelMaxTokens()
      ]);

      const totalUsed = contextTokens + promptTokens + messageTokens;
      
      if (maxTokens === null) {
        // Cannot determine model limit - show used tokens only
        console.log(`Token calculation: Context(${contextTokens}) + Prompt(${promptTokens}) + Message(${messageTokens}) = ${totalUsed} (limit unknown)`);
        this.tokenCounter.textContent = `${totalUsed.toLocaleString()} tokens`;
        this.tokenCounter.style.color = 'var(--text-faint)';
        this.tokenCounter.title = 'Token count - model limit unknown';
      } else {
        // Normal display with known limits
        console.log(`Token calculation: Context(${contextTokens}) + Prompt(${promptTokens}) + Message(${messageTokens}) = ${totalUsed}/${maxTokens}`);
        this.updateTokenCounter(totalUsed, maxTokens);
      }

    } catch (error) {
      console.error('Error refreshing token counter:', error);
      // Show error state
      this.tokenCounter.textContent = 'Token count error';
      this.tokenCounter.style.color = 'var(--text-error)';
      this.tokenCounter.title = 'Error calculating token count';
    }
  }
}