import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { EditChange } from '@shared/types';
import TrackEditsPlugin from './main';
import { MarkdownView } from 'obsidian';

export class EditRenderer {
  private plugin: TrackEditsPlugin;
  private trackingIndicator: HTMLElement | null = null;
  private activeDecorations: HTMLElement[] = [];
  private changeEffect: StateEffect<EditChange[]>;
  private decorationExtension: any[] | null = null;

  constructor(plugin: TrackEditsPlugin) {
    this.plugin = plugin;
    this.changeEffect = StateEffect.define<EditChange[]>();
    this.setupCodeMirrorExtension();
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
    console.log('Track Edits: Showing tracking indicator');
  }

  hideTrackingIndicator() {
    try {
      if (this.trackingIndicator && this.trackingIndicator.parentNode) {
        this.trackingIndicator.remove();
        this.trackingIndicator = null;
        console.log('Track Edits: Hiding tracking indicator');
      }
      
      // Also clear any active decorations
      this.clearDecorations();
    } catch (error) {
      console.error('Track Edits: Error hiding tracking indicator:', error);
      this.trackingIndicator = null;
    }
  }

  createChangeDecorations(changes: EditChange[]): DecorationSet {
    const decorations: any[] = [];
    const now = Date.now();

    for (const change of changes) {
      // Only show recent changes (within last 5 seconds)
      if (now - change.timestamp > 5000) continue;

      const decoration = this.createChangeDecoration(change);
      if (decoration) {
        decorations.push(decoration);
      }
    }

    return Decoration.set(decorations);
  }

  private createChangeDecoration(change: EditChange) {
    let className = 'track-edits-change';
    
    switch (change.type) {
      case 'insert':
        className += ' track-edits-insert';
        break;
      case 'delete':
        className += ' track-edits-delete';
        break;
      case 'replace':
        className += ' track-edits-replace';
        break;
    }

    // Apply color scheme
    className += ` track-edits-${this.plugin.settings.colorScheme}`;

    console.log('Track Edits: Creating decoration with class', className, 'from', change.from, 'to', change.to);

    return Decoration.mark({
      class: className,
      attributes: {
        title: `${change.type} at ${new Date(change.timestamp).toLocaleTimeString()}`,
        'data-track-edits': 'true'
      }
    }).range(change.from, change.to);
  }

  // Apply decorations to CodeMirror editor
  showChangeDecorations(changes: EditChange[]) {
    this.clearDecorations();
    
    const activeLeaf = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeLeaf || !activeLeaf.editor) {
      console.log('Track Edits: No active editor found for decorations');
      return;
    }

    console.log('Track Edits: Showing decorations for', changes.length, 'changes');
    
    // Apply CodeMirror decorations
    this.applyCodeMirrorDecorations(activeLeaf, changes);
    
    // Also create temporary visual indicators for immediate feedback
    changes.forEach((change, index) => {
      this.createTemporaryHighlight(change, index);
    });
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
  
  private clearDecorations() {
    this.activeDecorations.forEach(decoration => {
      if (decoration.parentNode) {
        decoration.remove();
      }
    });
    this.activeDecorations = [];
  }

  // Setup CodeMirror extension for highlighting changes
  private setupCodeMirrorExtension() {
    const renderer = this;
    
    const changeState = StateField.define<DecorationSet>({
      create() {
        return Decoration.none;
      },
      update(decorations, tr) {
        // Update decorations based on changes
        decorations = decorations.map(tr.changes);
        
        for (const effect of tr.effects) {
          if (effect.is(renderer.changeEffect)) {
            decorations = renderer.createChangeDecorations(effect.value);
          }
        }
        
        return decorations;
      },
      provide: f => EditorView.decorations.from(f)
    });

    this.decorationExtension = [
      changeState,
      ViewPlugin.fromClass(class {
        constructor(view: EditorView) {}
        
        update(update: ViewUpdate) {
          // Handle editor updates and dispatch change effects
        }
      })
    ];
  }

  // Apply decorations directly to CodeMirror editor
  private applyCodeMirrorDecorations(markdownView: MarkdownView, changes: EditChange[]) {
    try {
      // Get the CodeMirror editor instance
      const editor = (markdownView as any).editor;
      if (!editor || !editor.cm) {
        console.log('Track Edits: CodeMirror editor not found');
        return;
      }

      const cm = editor.cm as EditorView;
      console.log('Track Edits: Found CodeMirror editor, applying decorations...');
      
      // Dispatch the change effect to update decorations
      const transaction = {
        effects: this.changeEffect.of(changes)
      };
      
      console.log('Track Edits: Dispatching transaction with', changes.length, 'changes');
      cm.dispatch(transaction);
      
      // Add a small delay and check if decorations are visible
      setTimeout(() => {
        const decoratedElements = cm.dom.querySelectorAll('[data-track-edits="true"]');
        console.log('Track Edits: Found', decoratedElements.length, 'decorated elements in DOM');
        if (decoratedElements.length === 0) {
          console.warn('Track Edits: No decorated elements found - decorations may not be applying correctly');
        }
      }, 100);
      
      console.log('Track Edits: Applied CodeMirror decorations for', changes.length, 'changes');
    } catch (error) {
      console.error('Track Edits: Error applying CodeMirror decorations:', error);
      // Fallback to temporary highlights only
    }
  }

  // Get the CodeMirror extension
  getCodeMirrorExtension() {
    return this.decorationExtension;
  }
}