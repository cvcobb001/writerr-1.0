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
  private promptButton: HTMLButtonElement;  // NEW: WriterMenu button
  private documentButton: HTMLButtonElement;  // NEW: Smart document button
  private availablePrompts: { name: string; path: string }[] = [];  // NEW: Store loaded prompts
  private tokenCounter: HTMLElement;

  constructor(options: ChatToolbarOptions) {
    super(options);
    this.events = options.events;
  }

  render(): void {
    this.createToolbarContainer();
    this.createToolbarElements();
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

  private createToolbarElements(): void {
    // Update main container with clean styling from test toolbar
    this.container.style.cssText = `
      all: initial;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-secondary);
      font-size: 12px;
      color: var(--text-muted);
      min-height: 40px;
      box-sizing: border-box;
      font-family: var(--font-interface);
    `;

    // Add document button - using centralized icon system
    this.createSmartDocumentButton(this.container, 'Add document to chat', 
      createStyledIcon('filePlus2', 'toolbar'), 
      () => this.events.onAddDocument()
    );

    // Copy chat button - using centralized icon system
    this.createActionButton(this.container, 'Copy entire chat', 
      createStyledIcon('copy', 'toolbar'), 
      () => this.events.onCopyChat()
    );

    // Clear chat button - using centralized icon system
    this.createActionButton(this.container, 'Clear chat', 
      createStyledIcon('paintbrush', 'toolbar'), 
      () => this.events.onClearChat()
    );

    // Add spacer to push right elements to the right
    const spacer = this.container.createEl('div');
    spacer.style.cssText = 'flex: 1; min-width: 20px;';

    // Prompt dropdown
    this.createPromptSelect(this.container);
    
    // Model dropdown
    this.createModelSelect(this.container);
    
    // Token counter
    this.createTokenCounter(this.container);
  }

  private createTestToolbar(): void {
    // Create a completely fresh toolbar below the existing one
    const testToolbar = this.container.parentElement.createEl('div');
    testToolbar.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-secondary);
      font-size: 12px;
      color: var(--text-muted);
      min-height: 40px;
      margin-top: 4px;
    `;

    // Add label
    const label = testToolbar.createEl('span');
    label.textContent = 'TEST:';
    label.style.cssText = 'font-weight: bold; color: var(--text-accent);';

    // Create fresh prompt button with zero inheritance
    const freshPromptButton = testToolbar.createEl('button');
    freshPromptButton.style.cssText = `
      all: initial;
      font-family: inherit;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
      padding: 4px 8px;
      font-size: 12px;
      color: var(--text-normal);
      cursor: pointer;
      width: 120px;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-radius: 4px;
    `;
    
    freshPromptButton.textContent = 'casual-conversational';

    // Add other elements for comparison
    const freshModelButton = testToolbar.createEl('button');
    freshModelButton.style.cssText = `
      all: initial;
      font-family: inherit;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
      padding: 4px 8px;
      font-size: 12px;
      color: var(--text-normal);
      cursor: pointer;
      width: 100px;
      text-align: left;
      border-radius: 4px;
    `;
    freshModelButton.textContent = 'claude-3.5-sonnet';

    const freshTokens = testToolbar.createEl('span');
    freshTokens.style.cssText = `
      font-size: 12px;
      color: var(--text-muted);
    `;
    freshTokens.textContent = '267 / unavailable';
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

  private createSmartDocumentButton(parent: HTMLElement, tooltip: string, icon: string, onClick: () => void): void {
    const button = parent.createEl('button', { 
      cls: 'writerr-toolbar-button writerr-document-button'
    });
    button.innerHTML = icon;
    
    // Custom click handler that adds current active document to context
    button.onclick = () => {
      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (!activeFile) return;

      // Get the chat view using the same pattern as main plugin
      const chatLeaf = this.plugin.app.workspace.getLeavesOfType('writerr-chat-view')[0];
      const chatView = chatLeaf?.view;
      const contextArea = chatView?.contextArea;
      
      if (!contextArea) {
        console.error('ChatToolbar: Context area not found');
        return;
      }

      // Check if document is already in context
      const documentsInContext = contextArea.getDocuments() || [];
      const isInContext = documentsInContext.some((doc: any) => doc.path === activeFile.path);

      if (!isInContext) {
        // Add document to context
        const documentContext = {
          name: activeFile.name,
          path: activeFile.path
        };
        console.log('ChatToolbar: Adding document to context:', documentContext);
        contextArea.addDocument(documentContext);
        
        // Update button state to reflect the change
        this.updateDocumentButtonState();
      } else {
        console.log('ChatToolbar: Document already in context:', activeFile.name);
      }
    };
    
    // Store reference for updates
    this.documentButton = button;
    
    // Listen for active file changes to update button state
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('active-leaf-change', () => {
        // Small delay to ensure file is fully loaded
        setTimeout(() => this.updateDocumentButtonState(), 100);
      })
    );
    
    // Update visual state based on active document
    this.updateDocumentButtonState();
    
    // Add unified tooltip
    this.addTooltip(button, tooltip);
  }

  private createModelSelect(parent: HTMLElement): void {
    const modelButton = parent.createEl('button');
    modelButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 6px 24px 6px 8px;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 4px;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      position: relative;
      font-family: inherit;
    `;

    modelButton.addEventListener('mouseenter', () => {
      modelButton.style.background = 'var(--background-modifier-hover)';
      modelButton.style.color = 'var(--text-normal)';
    });
    
    modelButton.addEventListener('mouseleave', () => {
      modelButton.style.background = 'transparent';
      modelButton.style.color = 'var(--text-muted)';
    });

    modelButton.textContent = 'AI Models';

    const caret = modelButton.createEl('span');
    caret.innerHTML = Icons.chevronDown({ width: 10, height: 10 });
    caret.style.cssText = `
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--text-faint);
    `;

    this.modelButton = modelButton;

    modelButton.addEventListener('click', (event) => {
      this.showModelMenu(event);
    });

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

      // Build provider map - keep ORIGINAL provider objects for reliable lookup
      const providerMap: Record<string, Record<string, string[]>> = {};
      const providersByDisplayName: Record<string, any> = {}; // Store actual provider objects
      
      for (const provider of aiProviders.providers) {
        const providerId = provider.id || provider.name || provider.type || 'unknown';
        
        // Pass the full provider object to getProviderDisplayName for better inference
        const displayName = this.getProviderDisplayName(providerId, provider);
        
        // Store actual provider object (not just ID mapping)
        providersByDisplayName[displayName] = provider;
        
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
          // Get the actual provider object directly (no fragile reverse lookup!)
          const provider = providersByDisplayName[providerDisplayName];
          const providerId = provider.id || provider.name || provider.type || 'unknown';
          
          const selection = `${providerId}:${model}`;
          console.log(`WriterMenu: Selected ${providerDisplayName} - ${model} (${selection})`);
          console.log(`WriterMenu: Using provider ID: ${providerId} from provider:`, provider);

          this.plugin.settings.selectedModel = selection;
          this.plugin.saveSettings();
          this.updateModelButtonText(selection);
          this.updateTokenCounterFromModel(); // Refresh token counter for new model
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
    
    let displayName = '';
    if (selection && selection.includes(':')) {
      const [, model] = selection.split(':', 2);
      displayName = model;
    } else {
      displayName = 'AI Models';
    }
    
    // Manual truncation to match prompt button behavior
    const maxLength = 15; // Approximate characters that fit in 140px
    let finalText = displayName;
    let showCaret = true;
    
    if (displayName.length > maxLength) {
      finalText = displayName.substring(0, maxLength - 3) + '...';
      showCaret = false; // Don't show caret when we have ellipsis
    }
    
    this.modelButton.textContent = finalText;
    
    // Show/hide caret based on whether we manually truncated
    const caret = this.modelButton.querySelector('span');
    if (caret) {
      caret.style.display = showCaret ? 'block' : 'none';
    }
  }

  private getAvailableProvidersAndModels(): Record<string, Record<string, string[]>> {
    // This method is no longer used - keeping for compatibility
    return {};
  }

  private createPromptSelect(parent: HTMLElement): void {
    // Create WriterMenu prompt button directly without wrapper container
    this.createPromptMenuButton(parent);
  }

  private createPromptMenuButton(parent: HTMLElement): void {
    this.promptButton = parent.createEl('button');
    this.promptButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 6px 24px 6px 8px;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 4px;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      position: relative;
      font-family: inherit;
    `;

    this.promptButton.addEventListener('mouseenter', () => {
      this.promptButton.style.background = 'var(--background-modifier-hover)';
      this.promptButton.style.color = 'var(--text-normal)';
    });
    
    this.promptButton.addEventListener('mouseleave', () => {
      this.promptButton.style.background = 'transparent';
      this.promptButton.style.color = 'var(--text-muted)';
    });

    this.promptButton.textContent = 'Prompts';

    const caret = this.promptButton.createEl('span');
    caret.innerHTML = Icons.chevronDown({ width: 10, height: 10 });
    caret.style.cssText = `
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--text-faint);
    `;
    
    (this.promptButton as any).caret = caret;

    this.promptButton.addEventListener('click', (event) => {
      this.showPromptMenu(event);
    });

    this.loadPromptsForMenu();
  }

  private showPromptMenu(event: MouseEvent): void {
    try {
      if (this.availablePrompts.length === 0) {
        console.log('WriterMenu: No prompts available');
        return;
      }

      console.log(`WriterMenu: Showing menu with ${this.availablePrompts.length} prompts`);

      // Create WriterMenu using the factory method
      const menu = WriterMenuFactory.createPromptMenu(
        this.availablePrompts,
        this.plugin.settings.selectedPrompt,
        (promptPath: string) => {
          console.log(`WriterMenu: Selected prompt ${promptPath}`);
          
          // Update settings and button text
          this.plugin.settings.selectedPrompt = promptPath;
          this.plugin.saveSettings();
          this.updatePromptButtonText(promptPath);
          this.events.onPromptChange(promptPath);
        }
      );

      menu.showAtMouseEvent(event);
    } catch (error) {
      console.error('WriterMenu: Error showing prompt menu:', error);
    }
  }

  private updatePromptButtonText(selection: string): void {
    if (!this.promptButton) return;
    
    let displayName = '';
    if (selection) {
      // Find the prompt name from the path
      const prompt = this.availablePrompts.find(p => p.path === selection);
      displayName = prompt ? prompt.name : selection.split('/').pop()?.replace('.md', '') || 'Prompt';
    } else {
      displayName = 'WriterMenu Prompts';
    }
    
    // Manual truncation - if text is too long, truncate it ourselves
    const maxLength = 15; // Approximate characters that fit in 120px
    let finalText = displayName;
    let showCaret = true;
    
    if (displayName.length > maxLength) {
      finalText = displayName.substring(0, maxLength - 3) + '...';
      showCaret = false; // Don't show caret when we have ellipsis
    }
    
    this.promptButton.textContent = finalText;
    
    // Show/hide caret based on whether we manually truncated
    const caret = (this.promptButton as any).caret;
    if (caret) {
      caret.style.display = showCaret ? 'block' : 'none';
    }
  }

  private updatePromptCaretVisibility(): void {
    if (!this.promptButton) return;
    
    const caret = (this.promptButton as any).caret;
    if (!caret) return;
    
    // Use requestAnimationFrame for more reliable DOM measurement timing
    requestAnimationFrame(() => {
      // Force a reflow to ensure accurate measurements
      this.promptButton.offsetWidth;
      
      // Calculate available text space accounting for padding and caret space
      const buttonWidth = this.promptButton.clientWidth;
      const buttonStyle = getComputedStyle(this.promptButton);
      const paddingLeft = parseFloat(buttonStyle.paddingLeft);
      const paddingRight = parseFloat(buttonStyle.paddingRight);
      const availableTextWidth = buttonWidth - paddingLeft - paddingRight;
      
      // Create a temporary span to measure actual text width
      const tempSpan = document.createElement('span');
      tempSpan.style.cssText = `
        font-size: ${buttonStyle.fontSize};
        font-family: ${buttonStyle.fontFamily};
        font-weight: ${buttonStyle.fontWeight};
        visibility: hidden;
        position: absolute;
        white-space: nowrap;
      `;
      tempSpan.textContent = this.promptButton.textContent;
      document.body.appendChild(tempSpan);
      
      const textWidth = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);
      
      // Determine if text is truncated based on actual measurements
      const isTextTruncated = textWidth > availableTextWidth;
      
      if (isTextTruncated) {
        // Text is truncated (ellipsis will show) - hide caret to avoid visual clutter
        caret.style.display = 'none';
      } else {
        // Text fits completely - show caret to indicate dropdown functionality
        caret.style.display = 'flex';
      }
    });
  }

  private async loadPromptsForMenu(): Promise<void> {
    try {
      const pluginDir = this.plugin.manifest.dir;
      const promptsPath = `${pluginDir}/prompts`;
      
      console.log(`🔍 WriterMenu: Loading prompts from: ${promptsPath}`);
      
      // Use file system adapter (same as existing method)
      const adapter = this.plugin.app.vault.adapter;
      const promptsDirExists = await adapter.exists(promptsPath);
      
      if (promptsDirExists) {
        const promptFiles = await adapter.list(promptsPath);
        
        if (promptFiles.files && promptFiles.files.length > 0) {
          const mdFiles = promptFiles.files.filter(file => file.endsWith('.md'));
          
          // Build prompts array for WriterMenu
          this.availablePrompts = [];
          mdFiles.forEach(filePath => {
            const fileName = filePath.split('/').pop() || filePath;
            const baseName = fileName.replace('.md', '');
            this.availablePrompts.push({ name: baseName, path: filePath });
          });
          
          console.log(`✅ WriterMenu: Loaded ${this.availablePrompts.length} prompts:`, this.availablePrompts);
          
          // Update button text if we have a current selection
          if (this.plugin.settings.selectedPrompt) {
            this.updatePromptButtonText(this.plugin.settings.selectedPrompt);
          }
          return;
        }
      }
      
      console.log(`❌ WriterMenu: No prompts found at ${promptsPath}`);
      this.availablePrompts = [];
      
    } catch (error) {
      console.error('❌ WriterMenu: Error loading prompts:', error);
      this.availablePrompts = [];
    }
  }

  private createTokenCounter(parent: HTMLElement): void {
    this.tokenCounter = parent.createEl('span', { cls: 'writerr-token-count' });
    // Initialize with dynamic model-based calculation
    this.updateTokenCounterFromModel();
  }

  private updateTokenCounterFromModel(): void {
    if (!this.tokenCounter) return;

    // Always calculate current context usage
    const contextTokens = this.calculateContextTokens();

    // Get selected model info
    const selectedModel = this.plugin.settings.selectedModel;
    if (!selectedModel || !selectedModel.includes(':')) {
      this.tokenCounter.textContent = `${contextTokens.toLocaleString()} / no model`;
      this.tokenCounter.style.color = 'var(--text-muted)';
      return;
    }

    // Get model token limits from AI Providers
    const [providerId, modelName] = selectedModel.split(':', 2);
    const modelTokenLimit = this.getModelTokenLimit(providerId, modelName);
    
    if (!modelTokenLimit) {
      this.tokenCounter.textContent = `${contextTokens.toLocaleString()} / unavailable`;
      this.tokenCounter.style.color = 'var(--text-muted)';
      return;
    }

    // Update display with both values
    this.updateTokenCounter(contextTokens, modelTokenLimit);
  }

  private getModelTokenLimit(providerId: string, modelName: string): number | null {
    try {
      // Get AI Providers plugin
      const aiProvidersPlugin = (this.plugin.app as any).plugins?.plugins?.['ai-providers'];
      if (!aiProvidersPlugin?.aiProviders?.providers) return null;

      // Find the provider
      const provider = aiProvidersPlugin.aiProviders.providers.find((p: any) => {
        const pId = p.id || p.name || p.type || 'unknown';
        return pId === providerId;
      });

      if (!provider || !provider.models) return null;

      // Find the model and get its token limit
      const model = provider.models.find((m: any) => {
        return typeof m === 'string' ? m === modelName : m.name === modelName;
      });

      if (!model) return null;

      // Extract token limit from model info
      if (typeof model === 'object' && model.contextLength) {
        return model.contextLength;
      }

      // Fallback to common model token limits
      return this.getCommonModelTokenLimit(modelName);
    } catch (error) {
      console.warn('Error getting model token limit:', error);
      return null;
    }
  }

  private getCommonModelTokenLimit(modelName: string): number {
    const modelLower = modelName.toLowerCase();
    
    // GPT models
    if (modelLower.includes('gpt-4o')) return 128000;
    if (modelLower.includes('gpt-4-turbo')) return 128000;
    if (modelLower.includes('gpt-4')) return 8192;
    if (modelLower.includes('gpt-3.5-turbo')) return 16385;
    
    // Claude models
    if (modelLower.includes('claude-3-5-sonnet')) return 200000;
    if (modelLower.includes('claude-3-opus')) return 200000;
    if (modelLower.includes('claude-3-sonnet')) return 200000;
    if (modelLower.includes('claude-3-haiku')) return 200000;
    
    // Gemini models
    if (modelLower.includes('gemini-1.5-pro')) return 1000000;
    if (modelLower.includes('gemini-1.5-flash')) return 1000000;
    if (modelLower.includes('gemini-pro')) return 32768;
    
    // Default fallback
    return 4096;
  }

  private calculateContextTokens(): number {
    let totalTokens = 0;
    
    try {
      // Get chat view and current session
      const chatLeaf = this.plugin.app.workspace.getLeavesOfType('writerr-chat-view')[0];
      const chatView = chatLeaf?.view;
      
      if (!chatView) return 0;

      // Count tokens from conversation history
      const currentSession = this.plugin.currentSession;
      if (currentSession?.messages) {
        totalTokens += currentSession.messages.reduce((sum, msg) => {
          return sum + this.estimateTokens(msg.content);
        }, 0);
      }

      // Count tokens from context documents
      const contextArea = chatView.contextArea;
      if (contextArea) {
        const documents = contextArea.getDocuments();
        totalTokens += documents.length * 1000; // Rough estimate per document
      }

      // Count tokens from current input
      const inputArea = chatView.chatInput;
      if (inputArea && inputArea.getValue) {
        const currentInput = inputArea.getValue();
        totalTokens += this.estimateTokens(currentInput);
      }

    } catch (error) {
      console.warn('Error calculating context tokens:', error);
    }

    return totalTokens;
  }

  private estimateTokens(text: string): number {
    if (!text) return 0;
    // Rough estimation: ~4 characters per token for most models
    return Math.ceil(text.length / 4);
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


  public updateStatusIndicator(): void {
    // Status indicator removed - method kept for compatibility
    return;
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

  private updateDocumentButtonState(): void {
    if (!this.documentButton) return;
    
    // Get active document
    const activeFile = this.plugin.app.workspace.getActiveFile();
    
    if (!activeFile) {
      // No active document - gray out button
      this.documentButton.style.cssText += `
        color: var(--text-faint) !important;
        opacity: 0.5 !important;
      `;
      this.documentButton.setAttribute('aria-label', 'No active document to add');
      return;
    }

    // Check if active document is already in context using same pattern as click handler
    const chatLeaf = this.plugin.app.workspace.getLeavesOfType('writerr-chat-view')[0];
    const chatView = chatLeaf?.view;
    const contextArea = chatView?.contextArea;
    const documentsInContext = contextArea?.getDocuments() || [];
    const isInContext = documentsInContext.some((doc: any) => doc.path === activeFile.path);
    
    if (isInContext) {
      // Document already in context - HIGHLIGHTED state
      this.documentButton.style.cssText += `
        color: var(--interactive-accent) !important;
        opacity: 1 !important;
      `;
      this.documentButton.setAttribute('aria-label', `"${activeFile.name}" already in context`);
    } else {
      // Active document not in context - NORMAL state (ready to add)
      this.documentButton.style.cssText += `
        color: var(--text-muted) !important;
        opacity: 0.8 !important;
      `;
      this.documentButton.setAttribute('aria-label', `Add "${activeFile.name}" to context`);
    }
  }

  // Public method for external updates
  public refreshDocumentButton(): void {
    this.updateDocumentButtonState();
  }
}