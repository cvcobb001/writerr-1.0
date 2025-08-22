import { EditChange } from '@shared/types';
import TrackEditsPlugin from './main';
import { MarkdownView } from 'obsidian';

export class EditRenderer {
  private plugin: TrackEditsPlugin;
  private trackingIndicator: HTMLElement | null = null;
  private decorationContainer: HTMLElement | null = null;
  private activeDecorations: HTMLElement[] = [];

  constructor(plugin: TrackEditsPlugin) {
    this.plugin = plugin;
  }

  showTrackingIndicator() {
    if (this.trackingIndicator) return;

    this.trackingIndicator = document.createElement('div');
    this.trackingIndicator.className = 'track-edits-indicator';
    this.trackingIndicator.innerHTML = '🔴 Tracking';
    this.trackingIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 60px;
      background: var(--background-modifier-error);
      color: var(--text-on-accent);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      opacity: 0.8;
    `;

    document.body.appendChild(this.trackingIndicator);
    console.log('Track Edits v2.0: Showing tracking indicator');
  }

  hideTrackingIndicator() {
    try {
      if (this.trackingIndicator && this.trackingIndicator.parentNode) {
        this.trackingIndicator.remove();
        this.trackingIndicator = null;
        console.log('Track Edits v2.0: Hiding tracking indicator');
      }
      
      // Also clear any active decorations
      this.clearDecorations();
    } catch (error) {
      console.error('Track Edits: Error hiding tracking indicator:', error);
      this.trackingIndicator = null;
    }
  }

  // Safe decoration system using DOM overlay approach
  showChangeDecorations(changes: EditChange[]) {
    this.clearDecorations();
    
    const activeLeaf = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeLeaf || !activeLeaf.editor) {
      console.log('Track Edits v2.0: No active editor found for decorations');
      return;
    }

    console.log('Track Edits v2.0: Showing decorations for', changes.length, 'changes');
    
    // Use safe DOM overlay approach instead of CodeMirror extensions
    this.createDOMOverlayDecorations(activeLeaf, changes);
    
    // Also create temporary notification bubbles
    changes.forEach((change, index) => {
      this.createTemporaryHighlight(change, index);
    });
  }

  private createDOMOverlayDecorations(markdownView: MarkdownView, changes: EditChange[]) {
    try {
      // Get the editor container
      const editorContainer = markdownView.contentEl.querySelector('.cm-editor');
      if (!editorContainer) {
        console.log('Track Edits v2.0: Editor container not found');
        return;
      }

      // Create decoration container if it doesn't exist
      if (!this.decorationContainer) {
        this.decorationContainer = document.createElement('div');
        this.decorationContainer.className = 'track-edits-decoration-overlay';
        this.decorationContainer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        `;
        editorContainer.appendChild(this.decorationContainer);
      }

      // Create decorations for recent changes
      const now = Date.now();
      const recentChanges = changes.filter(change => now - change.timestamp < 5000);

      recentChanges.forEach(change => {
        this.createSafeDecoration(change);
      });

      console.log('Track Edits v2.0: Created', recentChanges.length, 'DOM overlay decorations');
    } catch (error) {
      console.error('Track Edits v2.0: Error creating DOM overlay decorations:', error);
    }
  }

  private createSafeDecoration(change: EditChange) {
    if (!this.decorationContainer) return;

    // Get editor position for the change
    const position = this.getEditorPosition(change);
    if (!position || position.left < 0 || position.top < 0) {
      console.log('Track Edits v2.0: Invalid position for decoration:', position);
      return;
    }

    const decoration = document.createElement('div');
    decoration.className = this.getDecorationClass(change);
    decoration.style.cssText = `
      position: absolute;
      left: ${position.left}px;
      top: ${position.top}px;
      width: ${Math.max(position.width, 20)}px;
      height: ${position.height}px;
      pointer-events: none;
      z-index: 10;
      border-radius: 3px;
      animation: track-edits-highlight-fade 3s ease-out forwards;
    `;

    decoration.title = `${change.type} at ${new Date(change.timestamp).toLocaleTimeString()}`;
    
    this.decorationContainer.appendChild(decoration);
    this.activeDecorations.push(decoration);

    // Auto-remove after animation
    setTimeout(() => {
      if (decoration.parentNode) {
        decoration.remove();
        this.activeDecorations = this.activeDecorations.filter(d => d !== decoration);
      }
    }, 3000);
  }

  private getEditorPosition(change: EditChange): { left: number; top: number; width: number; height: number } | null {
    try {
      const activeLeaf = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
      if (!activeLeaf || !activeLeaf.editor) return null;

      const editor = activeLeaf.editor;
      
      // Convert document position to editor coordinates
      const pos = editor.offsetToPos(change.from);
      // Use Obsidian's proper API instead of direct CodeMirror access
      const coords = editor.coordsAtPos(pos, false);
      
      if (!coords) {
        console.log('Track Edits v2.0: No coordinates returned for position', pos);
        return null;
      }

      // Get the editor container to calculate relative positioning
      const editorContainer = activeLeaf.contentEl.querySelector('.cm-editor');
      if (!editorContainer) return null;

      const editorRect = editorContainer.getBoundingClientRect();

      // Convert absolute coordinates to relative coordinates within the editor with bounds checking
      const result = {
        left: Math.max(0, coords.left - editorRect.left),
        top: Math.max(0, coords.top - editorRect.top),
        width: Math.max((change.text?.length || 1) * 8, 20), // Approximate character width
        height: Math.max(coords.bottom - coords.top, 16) // Minimum height
      };
      
      console.log('Track Edits v2.0: Calculated position:', result, 'for change at', change.from);
      return result;
    } catch (error) {
      console.error('Track Edits v2.0: Error getting editor position:', error);
      return null;
    }
  }

  private getDecorationClass(change: EditChange): string {
    let className = 'track-edits-decoration';
    
    switch (change.type) {
      case 'insert':
        className += ' track-edits-decoration-insert';
        break;
      case 'delete':
        className += ' track-edits-decoration-delete';
        break;
      case 'replace':
        className += ' track-edits-decoration-replace';
        break;
    }

    // Apply color scheme
    className += ` track-edits-decoration-${this.plugin.settings.colorScheme}`;

    return className;
  }
  
  private createTemporaryHighlight(change: EditChange, index: number) {
    const highlight = document.createElement('div');
    highlight.className = 'track-edits-temp-highlight';
    highlight.style.cssText = `
      position: fixed;
      top: ${60 + (index * 25)}px;
      right: 60px;
      background: var(--background-modifier-success);
      color: var(--text-on-accent);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      z-index: 999;
      opacity: 0.9;
      animation: fadeInOut 3s ease-in-out;
    `;
    highlight.textContent = `${change.type}: "${change.text || ''}"`;
    
    document.body.appendChild(highlight);
    this.activeDecorations.push(highlight);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (highlight.parentNode) {
        highlight.remove();
        this.activeDecorations = this.activeDecorations.filter(el => el !== highlight);
      }
    }, 3000);
  }
  
  clearDecorations() {
    // Remove all active decorations
    this.activeDecorations.forEach(decoration => {
      if (decoration.parentNode) {
        decoration.remove();
      }
    });
    this.activeDecorations = [];

    // Remove decoration container if it exists
    if (this.decorationContainer && this.decorationContainer.parentNode) {
      this.decorationContainer.remove();
      this.decorationContainer = null;
    }
  }

  // Method for backward compatibility - no longer returns CodeMirror extension
  getCodeMirrorExtension() {
    // Return null to avoid conflicts - we use DOM overlay instead
    return null;
  }
}