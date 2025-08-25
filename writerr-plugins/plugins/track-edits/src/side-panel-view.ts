import { ItemView, WorkspaceLeaf } from 'obsidian';
import TrackEditsPlugin from './main';
import { EditCluster } from './edit-cluster-manager';

export const SIDE_PANEL_VIEW_TYPE = 'track-edits-side-panel';

export class EditSidePanelView extends ItemView {
  plugin: TrackEditsPlugin;
  private clusters: EditCluster[] = [];
  private runOnceBtn: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: TrackEditsPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return SIDE_PANEL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Track Edits';
  }

  getIcon(): string {
    return 'edit';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('track-edits-side-panel');

    this.renderView();
  }

  async onClose() {
    // Cleanup when panel is closed
  }

  updateClusters(clusters: EditCluster[]) {
    this.clusters = clusters;
    this.renderView();
  }

  private renderView() {
    const container = this.containerEl.children[1];
    container.empty();

    // Header - v2.0 style with status indicator
    const header = container.createEl('h2');
    header.createEl('span', { text: 'Track Edits' });
    
    // Add status dot
    const statusDot = header.createEl('span', {
      cls: 'track-edits-status-dot'
    });
    
    if (this.plugin.currentSession) {
      statusDot.addClass('track-edits-status-active');
      statusDot.setAttribute('title', 'Tracking active');
    } else {
      statusDot.addClass('track-edits-status-inactive');
      statusDot.setAttribute('title', 'Tracking stopped');
    }

    // Edit count summary - v2.0 style
    const countText = this.clusters.length === 0 
      ? 'No edits to review'
      : `${this.clusters.length} cluster${this.clusters.length !== 1 ? 's' : ''} to review`;
    container.createEl('p', { 
      text: countText,
      cls: 'track-edits-count'
    });

    // AI Controls section (matching v2.0 design)
    this.createAIControlsSection(container);

    // Accept All / Reject All controls (v1.0 addition that v2.0 doesn't have)
    if (this.clusters.length > 0) {
      const bulkControls = container.createEl('div', { cls: 'track-edits-bulk-controls' });
      
      // Left side: text labels
      bulkControls.createEl('span', {
        text: 'Accept / Reject All',
        cls: 'track-edits-bulk-text'
      });
      
      // Right side: action buttons (aligned with individual buttons)
      const buttonsContainer = bulkControls.createEl('div', { cls: 'track-edits-bulk-buttons' });
      
      const acceptAllBtn = buttonsContainer.createEl('button', {
        text: '✓',
        cls: 'track-edits-bulk-btn track-edits-bulk-accept',
        title: 'Accept all edits'
      });
      acceptAllBtn.onclick = () => this.acceptAllClusters();
      
      const rejectAllBtn = buttonsContainer.createEl('button', {
        text: '✗',
        cls: 'track-edits-bulk-btn track-edits-bulk-reject',
        title: 'Reject all edits'
      });
      rejectAllBtn.onclick = () => this.rejectAllClusters();
    }

    // Edits list - v2.0 style
    const editsList = container.createEl('div', { cls: 'track-edits-list' });
    
    if (this.clusters.length === 0) {
      return;
    }

    // Render each cluster - v2.0 style
    this.clusters.forEach((cluster, index) => {
      this.renderCluster(editsList, cluster, index);
    });
  }

  private renderCluster(container: HTMLElement, cluster: EditCluster, index: number) {
    // v2.0 style: Clean cluster item with flexbox layout
    const clusterItem = container.createEl('div', { cls: 'track-edit-item track-cluster-item' });
    const clusterRow = clusterItem.createEl('div', { cls: 'track-cluster-row' });
    
    // Left side: edit display (v2.0 style)
    const clusterContent = clusterRow.createEl('div', { cls: 'track-cluster-content' });
    
    const previewText = this.getClusterPreview(cluster);
    
    if (cluster.type === 'word_replacement') {
      // Show deletion → insertion cleanly
      const deleteSpan = clusterContent.createEl('code', { 
        text: previewText.before || '',
        cls: 'track-edit-deleted'
      });
      clusterContent.appendText(' → ');
      const addSpan = clusterContent.createEl('code', {
        text: previewText.after || '',
        cls: 'track-edit-added'
      });
    } else {
      // Show addition cleanly
      clusterContent.createEl('code', {
        text: previewText.text || '',
        cls: 'track-edit-added'
      });
    }
    
    // Right side: action buttons (v2.0 style - minimal)
    const buttonsContainer = clusterRow.createEl('div', { cls: 'track-edit-buttons' });
    
    const acceptBtn = buttonsContainer.createEl('button', {
      text: '✓',
      cls: 'track-edit-btn track-edit-btn-accept',
      title: 'Accept edit'
    });
    acceptBtn.onclick = () => this.acceptCluster(cluster.id);
    
    const rejectBtn = buttonsContainer.createEl('button', {
      text: '✗',
      cls: 'track-edit-btn track-edit-btn-reject',
      title: 'Reject edit'
    });
    rejectBtn.onclick = () => this.rejectCluster(cluster.id);
  }

  private getClusterTitle(cluster: EditCluster): string {
    switch (cluster.type) {
      case 'word_replacement':
        return 'Word Replacement';
      case 'consecutive_typing':
        return 'Consecutive Typing';
      case 'deletion':
        return 'Text Deletion';
      default:
        return 'Text Edit';
    }
  }

  private getClusterTime(cluster: EditCluster): string {
    const now = Date.now();
    const timeDiff = now - cluster.startTime;
    
    if (timeDiff < 1000) {
      return 'Just now';
    } else if (timeDiff < 60000) {
      return `${Math.floor(timeDiff / 1000)}s ago`;
    } else {
      return `${Math.floor(timeDiff / 60000)}m ago`;
    }
  }

  private getClusterPreview(cluster: EditCluster): { text?: string; before?: string; after?: string } {
    if (cluster.type === 'word_replacement') {
      return {
        before: cluster.metadata?.originalWord || '',
        after: cluster.metadata?.newWord || ''
      };
    } else {
      const text = cluster.edits
        .map(edit => edit.text || '')
        .join('')
        .slice(0, 50);
      return { text: text + (text.length === 50 ? '...' : '') };
    }
  }

  private acceptCluster(clusterId: string) {
    this.plugin.acceptEditCluster(clusterId);
  }

  private rejectCluster(clusterId: string) {
    this.plugin.rejectEditCluster(clusterId);
  }

  private acceptAllClusters() {
    // Take a snapshot of cluster IDs to avoid issues with array changing during iteration
    const clusterIds = this.clusters.map(cluster => cluster.id);
    
    // Use batch processing method for better performance
    this.plugin.acceptAllEditClusters(clusterIds);
  }

  private rejectAllClusters() {
    // Add confirmation for destructive action
    if (this.clusters.length > 3) {
      const confirmed = confirm(`Are you sure you want to reject all ${this.clusters.length} edits? This cannot be undone.`);
      if (!confirmed) return;
    }
    
    // CRITICAL: Stop tracking FIRST to prevent new edits during rejection
    this.plugin.stopTracking();
    
    // Take a snapshot of cluster IDs to avoid issues with array changing during iteration
    const clusterIds = this.clusters.map(cluster => cluster.id);
    
    // Use batch processing method for better performance
    this.plugin.rejectAllEditClusters(clusterIds);
  }

  private createAIControlsSection(container: HTMLElement): void {
    const controlsDiv = container.createEl('div', { cls: 'track-edits-ai-simple' });
    const controlsLine = controlsDiv.createEl('div', { cls: 'ai-simple-line' });
    
    // Left side: "AI" label with toggle right next to it
    const labelToggleGroup = controlsLine.createEl('div', { cls: 'ai-label-toggle-group' });
    
    // "AI" label - more prominent
    labelToggleGroup.createEl('span', { text: 'AI', cls: 'ai-simple-label' });
    
    // Toggle switch right next to label
    const toggleSwitch = labelToggleGroup.createEl('div', { cls: 'ai-simple-toggle' });
    toggleSwitch.addClass(this.plugin.settings.aiAlwaysEnabled ? 'on' : 'off');
    toggleSwitch.setAttribute('title', this.plugin.settings.aiAlwaysEnabled ? 'AI Always On' : 'AI Manual Only');
    
    // Toggle click handler
    toggleSwitch.onclick = () => {
      this.plugin.settings.aiAlwaysEnabled = !this.plugin.settings.aiAlwaysEnabled;
      this.plugin.saveSettings();
      this.renderView(); // Re-render to update toggle state
    };
    
    // Right side: "Run Once" button - more prominent
    this.runOnceBtn = controlsLine.createEl('button', {
      text: 'Run Once',
      cls: this.plugin.settings.aiAlwaysEnabled ? 'ai-simple-btn disabled' : 'ai-simple-btn enabled',
      title: 'Run AI analysis once on current edits'
    });
    
    // Run Once click handler (only if not always enabled)
    this.runOnceBtn.onclick = () => {
      if (!this.plugin.settings.aiAlwaysEnabled) {
        this.runAIAnalysisOnce();
      }
    };
  }

  private async runAIAnalysisOnce(): Promise<void> {
    if (!this.runOnceBtn) return;
    
    // Update button state
    this.runOnceBtn.textContent = 'Running...';
    this.runOnceBtn.addClass('running');
    
    try {
      // TODO: Call AI analysis method when implemented
      await this.plugin.runAIAnalysisOnce();
      
      // Provide user feedback
      this.runOnceBtn.textContent = 'Done!';
      setTimeout(() => {
        if (this.runOnceBtn) {
          this.runOnceBtn.textContent = 'Run Once';
          this.runOnceBtn.removeClass('running');
        }
      }, 2000);
      
    } catch (error) {
      console.error('AI analysis failed:', error);
      this.runOnceBtn.textContent = 'Error';
      setTimeout(() => {
        if (this.runOnceBtn) {
          this.runOnceBtn.textContent = 'Run Once';
          this.runOnceBtn.removeClass('running');
        }
      }, 2000);
    }
  }
}