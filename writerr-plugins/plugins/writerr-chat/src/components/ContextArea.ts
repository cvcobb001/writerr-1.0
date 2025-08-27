import { BaseComponent } from './BaseComponent';
import { ComponentOptions, ContextAreaEvents, DocumentContext } from './types';
import { Icons, ICON_STYLES } from '../utils/icons';
import { WriterMenu } from './menus/WriterMenu';

interface ContextAreaOptions extends ComponentOptions {
  events: ContextAreaEvents;
}

export class ContextArea extends BaseComponent {
  private events: ContextAreaEvents;
  private documentsContainer: HTMLElement;
  private contextHeader: HTMLElement;
  private clearButton: HTMLElement | null = null; // Add reference to clear button
  private isCollapsed: boolean = false;
  private documents: DocumentContext[] = [];

  constructor(options: ContextAreaOptions) {
    super(options);
    this.events = options.events;
    this.isCollapsed = true; // Default to closed
  }

  render(): void {
    this.createContextArea();
    this.createHeader();
    this.createDocumentsContainer();
    
    // Start empty and collapsed - no demo documents
  }

  private createContextArea(): void {
    this.container.style.cssText = `
      transition: all 0.3s ease;
      overflow: hidden;
      border-top: 1px solid var(--background-modifier-border);
      margin: 0;
      width: 100%;
    `;
    this.updateContextAreaStyling();
  }

  private updateContextAreaStyling(): void {
    // Never show background - always transparent
    this.container.style.background = 'transparent';
    
    if (this.isCollapsed) {
      this.container.style.borderTop = 'none';
    } else {
      this.container.style.borderTop = '1px solid var(--background-modifier-border)';
    }
  }

  private createHeader(): void {
    this.contextHeader = this.createElement('div', { cls: 'context-header' });
    this.contextHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
    `;

    // LEFT SECTION - Toggle and label
    const leftSection = this.contextHeader.createEl('div');
    leftSection.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1;';

    // Collapse/expand icon using centralized system
    const collapseIcon = leftSection.createEl('div', { cls: 'context-collapse-icon' });
    collapseIcon.innerHTML = Icons.chevronDown({ width: 14, height: 14 });
    collapseIcon.style.cssText = `
      transition: transform 0.3s ease;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      transform: ${this.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};
    `;

    const contextLabel = leftSection.createEl('span', { text: 'Context' });
    contextLabel.style.cssText = `
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    `;

    // Document count badge
    const countBadge = leftSection.createEl('span', { cls: 'context-count-badge' });
    this.updateCountBadge(countBadge);

    // RIGHT SECTION - Add button FAR RIGHT where it belongs
    const rightSection = this.contextHeader.createEl('div');
    rightSection.style.cssText = 'display: flex; align-items: center; flex-shrink: 0;';

    // Add document button using PLUS icon with unified tooltip
    const addDocButton = rightSection.createEl('button', { cls: 'context-add-button' });
    addDocButton.innerHTML = Icons.plus({ width: 16, height: 16 });
    addDocButton.onclick = (e) => {
      e.stopPropagation();
      // NEW: Show WriterMenu directory picker instead of modal
      this.showDirectoryMenu(e as MouseEvent);
    };

    // Add unified tooltip
    this.addTooltip(addDocButton, 'Add document to context');

    // Header click to toggle collapse (but not on button)
    this.contextHeader.onclick = (e) => {
      if (e.target !== addDocButton && !addDocButton.contains(e.target as Node)) {
        this.toggleCollapse();
      }
    };

    this.addHoverEffect(this.contextHeader, {
      'background-color': 'var(--background-modifier-hover)'
    });
  }

  private createDocumentsContainer(): void {
    this.documentsContainer = this.createElement('div', {
      cls: 'context-documents',
      styles: {
        padding: '0 16px 12px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        minHeight: '40px', // Minimum height to show clear button
        transition: 'all 0.3s ease',
        position: 'relative',
        height: this.isCollapsed ? '0' : 'auto'
      }
    });

    if (this.isCollapsed) {
      this.documentsContainer.style.padding = '0 16px';
    }

    // Add clear button inside the container (only visible when open)
    this.createClearButton();
  }

  private createClearButton(): void {
    this.clearButton = this.documentsContainer.createEl('button', { cls: 'writerr-context-action' });
    this.clearButton.onclick = (e) => {
      e.stopPropagation();
      this.clearAllDocuments();
    };

    // Larger paintbrush icon - 18px instead of 14px
    this.clearButton.innerHTML = Icons.paintbrush({ 
      className: 'writerr-context-action-icon', 
      width: 18, 
      height: 18 
    });

    // Add unified tooltip
    this.addTooltip(this.clearButton, 'Clear all context');
    
    // Set initial state
    this.updateClearButtonState();
  }

  private styleActionButton(button: HTMLButtonElement): void {
    button.style.cssText = `
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;

    this.addHoverEffect(button, {
      'background-color': 'var(--background-modifier-hover)',
      'color': 'var(--text-normal)'
    });
  }

  public addDocument(doc: DocumentContext): void {
    // Check if document already exists
    if (this.documents.some(d => d.path === doc.path)) return;

    this.documents.push(doc);
    this.createDocumentChip(doc);
    this.updateCountBadge();
    this.events.onDocumentAdd(doc);

    // Update clear button state
    this.updateClearButtonState();

    // Removed auto-expand - let user control collapse state manually
  }

  public removeDocumentByPath(doc: DocumentContext): void {
    // Find the document chip element
    const chipElements = Array.from(this.documentsContainer.children)
      .filter(child => child !== this.clearButton) as HTMLElement[];
    
    // Find the chip that corresponds to this document
    const chipEl = chipElements.find(chip => {
      const docName = chip.querySelector('span:nth-child(2)')?.textContent;
      return docName === doc.name;
    });
    
    if (chipEl) {
      this.removeDocument(doc, chipEl);
    } else {
      // Fallback: just remove from array if chip not found
      this.documents = this.documents.filter(d => d.path !== doc.path);
      this.updateCountBadge();
      this.updateClearButtonState();
      this.events.onDocumentRemove(doc);
    }
  }

  private createDocumentChip(doc: DocumentContext): void {
    const docChip = this.documentsContainer.createEl('div', { cls: 'context-document-chip' });
    docChip.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 16px;
      font-size: 12px;
      color: var(--text-normal);
      cursor: pointer;
      max-width: 200px;
      transition: all 0.2s ease;
      animation: slideIn 0.3s ease;
    `;

    // Add slideIn animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);

    const docIcon = docChip.createEl('span');
    docIcon.innerHTML = Icons.filePlus2({ width: 12, height: 12 });
    docIcon.style.cssText = 'color: var(--text-muted); flex-shrink: 0;';

    const docName = docChip.createEl('span', { text: doc.name });
    docName.style.cssText = `
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    `;

    const removeBtn = docChip.createEl('button');
    removeBtn.innerHTML = Icons.x({ width: 12, height: 12 });
    removeBtn.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 2px;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      flex-shrink: 0;
      transition: all 0.2s ease;
    `;

    // Document chip interactions
    docChip.onclick = (e) => {
      if (e.target !== removeBtn && !removeBtn.contains(e.target as Node)) {
        this.events.onDocumentOpen(doc);
      }
    };

    removeBtn.onclick = (e) => {
      e.stopPropagation();
      this.removeDocument(doc, docChip);
    };

    // Hover effects - lighter/more opaque background
    this.addHoverEffect(docChip, {
      'background-color': 'var(--background-secondary)',
      'transform': 'translateY(-1px)',
      'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.08)',
      'border-color': 'var(--background-modifier-border-hover)'
    });

    this.addHoverEffect(removeBtn, {
      'background-color': 'var(--background-modifier-error)',
      'color': 'var(--text-on-accent)'
    });
  }

  private removeDocument(doc: DocumentContext, chipEl: HTMLElement): void {
    // Remove from documents array
    this.documents = this.documents.filter(d => d.path !== doc.path);
    
    // Animate out and remove
    chipEl.style.animation = 'slideOut 0.2s ease forwards';
    
    const slideOutStyle = document.createElement('style');
    slideOutStyle.textContent = `
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(-10px) scale(0.8);
        }
      }
    `;
    document.head.appendChild(slideOutStyle);

    setTimeout(() => {
      chipEl.remove();
      document.head.removeChild(slideOutStyle);
    }, 200);

    this.updateCountBadge();
    this.updateClearButtonState();
    this.events.onDocumentRemove(doc);
  }

  private clearAllDocuments(): void {
    // Only remove document chips, not the clear button itself
    const chips = Array.from(this.documentsContainer.children)
      .filter(child => child !== this.clearButton);
    
    chips.forEach((chip, index) => {
      setTimeout(() => {
        chip.remove();
      }, index * 50);
    });

    this.documents.forEach(doc => {
      this.events.onDocumentRemove(doc);
    });

    this.documents = [];
    this.updateCountBadge();
    
    // Gray out clear button when no documents remain
    this.updateClearButtonState();
  }

  private updateCountBadge(badgeEl?: HTMLElement): void {
    const badge = badgeEl || this.container.querySelector('.context-count-badge') as HTMLElement;
    if (!badge) {
      console.warn('Context count badge element not found');
      return;
    }

    const count = this.documents.length;
    console.log(`Updating context count badge: ${count} documents`);
    
    if (count > 0) {
      badge.textContent = count.toString();
      badge.style.cssText = `
        display: inline-block !important;
        background: var(--interactive-accent);
        color: white !important;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 8px;
        font-weight: 500;
        min-width: 16px;
        text-align: center;
      `;
    } else {
      badge.textContent = '';
      badge.style.cssText = 'display: none;';
    }
  }

  private updateClearButtonState(): void {
    console.log('updateClearButtonState called, documents:', this.documents.length);
    console.log('clearButton exists:', !!this.clearButton);
    
    if (!this.clearButton) return;
    
    const hasDocuments = this.documents.length > 0;
    
    if (hasDocuments) {
      // Enable button - normal appearance
      console.log('Enabling clear button');
      this.clearButton.style.opacity = '1';
      this.clearButton.style.cursor = 'pointer';
      this.clearButton.style.pointerEvents = 'auto';
    } else {
      // Disable button - grayed out
      console.log('Disabling clear button (gray out)');
      this.clearButton.style.opacity = '0.5';
      this.clearButton.style.cursor = 'not-allowed';
      this.clearButton.style.pointerEvents = 'none';
    }
  }

  private toggleCollapse(): void {
    console.log('toggleCollapse called, isCollapsed:', this.isCollapsed, '-> will be:', !this.isCollapsed);
    
    this.isCollapsed = !this.isCollapsed;
    
    const collapseIcon = this.contextHeader.querySelector('.context-collapse-icon') as HTMLElement;
    
    if (this.isCollapsed) {
      console.log('Collapsing context area - hiding clear button');
      this.documentsContainer.style.height = '0';
      this.documentsContainer.style.padding = '0';
      this.documentsContainer.style.overflow = 'hidden';
      this.documentsContainer.style.opacity = '0';
      collapseIcon.style.transform = 'rotate(-90deg)';
      if (this.clearButton) this.clearButton.style.display = 'none';
    } else {
      console.log('Expanding context area - showing clear button');
      this.documentsContainer.style.height = 'auto';
      this.documentsContainer.style.padding = '0 16px 12px 16px';
      this.documentsContainer.style.overflow = 'visible';
      this.documentsContainer.style.opacity = '1';
      collapseIcon.style.transform = 'rotate(0deg)';
      if (this.clearButton) this.clearButton.style.display = 'flex';
    }

    // Update background/border styling based on collapsed state
    this.updateContextAreaStyling();
  }

  private showDocumentPicker(): void {
    // Create document picker modal
    const overlay = this.container.createEl('div', { cls: 'document-picker-overlay' });
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    `;

    const modal = overlay.createEl('div', { cls: 'document-picker-modal' });
    modal.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 12px;
      padding: 24px;
      min-width: 400px;
      max-height: 500px;
      overflow-y: auto;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      animation: modalSlideIn 0.3s ease;
    `;

    // Add modal animation
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(modalStyle);

    this.createDocumentPickerContent(modal, overlay, modalStyle);

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        document.head.removeChild(modalStyle);
      }
    };
  }

  private showDirectoryMenu(event: MouseEvent): void {
    try {
      console.log('🔍 Building directory menu for file selection');
      
      // Build directory structure from vault files
      const directoryMap = this.buildDirectoryMap();
      
      if (Object.keys(directoryMap).length === 0) {
        console.log('No directories found in vault');
        return;
      }

      // Create WriterMenu with Directory → Subdirectory → File hierarchy
      const menu = this.createDirectoryMenu(directoryMap);
      
      menu.showAtMouseEvent(event);
    } catch (error) {
      console.error('WriterMenu: Error showing directory menu:', error);
      // Fallback to original modal if WriterMenu fails
      this.showDocumentPicker();
    }
  }

  private buildDirectoryMap(): Record<string, string[]> {
    const directoryMap: Record<string, string[]> = {};
    
    // Get all files from vault (not just markdown)
    console.log('🏛️ Vault info:', this.plugin.app.vault.getName());
    console.log('🏛️ Vault adapter:', this.plugin.app.vault.adapter.constructor.name);
    
    const allFiles = this.plugin.app.vault.getAllLoadedFiles();
    
    // Define supported file extensions
    const supportedExtensions = [
      // Documents
      '.md', '.txt', '.pdf', '.doc', '.docx', '.rtf', '.odt',
      // Spreadsheets  
      '.xls', '.xlsx', '.csv',
      // Code files
      '.js', '.ts', '.json', '.html', '.css', '.scss', '.less',
      '.py', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go',
      '.rs', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh',
      '.xml', '.yaml', '.yml', '.toml', '.ini', '.env',
      // Creative writing
      '.highland', '.fountain', '.celtx',
      // Other
      '.log', '.config'
    ];
    
    // Filter for supported file types (exclude directories)
    const supportedFiles = allFiles.filter(file => {
      // Skip directories (they don't have extensions)
      if (!file.path.includes('.')) return false;
      
      const extension = '.' + file.path.split('.').pop()?.toLowerCase();
      return supportedExtensions.includes(extension);
    });
    
    console.log(`🔍 Processing ${supportedFiles.length} supported files from ${allFiles.length} total files`);
    console.log('📋 Supported extensions:', supportedExtensions);
    console.log('📋 Sample files:', supportedFiles.slice(0, 10).map(f => f.path));
    
    for (const file of supportedFiles) {
      const pathParts = file.path.split('/');
      console.log(`   Processing: ${file.path} -> ${pathParts.length} parts:`, pathParts);
      
      if (pathParts.length === 1) {
        // Root level file
        if (!directoryMap['Root']) {
          directoryMap['Root'] = [];
        }
        directoryMap['Root'].push(file.path);
        console.log(`     Added to Root: ${file.path}`);
      } else {
        // File in directory - use the full directory path as the key
        const directoryPath = pathParts.slice(0, -1).join('/');
        
        if (!directoryMap[directoryPath]) {
          directoryMap[directoryPath] = [];
          console.log(`     Created new directory: ${directoryPath}`);
        }
        
        directoryMap[directoryPath].push(file.path);
        console.log(`     Added to ${directoryPath}: ${file.path}`);
      }
    }
    
    console.log('🗂️ FINAL directory map with', Object.keys(directoryMap).length, 'directories');
    console.log('📁 ALL Directories found:');
    Object.keys(directoryMap).forEach(dir => {
      console.log(`   ${dir}: ${directoryMap[dir].length} files`);
      console.log(`      Files:`, directoryMap[dir].slice(0, 3), directoryMap[dir].length > 3 ? '...' : '');
    });
    return directoryMap;
  }


  private createDirectoryMenu(directoryMap: Record<string, string[]>): WriterMenu {
    const menu = new WriterMenu({
      style: 'refined',
      spacing: 'comfortable',
      className: 'writerr-directory-menu'
    });

    console.log(`🎨 Creating menu with ${Object.keys(directoryMap).length} directories`);

    // Build Directory → File hierarchy (like Provider → Model)
    for (const [directoryName, files] of Object.entries(directoryMap)) {
      console.log(`   🎨 Adding directory submenu: ${directoryName} (${files.length} files)`);
      
      menu.addSubmenu(directoryName, (fileSubmenu) => {
        files.forEach(filePath => {
          const fileName = filePath.split('/').pop() || filePath;
          
          console.log(`      📄 Adding file item: ${fileName} -> ${filePath}`);
          
          fileSubmenu.addItem(fileName, () => {
            console.log(`📄 Selected file: ${filePath}`);
            this.addDocumentFromPath(filePath);
          });
        });
      });
    }

    console.log('🎨 Menu creation completed');
    return menu;
  }

  private addDocumentFromPath(filePath: string): void {
    // Find the TFile object for this path
    const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
    
    if (!file) {
      console.error('File not found:', filePath);
      return;
    }

    // Create DocumentContext object
    const doc: DocumentContext = {
      path: file.path,
      name: file.name.replace('.md', ''),
      content: '' // Will be loaded when needed
    };

    // Add to context using existing method
    this.addDocument(doc);
  }

  private createDocumentPickerContent(modal: HTMLElement, overlay: HTMLElement, styleEl: HTMLStyleElement): void {
    const header = modal.createEl('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';
    
    const title = header.createEl('h3', { text: 'Attach Document' });
    title.style.cssText = 'margin: 0; color: var(--text-normal);';

    const closeButton = header.createEl('button');
    closeButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18"/>
        <path d="M6 6l12 12"/>
      </svg>
    `;
    closeButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    `;
    closeButton.onclick = () => {
      overlay.remove();
      document.head.removeChild(styleEl);
    };

    this.addHoverEffect(closeButton, {
      'background-color': 'var(--background-modifier-hover)',
      'color': 'var(--text-normal)'
    });

    // Search input
    const searchInput = modal.createEl('input', { 
      type: 'text',
      placeholder: 'Search documents...'
    });
    searchInput.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      background: var(--background-primary);
      color: var(--text-normal);
      margin-bottom: 16px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s ease;
    `;

    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = 'var(--interactive-accent)';
    });

    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = 'var(--background-modifier-border)';
    });

    // Document list
    const docList = modal.createEl('div');
    
    // Get vault files
    const files = this.plugin.app.vault.getMarkdownFiles();
    const recentFiles = files.slice(0, 10);

    recentFiles.forEach(file => {
      const docItem = docList.createEl('div');
      docItem.style.cssText = `
        padding: 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.2s ease;
      `;

      docItem.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>
        <div>
          <div style="font-weight: 500; color: var(--text-normal);">${file.basename}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${file.path}</div>
        </div>
      `;

      docItem.onclick = () => {
        this.addDocument({ name: file.basename + '.md', path: file.path });
        overlay.remove();
        document.head.removeChild(styleEl);
      };

      this.addHoverEffect(docItem, {
        'background-color': 'var(--background-modifier-hover)',
        'border-color': 'var(--interactive-accent)',
        'transform': 'translateY(-1px)'
      });
    });

    searchInput.focus();
  }

  public getDocuments(): DocumentContext[] {
    return [...this.documents];
  }
}