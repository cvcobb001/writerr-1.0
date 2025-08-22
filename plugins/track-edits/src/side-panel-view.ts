import { ItemView, WorkspaceLeaf } from 'obsidian';
import TrackEditsPlugin from './main';
import { EditCluster } from './edit-cluster-manager';

export const SIDE_PANEL_VIEW_TYPE = 'track-edits-side-panel';

export class EditSidePanelView extends ItemView {
  plugin: TrackEditsPlugin;
  private clusters: EditCluster[] = [];

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

    // Header
    const header = container.createEl('div', { cls: 'track-edits-panel-header' });
    header.createEl('h3', { text: 'Track Edits', cls: 'track-edits-panel-title' });

    // Status
    const status = header.createEl('div', { cls: 'track-edits-panel-status' });
    if (this.plugin.currentSession) {
      status.createEl('span', { 
        text: '🔴 Recording', 
        cls: 'track-edits-status-recording' 
      });
    } else {
      status.createEl('span', { 
        text: '⚪ Stopped', 
        cls: 'track-edits-status-stopped' 
      });
    }

    // Clusters section
    const clustersContainer = container.createEl('div', { cls: 'track-edits-clusters' });
    
    if (this.clusters.length === 0) {
      clustersContainer.createEl('div', { 
        text: 'No recent edits to review',
        cls: 'track-edits-empty-state'
      });
      return;
    }

    // Clusters header
    const clustersHeader = clustersContainer.createEl('div', { cls: 'track-edits-clusters-header' });
    clustersHeader.createEl('h4', { text: 'Recent Edit Clusters' });
    clustersHeader.createEl('span', { 
      text: `${this.clusters.length} cluster${this.clusters.length !== 1 ? 's' : ''}`,
      cls: 'track-edits-cluster-count'
    });

    // Render each cluster
    this.clusters.forEach((cluster, index) => {
      this.renderCluster(clustersContainer, cluster, index);
    });

    // Controls
    const controls = container.createEl('div', { cls: 'track-edits-panel-controls' });
    
    const acceptAllBtn = controls.createEl('button', { 
      text: 'Accept All',
      cls: 'track-edits-btn track-edits-btn-primary'
    });
    acceptAllBtn.onclick = () => this.acceptAllClusters();

    const clearAllBtn = controls.createEl('button', { 
      text: 'Clear All',
      cls: 'track-edits-btn track-edits-btn-secondary'
    });
    clearAllBtn.onclick = () => this.clearAllClusters();
  }

  private renderCluster(container: HTMLElement, cluster: EditCluster, index: number) {
    const clusterEl = container.createEl('div', { cls: 'track-edits-cluster' });
    
    // Cluster header
    const header = clusterEl.createEl('div', { cls: 'track-edits-cluster-header' });
    
    const title = header.createEl('div', { cls: 'track-edits-cluster-title' });
    title.createEl('span', { 
      text: this.getClusterTitle(cluster),
      cls: 'track-edits-cluster-name'
    });
    title.createEl('span', { 
      text: this.getClusterTime(cluster),
      cls: 'track-edits-cluster-time'
    });

    // Cluster content preview
    const content = clusterEl.createEl('div', { cls: 'track-edits-cluster-content' });
    
    const preview = content.createEl('div', { cls: 'track-edits-cluster-preview' });
    const previewText = this.getClusterPreview(cluster);
    
    if (cluster.type === 'word_replacement') {
      preview.innerHTML = `<span class="track-edits-deleted">${previewText.before}</span> → <span class="track-edits-added">${previewText.after}</span>`;
    } else {
      preview.innerHTML = `<span class="track-edits-added">${previewText.text}</span>`;
    }

    // Cluster stats
    const stats = content.createEl('div', { cls: 'track-edits-cluster-stats' });
    stats.createEl('span', { text: `${cluster.edits.length} edit${cluster.edits.length !== 1 ? 's' : ''}` });
    stats.createEl('span', { text: `${cluster.wordCount} word${cluster.wordCount !== 1 ? 's' : ''}` });

    // Cluster actions
    const actions = clusterEl.createEl('div', { cls: 'track-edits-cluster-actions' });
    
    const acceptBtn = actions.createEl('button', { 
      text: '✓ Accept',
      cls: 'track-edits-btn track-edits-btn-accept'
    });
    acceptBtn.onclick = () => this.acceptCluster(cluster.id);

    const rejectBtn = actions.createEl('button', { 
      text: '✗ Reject',
      cls: 'track-edits-btn track-edits-btn-reject'
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
    this.clusters.forEach(cluster => {
      this.plugin.acceptEditCluster(cluster.id);
    });
  }

  private clearAllClusters() {
    this.clusters.forEach(cluster => {
      this.plugin.rejectEditCluster(cluster.id);
    });
  }
}