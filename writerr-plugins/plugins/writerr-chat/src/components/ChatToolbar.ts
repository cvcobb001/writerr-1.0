import { setIcon } from 'obsidian';
import { BaseComponent, ComponentOptions } from './BaseComponent';

interface ChatToolbarOptions extends ComponentOptions {
  events: ChatToolbarEvents;
}

export interface ChatToolbarEvents {
  onAddDocument: () => void;
  onCopyChat: () => void;
  onClearChat: () => void;
  onModelChange: (model: string) => void;
  onPromptChange: (prompt: string) => void;
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

    // Add document button - Lucide FilePlus2
    this.createActionButton(leftContainer, 'Add document to chat', `
      <svg class="writerr-toolbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <path d="M12 11v6"/>
        <path d="M9 14h6"/>
      </svg>
    `, () => this.events.onAddDocument());

    // Copy chat button - Lucide Copy
    this.createActionButton(leftContainer, 'Copy entire chat', `
      <svg class="writerr-toolbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    `, () => this.events.onCopyChat());

    // Clear chat button - Lucide Paintbrush
    this.createActionButton(leftContainer, 'Clear chat', `
      <svg class="writerr-toolbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/>
        <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/>
        <path d="M14.5 17.5 4.5 15"/>
      </svg>
    `, () => this.events.onClearChat());
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

  private createActionButtonWithIcon(parent: HTMLElement, tooltip: string, iconName: string, onClick: () => void): void {
    const button = parent.createEl('button');
    
    // Use Obsidian's setIcon with proper fallback chain
    const iconContainer = button.createEl('div');
    const iconOptions = [iconName, 'brush-cleaning', 'broom', 'brush'];
    
    let iconSet = false;
    for (const icon of iconOptions) {
      try {
        setIcon(iconContainer, icon);
        iconSet = true;
        break;
      } catch {
        continue;
      }
    }
    
    if (!iconSet) {
      // Final fallback - broom emoji
      iconContainer.textContent = '🧹';
    }
    
    button.title = tooltip;
    button.setAttribute('data-tooltip', tooltip);
    button.onclick = onClick;

    button.style.cssText = `
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      cursor: pointer !important;
      color: var(--text-muted) !important;
      padding: 4px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: color 0.2s ease !important;
    `;

    this.addHoverEffect(button, {
      'color': 'var(--text-normal)'
    });
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

    // Add caret
    const caret = modelContainer.createEl('div');
    caret.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,9 12,15 18,9"></polyline>
      </svg>
    `;
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

    // Add caret
    const caret = promptContainer.createEl('div');
    caret.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,9 12,15 18,9"></polyline>
      </svg>
    `;
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
    // Nested provider structure
    const providers = {
      'OpenAI': {
        'GPT-4': ['gpt-4', 'gpt-4-turbo', 'gpt-4-turbo-preview'],
        'GPT-3.5': ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k']
      },
      'Anthropic': {
        'Claude-3': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        'Claude-2': ['claude-2', 'claude-2.1']
      },
      'Google': {
        'Gemini': ['gemini-pro', 'gemini-pro-vision']
      }
    };

    // Add default option
    this.modelSelect.createEl('option', { value: '', text: 'Select Model' });

    for (const [provider, families] of Object.entries(providers)) {
      const providerGroup = this.modelSelect.createEl('optgroup', { label: provider });
      
      for (const [family, models] of Object.entries(families)) {
        const familyGroup = this.modelSelect.createEl('optgroup', { label: `  ${family}` });
        
        models.forEach(model => {
          familyGroup.createEl('option', { value: model, text: `    ${model}` });
        });
      }
    }
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