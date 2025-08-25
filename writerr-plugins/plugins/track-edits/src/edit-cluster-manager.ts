import { EditChange } from '@shared/types';
import { generateId } from '@shared/utils';
import TrackEditsPlugin from './main';

export interface EditCluster {
  id: string;
  type: 'consecutive_typing' | 'word_replacement' | 'deletion' | 'mixed';
  edits: EditChange[];
  startTime: number;
  endTime: number;
  wordCount: number;
  characterCount: number;
  metadata?: {
    originalWord?: string;
    newWord?: string;
    position?: number;
  };
}

export class EditClusterManager {
  private plugin: TrackEditsPlugin;
  private activeClusters: Map<string, EditCluster> = new Map();

  constructor(plugin: TrackEditsPlugin) {
    this.plugin = plugin;
  }

  clusterEdits(edits: EditChange[]): EditCluster[] {
    if (!this.plugin.settings.enableClustering || edits.length === 0) {
      return [];
    }

    // Clear old clusters
    this.activeClusters.clear();

    // Sort edits by timestamp
    const sortedEdits = [...edits].sort((a, b) => a.timestamp - b.timestamp);

    // Group edits into clusters
    const clusters: EditCluster[] = [];
    let currentCluster: EditChange[] = [];
    let lastTimestamp = 0;

    for (const edit of sortedEdits) {
      const timeDiff = edit.timestamp - lastTimestamp;
      
      // Start new cluster if time window exceeded or first edit
      if (timeDiff > this.plugin.settings.clusterTimeWindow || currentCluster.length === 0) {
        if (currentCluster.length > 0) {
          const cluster = this.createCluster(currentCluster);
          if (cluster) {
            clusters.push(cluster);
            this.activeClusters.set(cluster.id, cluster);
          }
        }
        currentCluster = [edit];
      } else {
        // Check if edit belongs to same word/context
        if (this.areEditsInSameWord(currentCluster[currentCluster.length - 1], edit)) {
          currentCluster.push(edit);
        } else {
          // Create cluster from current edits and start new one
          const cluster = this.createCluster(currentCluster);
          if (cluster) {
            clusters.push(cluster);
            this.activeClusters.set(cluster.id, cluster);
          }
          currentCluster = [edit];
        }
      }
      
      lastTimestamp = edit.timestamp;
    }

    // Process final cluster
    if (currentCluster.length > 0) {
      const cluster = this.createCluster(currentCluster);
      if (cluster) {
        clusters.push(cluster);
        this.activeClusters.set(cluster.id, cluster);
      }
    }

    return clusters;
  }

  private createCluster(edits: EditChange[]): EditCluster | null {
    if (edits.length === 0) return null;

    const startTime = Math.min(...edits.map(e => e.timestamp));
    const endTime = Math.max(...edits.map(e => e.timestamp));
    const clusterType = this.determineClusterType(edits);
    
    const cluster: EditCluster = {
      id: generateId(),
      type: clusterType,
      edits: edits,
      startTime,
      endTime,
      wordCount: this.calculateWordCount(edits),
      characterCount: this.calculateCharacterCount(edits),
      metadata: this.generateClusterMetadata(edits, clusterType)
    };

    return cluster;
  }

  private areEditsInSameWord(edit1: EditChange, edit2: EditChange): boolean {
    // Check if positions are close (within word boundary)
    const positionDiff = Math.abs(edit1.to - edit2.from);
    
    // Allow small gaps (like backspace then type)
    if (positionDiff <= 5) {
      return true;
    }

    // Check if both edits are in consecutive character positions
    if (edit1.type === 'insert' && edit2.type === 'insert') {
      return edit1.to === edit2.from || edit1.to === edit2.from - 1;
    }

    return false;
  }

  private determineClusterType(edits: EditChange[]): EditCluster['type'] {
    const insertCount = edits.filter(e => e.type === 'insert').length;
    const deleteCount = edits.filter(e => e.type === 'delete').length;
    const replaceCount = edits.filter(e => e.type === 'replace').length;

    // Word replacement pattern: delete followed by insert(s)
    if (deleteCount > 0 && insertCount > 0) {
      return 'word_replacement';
    }

    // Pure deletion
    if (deleteCount > 0 && insertCount === 0) {
      return 'deletion';
    }

    // Consecutive typing
    if (insertCount > 0 && deleteCount === 0) {
      return 'consecutive_typing';
    }

    return 'mixed';
  }

  private calculateWordCount(edits: EditChange[]): number {
    const text = edits
      .filter(e => e.text)
      .map(e => e.text!)
      .join('');
    
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateCharacterCount(edits: EditChange[]): number {
    return edits
      .filter(e => e.text)
      .reduce((count, edit) => count + (edit.text?.length || 0), 0);
  }

  private generateClusterMetadata(edits: EditChange[], type: EditCluster['type']): EditCluster['metadata'] {
    const metadata: EditCluster['metadata'] = {};

    if (type === 'word_replacement') {
      const deletedEdits = edits.filter(e => e.type === 'delete');
      const insertedEdits = edits.filter(e => e.type === 'insert');
      
      if (deletedEdits.length > 0) {
        metadata.originalWord = deletedEdits
          .map(e => e.removedText || '')
          .join('');
      }
      
      if (insertedEdits.length > 0) {
        metadata.newWord = insertedEdits
          .map(e => e.text || '')
          .join('');
      }
    }

    if (edits.length > 0) {
      metadata.position = edits[0].from;
    }

    return metadata;
  }

  getCluster(clusterId: string): EditCluster | undefined {
    return this.activeClusters.get(clusterId);
  }

  removeCluster(clusterId: string): boolean {
    return this.activeClusters.delete(clusterId);
  }

  getAllClusters(): EditCluster[] {
    return Array.from(this.activeClusters.values());
  }

  clearClusters(): void {
    this.activeClusters.clear();
  }
}