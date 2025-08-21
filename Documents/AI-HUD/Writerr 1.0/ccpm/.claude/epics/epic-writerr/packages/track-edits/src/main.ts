import { Plugin, WorkspaceLeaf, ItemView } from 'obsidian';
import { globalRegistry, globalEventBus } from '@writerr/shared';
import { TrackEditsView } from './components/TrackEditsView';
import { mockChanges, mockSession, mockTimeline, mockHeatmapData } from './mock-data';
import { Change, BulkOperation, ChangeStatus } from './types';
import './styles.css';

const VIEW_TYPE_TRACK_EDITS = 'track-edits-view';

class TrackEditsViewObsidian extends ItemView {
  private reactRoot: any;
  private changes: Change[] = [];

  getViewType(): string {
    return VIEW_TYPE_TRACK_EDITS;
  }

  getDisplayText(): string {
    return 'Track Edits';
  }

  getIcon(): string {
    return 'diff';
  }

  async onOpen() {
    const { createRoot } = await import('react-dom/client');
    const { createElement } = await import('react');
    
    // Initialize with mock data for development
    this.changes = [...mockChanges];
    
    // Create React root
    const container = this.containerEl.children[1];
    container.empty();
    
    const reactContainer = container.createDiv();
    reactContainer.addClass('track-edits-container');
    
    this.reactRoot = createRoot(reactContainer);
    this.renderView();
  }

  private renderView() {
    const { createElement: h } = require('react');
    
    const props = {
      changes: this.changes,
      timeline: mockTimeline,
      heatmapData: mockHeatmapData,
      onChangeAccept: this.handleChangeAccept.bind(this),
      onChangeReject: this.handleChangeReject.bind(this),
      onChangeSelect: this.handleChangeSelect.bind(this),
      onBulkOperation: this.handleBulkOperation.bind(this),
      onClusterChange: this.handleClusterChange.bind(this),
    };

    this.reactRoot.render(h(TrackEditsView, props));
  }

  private async handleChangeAccept(changeId: string) {
    const changeIndex = this.changes.findIndex(c => c.id === changeId);
    if (changeIndex >= 0) {
      this.changes[changeIndex] = {
        ...this.changes[changeIndex],
        status: ChangeStatus.ACCEPTED
      };
      
      // Emit event for other plugins
      globalEventBus.emit('change-accepted', {
        changeId,
        change: this.changes[changeIndex]
      });
      
      this.renderView();
    }
  }

  private async handleChangeReject(changeId: string) {
    const changeIndex = this.changes.findIndex(c => c.id === changeId);
    if (changeIndex >= 0) {
      this.changes[changeIndex] = {
        ...this.changes[changeIndex],
        status: ChangeStatus.REJECTED
      };
      
      // Emit event for other plugins
      globalEventBus.emit('change-rejected', {
        changeId,
        change: this.changes[changeIndex]
      });
      
      this.renderView();
    }
  }

  private handleChangeSelect(changeId: string) {
    // Handle change selection (for keyboard navigation, etc.)
    globalEventBus.emit('change-selected', { changeId });
  }

  private async handleBulkOperation(operation: BulkOperation): Promise<void> {
    const { type, changeIds } = operation;
    
    switch (type) {
      case 'accept':
        changeIds.forEach(id => this.handleChangeAccept(id));
        break;
      case 'reject':
        changeIds.forEach(id => this.handleChangeReject(id));
        break;
      case 'cluster':
        // Handle clustering logic here
        console.log('Clustering changes:', changeIds);
        break;
      default:
        console.warn('Unknown bulk operation:', type);
    }
    
    globalEventBus.emit('bulk-operation-completed', operation);
  }

  private handleClusterChange(changeId: string) {
    console.log('Cluster change:', changeId);
    // Handle clustering logic
  }

  async onClose() {
    if (this.reactRoot) {
      this.reactRoot.unmount();
    }
  }
}

export default class TrackEditsPlugin extends Plugin {
  async onload() {
    console.log('Loading Track Edits plugin');
    
    // Register the view
    this.registerView(
      VIEW_TYPE_TRACK_EDITS,
      (leaf: WorkspaceLeaf) => new TrackEditsViewObsidian(leaf)
    );

    // Add ribbon icon
    this.addRibbonIcon('diff', 'Track Edits', () => {
      this.activateView();
    });

    // Add command to open view
    this.addCommand({
      id: 'open-track-edits',
      name: 'Open Track Edits View',
      callback: () => {
        this.activateView();
      }
    });
    
    // Register plugin capabilities
    globalRegistry.register({
      id: 'track-edits',
      name: 'Track Edits',
      version: '1.0.0',
      capabilities: ['change-tracking', 'visual-diff', 'bulk-operations', 'timeline-view', 'heatmap-view']
    });
    
    // Listen for relevant events
    globalEventBus.on('document-changed', (event) => {
      console.log('Document changed:', event);
      // Process document changes and update UI
    });

    // Expose global API for other plugins
    (window as any).TrackEdits = {
      addChange: this.addChange.bind(this),
      removeChange: this.removeChange.bind(this),
      getChanges: this.getChanges.bind(this),
      acceptChange: this.acceptChange.bind(this),
      rejectChange: this.rejectChange.bind(this)
    };
  }

  private async activateView() {
    const { workspace } = this.app;
    
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_TRACK_EDITS);

    if (leaves.length > 0) {
      // View already exists, activate it
      leaf = leaves[0];
    } else {
      // Create new view in right sidebar
      leaf = workspace.getRightLeaf(false);
      await leaf!.setViewState({ type: VIEW_TYPE_TRACK_EDITS, active: true });
    }

    // Focus the view
    workspace.revealLeaf(leaf!);
  }

  // Public API methods
  private addChange(change: Change) {
    // Add change to the system
    globalEventBus.emit('change-added', { change });
  }

  private removeChange(changeId: string) {
    // Remove change from the system
    globalEventBus.emit('change-removed', { changeId });
  }

  private getChanges(): Change[] {
    // Return current changes
    const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_TRACK_EDITS)[0]?.view as TrackEditsViewObsidian;
    return view ? (view as any).changes || [] : [];
  }

  private acceptChange(changeId: string) {
    const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_TRACK_EDITS)[0]?.view as TrackEditsViewObsidian;
    if (view) {
      (view as any).handleChangeAccept(changeId);
    }
  }

  private rejectChange(changeId: string) {
    const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_TRACK_EDITS)[0]?.view as TrackEditsViewObsidian;
    if (view) {
      (view as any).handleChangeReject(changeId);
    }
  }

  onunload() {
    console.log('Unloading Track Edits plugin');
    globalRegistry.unregister('track-edits');
    
    // Clean up global API
    delete (window as any).TrackEdits;
  }
}