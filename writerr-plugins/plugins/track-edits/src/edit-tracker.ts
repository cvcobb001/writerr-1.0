import { TFile } from 'obsidian';
import { EditSession, EditChange } from '@shared/types';
import { generateId, getWordCount, getCharacterCount } from '@shared/utils';
import TrackEditsPlugin from './main';

export class EditTracker {
  private plugin: TrackEditsPlugin;
  private sessions: Map<string, EditSession> = new Map();
  private activeSessions: Map<string, TFile> = new Map();

  constructor(plugin: TrackEditsPlugin) {
    this.plugin = plugin;
    this.loadSessions();
  }

  async loadSessions() {
    try {
      const data = await this.plugin.loadData();
      if (data && data.sessions) {
        for (const session of data.sessions) {
          this.sessions.set(session.id, session);
        }
      }
    } catch (error) {
      console.error('Failed to load edit sessions:', error);
    }
  }

  async saveSessions() {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      await this.plugin.saveData({ sessions: sessionsArray });
    } catch (error) {
      console.error('Failed to save edit sessions:', error);
    }
  }

  startSession(session: EditSession, file: TFile) {
    this.sessions.set(session.id, session);
    this.activeSessions.set(session.id, file);
  }

  endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      this.activeSessions.delete(sessionId);
      this.saveSessions();
    }
  }

  recordChanges(sessionId: string, changes: EditChange[]) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.changes.push(...changes);
    
    // Update word and character counts
    const file = this.activeSessions.get(sessionId);
    if (file) {
      this.updateSessionCounts(session, file);
    }
  }

  private async updateSessionCounts(session: EditSession, file: TFile) {
    try {
      const content = await this.plugin.app.vault.read(file);
      session.wordCount = getWordCount(content);
      session.characterCount = getCharacterCount(content);
    } catch (error) {
      console.error('Failed to update session counts:', error);
    }
  }

  getSession(sessionId: string): EditSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionHistory(): EditSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.startTime - a.startTime);
  }

  async saveSession(session: EditSession) {
    this.sessions.set(session.id, session);
    await this.saveSessions();
  }

  clearHistory() {
    this.sessions.clear();
    this.activeSessions.clear();
    this.saveSessions();
  }

  formatSessionForExport(session: EditSession, format: 'json' | 'csv' | 'markdown'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(session, null, 2);
      
      case 'csv':
        let csv = 'Timestamp,Type,From,To,Text,RemovedText\n';
        for (const change of session.changes) {
          const row = [
            new Date(change.timestamp).toISOString(),
            change.type,
            change.from,
            change.to,
            `"${(change.text || '').replace(/"/g, '""')}"`,
            `"${(change.removedText || '').replace(/"/g, '""')}"`
          ].join(',');
          csv += row + '\n';
        }
        return csv;
      
      case 'markdown':
        const startDate = new Date(session.startTime).toLocaleString();
        const endDate = session.endTime ? new Date(session.endTime).toLocaleString() : 'In progress';
        const duration = session.endTime ? 
          Math.round((session.endTime - session.startTime) / 1000 / 60) + ' minutes' : 
          'In progress';

        let markdown = `# Edit Session Report\n\n`;
        markdown += `- **Start:** ${startDate}\n`;
        markdown += `- **End:** ${endDate}\n`;
        markdown += `- **Duration:** ${duration}\n`;
        markdown += `- **Changes:** ${session.changes.length}\n`;
        markdown += `- **Words:** ${session.wordCount}\n`;
        markdown += `- **Characters:** ${session.characterCount}\n\n`;

        if (session.changes.length > 0) {
          markdown += `## Changes\n\n`;
          for (const change of session.changes) {
            const time = new Date(change.timestamp).toLocaleTimeString();
            markdown += `- **${time}** - ${change.type} at position ${change.from}-${change.to}\n`;
            if (change.text) {
              markdown += `  - Added: "${change.text}"\n`;
            }
            if (change.removedText) {
              markdown += `  - Removed: "${change.removedText}"\n`;
            }
          }
        }

        return markdown;
      
      default:
        return JSON.stringify(session, null, 2);
    }
  }

  // Clean up old sessions based on retention policy
  cleanupOldSessions() {
    if (this.plugin.settings.retentionDays === 0) return; // Keep forever

    const cutoffTime = Date.now() - (this.plugin.settings.retentionDays * 24 * 60 * 60 * 1000);
    const toDelete: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < cutoffTime) {
        toDelete.push(sessionId);
      }
    }

    for (const sessionId of toDelete) {
      this.sessions.delete(sessionId);
    }

    if (toDelete.length > 0) {
      this.saveSessions();
    }
  }
}