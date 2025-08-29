/**
 * Writer-Centric Batch Presentation UI
 * Task 2.4: Platform Integration - Writer-centric batch presentation and control
 * 
 * Provides intuitive UI components for writers to understand and control
 * batched Editorial Engine operations with logical grouping and hierarchical display.
 */

import { Component, ButtonComponent, El, MarkdownRenderer } from 'obsidian';
import { 
  ChangeGroupMetadata, 
  EditorialOperationType, 
  BatchOperationResult 
} from '../types/submit-changes-from-ai';
import { ChangeBatchManager } from '../change-batch-manager';

/**
 * Batch presentation options for customizing display
 */
export interface BatchPresentationOptions {
  showHierarchy: boolean;
  groupByOperation: boolean;
  showStatistics: boolean;
  enableBulkActions: boolean;
  compactView: boolean;
  showConfidenceScores: boolean;
}

/**
 * Writer-friendly batch UI component for managing Editorial Engine changes
 */
export class BatchPresentationUI extends Component {
  private containerEl: HTMLElement;
  private batchManager: ChangeBatchManager;
  private sessionId: string;
  private options: BatchPresentationOptions;
  private onBatchAction?: (action: string, groupId: string, result: BatchOperationResult) => void;

  constructor(
    containerEl: HTMLElement,
    batchManager: ChangeBatchManager,
    sessionId: string,
    options: Partial<BatchPresentationOptions> = {}
  ) {
    super();
    this.containerEl = containerEl;
    this.batchManager = batchManager;
    this.sessionId = sessionId;
    this.options = {
      showHierarchy: true,
      groupByOperation: true,
      showStatistics: true,
      enableBulkActions: true,
      compactView: false,
      showConfidenceScores: true,
      ...options
    };
  }

  /**
   * Set callback for batch actions
   */
  public onBatchActionCallback(callback: (action: string, groupId: string, result: BatchOperationResult) => void): void {
    this.onBatchAction = callback;
  }

  /**
   * Render the complete batch presentation UI
   */
  public render(): void {
    this.containerEl.empty();
    this.containerEl.addClass('batch-presentation-ui');

    const batches = this.batchManager.getSessionBatches(this.sessionId);
    
    if (batches.length === 0) {
      this.renderNoBatchesMessage();
      return;
    }

    // Render session statistics if enabled
    if (this.options.showStatistics) {
      this.renderSessionStatistics(batches);
    }

    // Render bulk actions if enabled
    if (this.options.enableBulkActions) {
      this.renderBulkActions(batches);
    }

    // Render batch groups
    if (this.options.groupByOperation) {
      this.renderGroupedByOperation(batches);
    } else {
      this.renderBatchList(batches);
    }
  }

  /**
   * Render message when no batches exist
   */
  private renderNoBatchesMessage(): void {
    const messageEl = this.containerEl.createEl('div', { cls: 'batch-no-data' });
    messageEl.createEl('h3', { text: 'No Editorial Changes' });
    messageEl.createEl('p', { 
      text: 'When Editorial Engine makes batched changes, they will appear here for review and control.' 
    });
  }

  /**
   * Render session statistics summary
   */
  private renderSessionStatistics(batches: ChangeGroupMetadata[]): void {
    const stats = this.batchManager.getSessionBatchStatistics(this.sessionId);
    const statsEl = this.containerEl.createEl('div', { cls: 'batch-session-stats' });
    
    statsEl.createEl('h3', { text: 'Session Overview' });
    
    const statsGrid = statsEl.createEl('div', { cls: 'stats-grid' });
    
    this.createStatItem(statsGrid, 'Total Batches', stats.totalBatches.toString());
    this.createStatItem(statsGrid, 'Total Changes', stats.totalChanges.toString());
    this.createStatItem(statsGrid, 'Average Batch Size', stats.averageBatchSize.toFixed(1));
    
    // Status breakdown
    const statusEl = statsGrid.createEl('div', { cls: 'stat-item status-breakdown' });
    statusEl.createEl('label', { text: 'Status' });
    const statusContent = statusEl.createEl('div', { cls: 'status-content' });
    
    if (stats.pendingBatches > 0) {
      statusContent.createEl('span', { 
        cls: 'status-badge pending', 
        text: `${stats.pendingBatches} Pending` 
      });
    }
    if (stats.acceptedBatches > 0) {
      statusContent.createEl('span', { 
        cls: 'status-badge accepted', 
        text: `${stats.acceptedBatches} Accepted` 
      });
    }
    if (stats.rejectedBatches > 0) {
      statusContent.createEl('span', { 
        cls: 'status-badge rejected', 
        text: `${stats.rejectedBatches} Rejected` 
      });
    }
    if (stats.mixedBatches > 0) {
      statusContent.createEl('span', { 
        cls: 'status-badge mixed', 
        text: `${stats.mixedBatches} Mixed` 
      });
    }
  }

  /**
   * Create a stat item element
   */
  private createStatItem(parent: HTMLElement, label: string, value: string): void {
    const item = parent.createEl('div', { cls: 'stat-item' });
    item.createEl('label', { text: label });
    item.createEl('span', { cls: 'stat-value', text: value });
  }

  /**
   * Render bulk action controls
   */
  private renderBulkActions(batches: ChangeGroupMetadata[]): void {
    const pendingBatches = batches.filter(b => b.status === 'pending');
    if (pendingBatches.length === 0) return;

    const bulkEl = this.containerEl.createEl('div', { cls: 'batch-bulk-actions' });
    bulkEl.createEl('h4', { text: 'Bulk Actions' });
    
    const actionsEl = bulkEl.createEl('div', { cls: 'bulk-action-buttons' });
    
    // Accept all pending
    new ButtonComponent(actionsEl)
      .setButtonText(`Accept All (${pendingBatches.length})`)
      .setIcon('check-circle')
      .onClick(async () => {
        await this.handleBulkAction('accept-all', pendingBatches);
      });
    
    // Reject all pending
    new ButtonComponent(actionsEl)
      .setButtonText(`Reject All (${pendingBatches.length})`)
      .setIcon('x-circle')
      .onClick(async () => {
        await this.handleBulkAction('reject-all', pendingBatches);
      });
    
    // Accept by operation type
    const operationTypes = new Set(pendingBatches.map(b => b.operationType));
    if (operationTypes.size > 1) {
      const operationEl = actionsEl.createEl('div', { cls: 'operation-actions' });
      operationEl.createEl('label', { text: 'By Operation:' });
      
      for (const opType of operationTypes) {
        const opBatches = pendingBatches.filter(b => b.operationType === opType);
        new ButtonComponent(operationEl)
          .setButtonText(`Accept ${this.getOperationDisplayName(opType)} (${opBatches.length})`)
          .setIcon('check')
          .onClick(async () => {
            await this.handleBulkAction('accept-operation', opBatches);
          });
      }
    }
  }

  /**
   * Render batches grouped by operation type
   */
  private renderGroupedByOperation(batches: ChangeGroupMetadata[]): void {
    const groupedBatches = new Map<EditorialOperationType, ChangeGroupMetadata[]>();
    
    for (const batch of batches) {
      if (!groupedBatches.has(batch.operationType)) {
        groupedBatches.set(batch.operationType, []);
      }
      groupedBatches.get(batch.operationType)!.push(batch);
    }

    for (const [operationType, operationBatches] of groupedBatches.entries()) {
      const operationEl = this.containerEl.createEl('div', { cls: 'operation-group' });
      
      // Operation header
      const headerEl = operationEl.createEl('div', { cls: 'operation-header' });
      headerEl.createEl('h3', { 
        text: this.getOperationDisplayName(operationType),
        cls: 'operation-title'
      });
      headerEl.createEl('span', { 
        cls: 'operation-count',
        text: `${operationBatches.length} batch${operationBatches.length !== 1 ? 'es' : ''}`
      });

      // Operation description
      operationEl.createEl('p', { 
        text: this.getOperationDescription(operationType),
        cls: 'operation-description'
      });

      // Render batches in this operation
      const batchesEl = operationEl.createEl('div', { cls: 'operation-batches' });
      this.renderBatchList(operationBatches, batchesEl);
    }
  }

  /**
   * Render list of batch items
   */
  private renderBatchList(batches: ChangeGroupMetadata[], containerEl?: HTMLElement): void {
    const batchContainer = containerEl || this.containerEl.createEl('div', { cls: 'batch-list' });

    // Sort batches by priority and creation time
    const sortedBatches = [...batches].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    for (const batch of sortedBatches) {
      this.renderBatchItem(batch, batchContainer);
    }
  }

  /**
   * Render individual batch item
   */
  private renderBatchItem(batch: ChangeGroupMetadata, containerEl: HTMLElement): void {
    const batchEl = containerEl.createEl('div', { 
      cls: `batch-item batch-${batch.status} priority-${batch.priority}`
    });

    // Batch header
    const headerEl = batchEl.createEl('div', { cls: 'batch-header' });
    
    // Status indicator
    const statusEl = headerEl.createEl('div', { cls: `batch-status status-${batch.status}` });
    statusEl.textContent = this.getStatusDisplayText(batch.status);

    // Batch title
    const titleEl = headerEl.createEl('div', { cls: 'batch-title' });
    titleEl.createEl('h4', { text: batch.operationDescription });
    
    const metaEl = titleEl.createEl('div', { cls: 'batch-meta' });
    metaEl.createEl('span', { 
      text: `${batch.changeCount} changes • ${this.getScopeDisplayText(batch.scope)}` 
    });
    metaEl.createEl('span', { 
      text: this.formatTimestamp(batch.createdAt),
      cls: 'batch-timestamp'
    });

    // Priority indicator
    if (batch.priority === 'high') {
      headerEl.createEl('div', { cls: 'priority-indicator high', title: 'High Priority' });
    }

    // Batch content (details)
    const contentEl = batchEl.createEl('div', { cls: 'batch-content' });
    
    // Position info
    contentEl.createEl('p', { 
      cls: 'batch-position',
      text: `Document range: ${batch.positionRange.start}–${batch.positionRange.end} (${batch.positionRange.end - batch.positionRange.start} characters)`
    });

    // Confidence score if available
    if (this.options.showConfidenceScores && batch.confidenceLevel !== undefined) {
      const confidenceEl = contentEl.createEl('div', { cls: 'batch-confidence' });
      confidenceEl.createEl('label', { text: 'AI Confidence:' });
      const confidenceBar = confidenceEl.createEl('div', { cls: 'confidence-bar' });
      const confidenceFill = confidenceBar.createEl('div', { 
        cls: 'confidence-fill',
        attr: { style: `width: ${batch.confidenceLevel * 100}%` }
      });
      confidenceEl.createEl('span', { 
        text: `${Math.round(batch.confidenceLevel * 100)}%`,
        cls: 'confidence-text'
      });
    }

    // Writer notes if present
    if (batch.writerNotes) {
      const notesEl = contentEl.createEl('div', { cls: 'batch-notes' });
      notesEl.createEl('label', { text: 'Notes:' });
      notesEl.createEl('p', { text: batch.writerNotes });
    }

    // Child groups if hierarchical
    if (this.options.showHierarchy && batch.childGroupIds && batch.childGroupIds.length > 0) {
      const childrenEl = contentEl.createEl('div', { cls: 'batch-children' });
      childrenEl.createEl('h5', { text: `Sub-groups (${batch.childGroupIds.length}):` });
      for (const childId of batch.childGroupIds) {
        const childBatch = this.batchManager.getBatch(childId);
        if (childBatch) {
          this.renderBatchItem(childBatch, childrenEl);
        }
      }
    }

    // Action buttons
    this.renderBatchActions(batch, batchEl);
  }

  /**
   * Render action buttons for a batch
   */
  private renderBatchActions(batch: ChangeGroupMetadata, batchEl: HTMLElement): void {
    const actionsEl = batchEl.createEl('div', { cls: 'batch-actions' });

    if (batch.status === 'pending') {
      // Accept button
      new ButtonComponent(actionsEl)
        .setButtonText('Accept')
        .setIcon('check')
        .setClass('accept-button')
        .onClick(async () => {
          const result = this.batchManager.acceptBatch(batch.groupId);
          this.handleBatchActionResult('accept', batch.groupId, result);
          this.render(); // Refresh display
        });

      // Reject button
      new ButtonComponent(actionsEl)
        .setButtonText('Reject')
        .setIcon('x')
        .setClass('reject-button')
        .onClick(async () => {
          const result = this.batchManager.rejectBatch(batch.groupId);
          this.handleBatchActionResult('reject', batch.groupId, result);
          this.render(); // Refresh display
        });

      // Partial review button (for complex batches)
      if (batch.changeCount > 5) {
        new ButtonComponent(actionsEl)
          .setButtonText('Review Individual Changes')
          .setIcon('list')
          .setClass('review-button')
          .onClick(() => {
            this.showPartialReviewModal(batch);
          });
      }
    }

    // View details button
    new ButtonComponent(actionsEl)
      .setButtonText('Details')
      .setIcon('info')
      .setClass('details-button')
      .onClick(() => {
        this.showBatchDetails(batch);
      });
  }

  /**
   * Handle bulk actions on multiple batches
   */
  private async handleBulkAction(action: string, batches: ChangeGroupMetadata[]): Promise<void> {
    for (const batch of batches) {
      let result: BatchOperationResult;
      
      switch (action) {
        case 'accept-all':
        case 'accept-operation':
          result = this.batchManager.acceptBatch(batch.groupId, `Bulk ${action}`);
          break;
        case 'reject-all':
        case 'reject-operation':
          result = this.batchManager.rejectBatch(batch.groupId, `Bulk ${action}`);
          break;
        default:
          continue;
      }

      this.handleBatchActionResult(action, batch.groupId, result);
    }

    // Refresh display after bulk action
    this.render();
  }

  /**
   * Handle individual batch action results
   */
  private handleBatchActionResult(action: string, groupId: string, result: BatchOperationResult): void {
    if (this.onBatchAction) {
      this.onBatchAction(action, groupId, result);
    }

    // Show feedback to user
    if (!result.success) {
      console.error(`Batch ${action} failed:`, result.errors);
    }
  }

  /**
   * Show partial review modal for complex batches
   */
  private showPartialReviewModal(batch: ChangeGroupMetadata): void {
    // This would open a modal for reviewing individual changes within a batch
    // Implementation would depend on Obsidian modal system
    console.log('Opening partial review modal for batch:', batch.groupId);
  }

  /**
   * Show detailed batch information
   */
  private showBatchDetails(batch: ChangeGroupMetadata): void {
    // This would show detailed information about the batch
    // Implementation would depend on Obsidian modal system
    console.log('Showing batch details for:', batch.groupId);
  }

  /**
   * Utility methods for display formatting
   */
  private getOperationDisplayName(operationType: EditorialOperationType): string {
    const displayNames = {
      'copy-edit-pass': 'Copy Editing',
      'proofreading': 'Proofreading',
      'developmental-feedback': 'Developmental Review',
      'style-refinement': 'Style Refinement',
      'fact-checking': 'Fact Checking',
      'formatting': 'Formatting',
      'content-expansion': 'Content Expansion',
      'content-reduction': 'Content Reduction',
      'rewriting': 'Rewriting',
      'custom': 'Custom'
    };
    return displayNames[operationType];
  }

  private getOperationDescription(operationType: EditorialOperationType): string {
    const descriptions = {
      'copy-edit-pass': 'Comprehensive editing for clarity, flow, and correctness',
      'proofreading': 'Final review for grammar, spelling, and punctuation',
      'developmental-feedback': 'Structural improvements and content development',
      'style-refinement': 'Voice, tone, and stylistic consistency',
      'fact-checking': 'Accuracy verification and source validation',
      'formatting': 'Document structure and presentation',
      'content-expansion': 'Additional details and elaboration',
      'content-reduction': 'Conciseness and clarity through reduction',
      'rewriting': 'Major restructuring and content revision',
      'custom': 'Custom editorial operation'
    };
    return descriptions[operationType];
  }

  private getStatusDisplayText(status: string): string {
    const statusText = {
      'pending': 'Review Needed',
      'accepted': 'Accepted',
      'rejected': 'Rejected',
      'mixed': 'Partially Reviewed'
    };
    return statusText[status] || status;
  }

  private getScopeDisplayText(scope: string): string {
    const scopeText = {
      'paragraph': 'Paragraph level',
      'section': 'Section level',
      'document': 'Document wide',
      'selection': 'Selected text'
    };
    return scopeText[scope] || scope;
  }

  private formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Update display options
   */
  public updateOptions(options: Partial<BatchPresentationOptions>): void {
    this.options = { ...this.options, ...options };
    this.render();
  }

  /**
   * Refresh the display
   */
  public refresh(): void {
    this.render();
  }
}