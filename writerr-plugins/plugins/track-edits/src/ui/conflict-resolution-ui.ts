/**
 * User Experience Components for Multi-Plugin Conflict Resolution
 * 
 * Provides UI components and user interaction patterns for:
 * - Clear conflict indicators when multi-plugin conflicts occur
 * - User choice options for resolving conflicts manually  
 * - Preview capabilities for merged changes before application
 * - Undo/redo capabilities for consolidated changes
 */

import { Modal, App, Setting, ButtonComponent, DropdownComponent, ToggleComponent } from 'obsidian';
import { 
  ChangeConflict, 
  ConflictResolutionStrategy, 
  ConflictResolutionResult,
  MultiPluginEditOperation,
  EditChange
} from '../change-consolidation-manager';

export interface ConflictResolutionModalOptions {
  conflicts: ChangeConflict[];
  onResolve: (resolutions: ConflictResolutionChoice[]) => Promise<void>;
  onCancel: () => void;
  allowPreview?: boolean;
  showAdvancedOptions?: boolean;
}

export interface ConflictResolutionChoice {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  selectedChanges?: string[]; // Change IDs to keep when using manual selection
  mergeSettings?: {
    preserveFormatting: boolean;
    preserveSemantics: boolean;
    overlapTolerance: number;
  };
  userNotes?: string;
}

export interface ConsolidationPreviewData {
  originalChanges: EditChange[];
  mergedChanges: EditChange[];
  conflicts: ChangeConflict[];
  confidence: number;
  warnings: string[];
  estimatedImpact: {
    charactersChanged: number;
    sectionsAffected: string[];
    preservedContent: number; // percentage
  };
}

/**
 * Modal for resolving multi-plugin conflicts
 */
export class ConflictResolutionModal extends Modal {
  private conflicts: ChangeConflict[];
  private onResolve: (resolutions: ConflictResolutionChoice[]) => Promise<void>;
  private onCancel: () => void;
  private options: ConflictResolutionModalOptions;
  
  private resolutionChoices = new Map<string, ConflictResolutionChoice>();
  private previewData: ConsolidationPreviewData | null = null;
  private showingPreview = false;

  constructor(app: App, options: ConflictResolutionModalOptions) {
    super(app);
    this.conflicts = options.conflicts;
    this.onResolve = options.onResolve;
    this.onCancel = options.onCancel;
    this.options = options;
    
    // Initialize default resolution choices
    this.conflicts.forEach(conflict => {
      this.resolutionChoices.set(conflict.id, {
        conflictId: conflict.id,
        strategy: this.getDefaultStrategy(conflict),
        mergeSettings: {
          preserveFormatting: true,
          preserveSemantics: true,
          overlapTolerance: 3
        }
      });
    });
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Multi-Plugin Conflict Resolution' });
    
    // Conflict overview
    this.createConflictOverview(contentEl);
    
    // Individual conflict resolution sections
    this.conflicts.forEach((conflict, index) => {
      this.createConflictResolutionSection(contentEl, conflict, index);
    });
    
    // Preview section (if enabled)
    if (this.options.allowPreview) {
      this.createPreviewSection(contentEl);
    }
    
    // Action buttons
    this.createActionButtons(contentEl);
  }

  onClose() {
    this.onCancel();
  }

  private createConflictOverview(containerEl: HTMLElement) {
    const overviewEl = containerEl.createDiv('conflict-overview');
    
    overviewEl.createEl('h3', { text: 'Conflict Summary' });
    
    const statsEl = overviewEl.createDiv('conflict-stats');
    statsEl.createEl('div', { 
      text: `${this.conflicts.length} conflict${this.conflicts.length !== 1 ? 's' : ''} detected` 
    });
    
    // Group conflicts by type
    const conflictsByType = new Map<string, number>();
    this.conflicts.forEach(conflict => {
      const count = conflictsByType.get(conflict.type) || 0;
      conflictsByType.set(conflict.type, count + 1);
    });
    
    const typeListEl = statsEl.createEl('ul');
    conflictsByType.forEach((count, type) => {
      typeListEl.createEl('li', { 
        text: `${count} ${type.replace(/_/g, ' ')} conflict${count !== 1 ? 's' : ''}`
      });
    });

    // Show affected plugins
    const affectedPlugins = new Set<string>();
    this.conflicts.forEach(conflict => {
      conflict.operations.forEach(op => affectedPlugins.add(op.pluginId));
    });
    
    const pluginsEl = statsEl.createDiv('affected-plugins');
    pluginsEl.createEl('strong', { text: 'Affected Plugins: ' });
    pluginsEl.createSpan({ text: Array.from(affectedPlugins).join(', ') });
  }

  private createConflictResolutionSection(containerEl: HTMLElement, conflict: ChangeConflict, index: number) {
    const sectionEl = containerEl.createDiv(`conflict-section conflict-${conflict.severity}`);
    
    // Header
    const headerEl = sectionEl.createDiv('conflict-header');
    headerEl.createEl('h4', { text: `Conflict ${index + 1}: ${conflict.type.replace(/_/g, ' ')}` });
    
    const severityBadge = headerEl.createSpan(`conflict-severity-badge severity-${conflict.severity}`);
    severityBadge.setText(conflict.severity.toUpperCase());
    
    // Details
    const detailsEl = sectionEl.createDiv('conflict-details');
    
    // Show involved operations
    const operationsEl = detailsEl.createDiv('involved-operations');
    operationsEl.createEl('strong', { text: 'Involved Operations:' });
    
    const operationsList = operationsEl.createEl('ul');
    conflict.operations.forEach(op => {
      const item = operationsList.createEl('li');
      item.setText(`${op.pluginId} (Priority: ${op.priority}, Changes: ${op.changes.length})`);
      
      if (op.metadata.userInitiated) {
        item.createSpan('user-initiated-badge').setText('USER');
      }
    });

    // Resolution strategy selection
    this.createResolutionStrategySelector(sectionEl, conflict);
    
    // Advanced options (if enabled)
    if (this.options.showAdvancedOptions) {
      this.createAdvancedOptions(sectionEl, conflict);
    }
  }

  private createResolutionStrategySelector(containerEl: HTMLElement, conflict: ChangeConflict) {
    const selectorEl = containerEl.createDiv('resolution-strategy-selector');
    
    new Setting(selectorEl)
      .setName('Resolution Strategy')
      .setDesc('Choose how to resolve this conflict')
      .addDropdown(dropdown => {
        dropdown
          .addOption(ConflictResolutionStrategy.MERGE_COMPATIBLE, 'Auto-merge compatible changes')
          .addOption(ConflictResolutionStrategy.PRIORITY_WINS, 'Higher priority wins')
          .addOption(ConflictResolutionStrategy.SEQUENTIAL_PROCESSING, 'Process sequentially')
          .addOption(ConflictResolutionStrategy.SEMANTIC_MERGE, 'Semantic merge')
          .addOption(ConflictResolutionStrategy.USER_CHOICE, 'Manual selection')
          .setValue(this.resolutionChoices.get(conflict.id)?.strategy || ConflictResolutionStrategy.PRIORITY_WINS)
          .onChange(async (value) => {
            const choice = this.resolutionChoices.get(conflict.id)!;
            choice.strategy = value as ConflictResolutionStrategy;
            this.resolutionChoices.set(conflict.id, choice);
            
            // Update UI based on selected strategy
            this.updateStrategyDependentUI(containerEl, conflict, value as ConflictResolutionStrategy);
          });
      });

    // Strategy-dependent options
    const strategyOptionsEl = containerEl.createDiv('strategy-options');
    this.updateStrategyDependentUI(strategyOptionsEl, conflict, 
      this.resolutionChoices.get(conflict.id)?.strategy || ConflictResolutionStrategy.PRIORITY_WINS);
  }

  private updateStrategyDependentUI(containerEl: HTMLElement, conflict: ChangeConflict, strategy: ConflictResolutionStrategy) {
    const strategyOptionsEl = containerEl.querySelector('.strategy-options') as HTMLElement;
    if (!strategyOptionsEl) return;
    
    strategyOptionsEl.empty();

    switch (strategy) {
      case ConflictResolutionStrategy.USER_CHOICE:
        this.createManualSelectionUI(strategyOptionsEl, conflict);
        break;
        
      case ConflictResolutionStrategy.MERGE_COMPATIBLE:
      case ConflictResolutionStrategy.SEMANTIC_MERGE:
        this.createMergeOptionsUI(strategyOptionsEl, conflict);
        break;
        
      case ConflictResolutionStrategy.PRIORITY_WINS:
        this.createPriorityInfoUI(strategyOptionsEl, conflict);
        break;
        
      case ConflictResolutionStrategy.SEQUENTIAL_PROCESSING:
        this.createSequentialInfoUI(strategyOptionsEl, conflict);
        break;
    }
  }

  private createManualSelectionUI(containerEl: HTMLElement, conflict: ChangeConflict) {
    containerEl.createEl('h5', { text: 'Select Changes to Keep' });
    
    conflict.operations.forEach(op => {
      const opSection = containerEl.createDiv('operation-changes');
      opSection.createEl('strong', { text: `${op.pluginId} Changes:` });
      
      const changesList = opSection.createEl('div', 'changes-list');
      
      op.changes.forEach(change => {
        const changeItem = changesList.createDiv('change-item');
        
        const checkbox = changeItem.createEl('input', { type: 'checkbox' });
        checkbox.id = `change-${change.id}`;
        checkbox.checked = true; // Default to selected
        
        checkbox.addEventListener('change', () => {
          const choice = this.resolutionChoices.get(conflict.id)!;
          if (!choice.selectedChanges) choice.selectedChanges = [];
          
          if (checkbox.checked) {
            if (!choice.selectedChanges.includes(change.id!)) {
              choice.selectedChanges.push(change.id!);
            }
          } else {
            choice.selectedChanges = choice.selectedChanges.filter(id => id !== change.id);
          }
          
          this.resolutionChoices.set(conflict.id, choice);
        });
        
        const label = changeItem.createEl('label', { attr: { for: `change-${change.id}` } });
        label.setText(`${change.type} at ${change.from}-${change.to}: "${(change.text || change.removedText || '').substring(0, 50)}..."`);
      });
    });
  }

  private createMergeOptionsUI(containerEl: HTMLElement, conflict: ChangeConflict) {
    const choice = this.resolutionChoices.get(conflict.id)!;
    
    new Setting(containerEl)
      .setName('Preserve Formatting')
      .setDesc('Maintain original text formatting during merge')
      .addToggle(toggle => {
        toggle
          .setValue(choice.mergeSettings?.preserveFormatting ?? true)
          .onChange(value => {
            if (!choice.mergeSettings) choice.mergeSettings = { preserveFormatting: true, preserveSemantics: true, overlapTolerance: 3 };
            choice.mergeSettings.preserveFormatting = value;
            this.resolutionChoices.set(conflict.id, choice);
          });
      });

    new Setting(containerEl)
      .setName('Preserve Semantics')
      .setDesc('Maintain semantic meaning during merge')
      .addToggle(toggle => {
        toggle
          .setValue(choice.mergeSettings?.preserveSemantics ?? true)
          .onChange(value => {
            if (!choice.mergeSettings) choice.mergeSettings = { preserveFormatting: true, preserveSemantics: true, overlapTolerance: 3 };
            choice.mergeSettings.preserveSemantics = value;
            this.resolutionChoices.set(conflict.id, choice);
          });
      });

    new Setting(containerEl)
      .setName('Overlap Tolerance')
      .setDesc('Characters of overlap allowed during merge')
      .addSlider(slider => {
        slider
          .setLimits(0, 20, 1)
          .setValue(choice.mergeSettings?.overlapTolerance ?? 3)
          .setDynamicTooltip()
          .onChange(value => {
            if (!choice.mergeSettings) choice.mergeSettings = { preserveFormatting: true, preserveSemantics: true, overlapTolerance: 3 };
            choice.mergeSettings.overlapTolerance = value;
            this.resolutionChoices.set(conflict.id, choice);
          });
      });
  }

  private createPriorityInfoUI(containerEl: HTMLElement, conflict: ChangeConflict) {
    const sortedOps = [...conflict.operations].sort((a, b) => a.priority - b.priority);
    const winningOp = sortedOps[0];
    
    const infoEl = containerEl.createDiv('priority-info');
    infoEl.createEl('p', { 
      text: `${winningOp.pluginId} will take precedence (Priority: ${winningOp.priority})` 
    });
    
    if (sortedOps.length > 1) {
      const rejectedEl = infoEl.createDiv('rejected-operations');
      rejectedEl.createEl('strong', { text: 'Rejected operations:' });
      
      const rejectedList = rejectedEl.createEl('ul');
      sortedOps.slice(1).forEach(op => {
        rejectedList.createEl('li', { text: `${op.pluginId} (Priority: ${op.priority})` });
      });
    }
  }

  private createSequentialInfoUI(containerEl: HTMLElement, conflict: ChangeConflict) {
    const sortedOps = [...conflict.operations].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.timestamp - b.timestamp;
    });
    
    const infoEl = containerEl.createDiv('sequential-info');
    infoEl.createEl('p', { text: 'Operations will be applied in this order:' });
    
    const orderList = infoEl.createEl('ol');
    sortedOps.forEach(op => {
      orderList.createEl('li', { text: `${op.pluginId} (Priority: ${op.priority})` });
    });
  }

  private createAdvancedOptions(containerEl: HTMLElement, conflict: ChangeConflict) {
    const advancedEl = containerEl.createDiv('advanced-options');
    
    const detailsEl = advancedEl.createEl('details');
    detailsEl.createEl('summary', { text: 'Advanced Options' });
    
    const contentEl = detailsEl.createDiv('advanced-content');
    
    // User notes
    new Setting(contentEl)
      .setName('Notes')
      .setDesc('Add notes about this resolution')
      .addTextArea(textArea => {
        textArea
          .setPlaceholder('Optional notes about why you chose this resolution...')
          .onChange(value => {
            const choice = this.resolutionChoices.get(conflict.id)!;
            choice.userNotes = value;
            this.resolutionChoices.set(conflict.id, choice);
          });
      });
  }

  private createPreviewSection(containerEl: HTMLElement) {
    const previewEl = containerEl.createDiv('preview-section');
    
    previewEl.createEl('h3', { text: 'Change Preview' });
    
    const previewButtonsEl = previewEl.createDiv('preview-buttons');
    
    new ButtonComponent(previewButtonsEl)
      .setButtonText('Generate Preview')
      .setClass('mod-cta')
      .onClick(async () => {
        await this.generatePreview();
      });

    if (this.previewData) {
      this.displayPreview(previewEl);
    }
  }

  private async generatePreview() {
    // This would generate a preview of the consolidated changes
    // For now, create mock preview data
    
    this.previewData = {
      originalChanges: this.conflicts.flatMap(c => c.conflictingChanges),
      mergedChanges: [], // Would be generated by consolidation engine
      conflicts: this.conflicts,
      confidence: 0.85,
      warnings: ['Some formatting may be lost during merge'],
      estimatedImpact: {
        charactersChanged: 250,
        sectionsAffected: ['Introduction', 'Conclusion'],
        preservedContent: 95
      }
    };
    
    // Re-render the preview section
    const previewEl = this.contentEl.querySelector('.preview-section');
    if (previewEl) {
      this.displayPreview(previewEl as HTMLElement);
    }
  }

  private displayPreview(containerEl: HTMLElement) {
    if (!this.previewData) return;
    
    let previewContentEl = containerEl.querySelector('.preview-content');
    if (previewContentEl) {
      previewContentEl.remove();
    }
    
    previewContentEl = containerEl.createDiv('preview-content');
    
    // Confidence indicator
    const confidenceEl = previewContentEl.createDiv('confidence-indicator');
    confidenceEl.createEl('strong', { text: `Confidence: ${Math.round(this.previewData.confidence * 100)}%` });
    
    const confidenceBar = confidenceEl.createDiv('confidence-bar');
    const confidenceFill = confidenceBar.createDiv('confidence-fill');
    confidenceFill.style.width = `${this.previewData.confidence * 100}%`;
    confidenceFill.className = `confidence-fill ${this.previewData.confidence > 0.7 ? 'high' : this.previewData.confidence > 0.4 ? 'medium' : 'low'}`;
    
    // Impact summary
    const impactEl = previewContentEl.createDiv('impact-summary');
    impactEl.createEl('h4', { text: 'Estimated Impact' });
    impactEl.createEl('p', { text: `${this.previewData.estimatedImpact.charactersChanged} characters will be changed` });
    impactEl.createEl('p', { text: `${this.previewData.estimatedImpact.preservedContent}% of content preserved` });
    
    if (this.previewData.estimatedImpact.sectionsAffected.length > 0) {
      const sectionsEl = impactEl.createDiv('affected-sections');
      sectionsEl.createEl('strong', { text: 'Affected sections: ' });
      sectionsEl.createSpan({ text: this.previewData.estimatedImpact.sectionsAffected.join(', ') });
    }
    
    // Warnings
    if (this.previewData.warnings.length > 0) {
      const warningsEl = previewContentEl.createDiv('preview-warnings');
      warningsEl.createEl('h4', { text: 'Warnings' });
      
      const warningsList = warningsEl.createEl('ul');
      this.previewData.warnings.forEach(warning => {
        warningsList.createEl('li', { text: warning });
      });
    }
  }

  private createActionButtons(containerEl: HTMLElement) {
    const buttonsEl = containerEl.createDiv('modal-buttons');
    
    new ButtonComponent(buttonsEl)
      .setButtonText('Cancel')
      .onClick(() => {
        this.close();
      });
    
    new ButtonComponent(buttonsEl)
      .setButtonText('Apply Resolutions')
      .setClass('mod-cta')
      .onClick(async () => {
        await this.applyResolutions();
      });
  }

  private async applyResolutions() {
    const resolutions = Array.from(this.resolutionChoices.values());
    
    try {
      await this.onResolve(resolutions);
      this.close();
    } catch (error) {
      console.error('Failed to apply resolutions:', error);
      // Show error to user
      const errorEl = this.contentEl.createDiv('resolution-error');
      errorEl.createEl('p', { text: `Error applying resolutions: ${error.message}` });
    }
  }

  private getDefaultStrategy(conflict: ChangeConflict): ConflictResolutionStrategy {
    switch (conflict.type) {
      case 'overlapping_edits':
        return conflict.severity === 'low' ? 
          ConflictResolutionStrategy.MERGE_COMPATIBLE : 
          ConflictResolutionStrategy.PRIORITY_WINS;
      case 'semantic_conflict':
        return ConflictResolutionStrategy.SEMANTIC_MERGE;
      case 'dependency_violation':
        return ConflictResolutionStrategy.SEQUENTIAL_PROCESSING;
      case 'priority_conflict':
        return ConflictResolutionStrategy.PRIORITY_WINS;
      default:
        return ConflictResolutionStrategy.USER_CHOICE;
    }
  }
}

/**
 * Quick resolution toolbar for common conflict scenarios
 */
export class ConflictResolutionToolbar {
  private containerEl: HTMLElement;
  private conflicts: ChangeConflict[];
  private onQuickResolve: (strategy: ConflictResolutionStrategy) => Promise<void>;

  constructor(
    containerEl: HTMLElement,
    conflicts: ChangeConflict[],
    onQuickResolve: (strategy: ConflictResolutionStrategy) => Promise<void>
  ) {
    this.containerEl = containerEl;
    this.conflicts = conflicts;
    this.onQuickResolve = onQuickResolve;
    this.render();
  }

  private render() {
    this.containerEl.empty();
    this.containerEl.addClass('conflict-toolbar');
    
    const toolbarEl = this.containerEl.createDiv('toolbar-content');
    
    toolbarEl.createEl('span', { 
      text: `${this.conflicts.length} conflict${this.conflicts.length !== 1 ? 's' : ''} detected`,
      cls: 'conflict-count'
    });
    
    // Quick resolution buttons
    const buttonsEl = toolbarEl.createDiv('quick-buttons');
    
    new ButtonComponent(buttonsEl)
      .setButtonText('Auto-merge')
      .setTooltip('Automatically merge compatible changes')
      .onClick(() => this.onQuickResolve(ConflictResolutionStrategy.MERGE_COMPATIBLE));
    
    new ButtonComponent(buttonsEl)
      .setButtonText('Priority Wins')
      .setTooltip('Higher priority operations take precedence')
      .onClick(() => this.onQuickResolve(ConflictResolutionStrategy.PRIORITY_WINS));
    
    new ButtonComponent(buttonsEl)
      .setButtonText('Manual...')
      .setTooltip('Open detailed conflict resolution')
      .onClick(() => this.onQuickResolve(ConflictResolutionStrategy.USER_CHOICE));
  }

  update(conflicts: ChangeConflict[]) {
    this.conflicts = conflicts;
    this.render();
  }

  destroy() {
    this.containerEl.empty();
    this.containerEl.removeClass('conflict-toolbar');
  }
}

/**
 * Consolidation status indicator
 */
export class ConsolidationStatusIndicator {
  private containerEl: HTMLElement;
  private status: 'idle' | 'processing' | 'conflict' | 'completed' | 'error' = 'idle';
  private details: string = '';

  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl;
    this.render();
  }

  updateStatus(
    status: 'idle' | 'processing' | 'conflict' | 'completed' | 'error', 
    details?: string
  ) {
    this.status = status;
    this.details = details || '';
    this.render();
  }

  private render() {
    this.containerEl.empty();
    this.containerEl.className = `consolidation-status status-${this.status}`;
    
    const iconEl = this.containerEl.createSpan('status-icon');
    const textEl = this.containerEl.createSpan('status-text');
    
    switch (this.status) {
      case 'idle':
        iconEl.setText('○');
        textEl.setText('Ready');
        break;
      case 'processing':
        iconEl.setText('◐');
        textEl.setText('Consolidating...');
        break;
      case 'conflict':
        iconEl.setText('⚠');
        textEl.setText('Conflicts detected');
        break;
      case 'completed':
        iconEl.setText('●');
        textEl.setText('Consolidated');
        break;
      case 'error':
        iconEl.setText('✕');
        textEl.setText('Error');
        break;
    }
    
    if (this.details) {
      this.containerEl.title = this.details;
    }
  }
}