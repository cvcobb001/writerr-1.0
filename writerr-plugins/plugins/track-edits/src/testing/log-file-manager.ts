/**
 * Log File Manager - Handles file operations and session management
 * Provides structured file organization and cleanup for test sessions
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname, basename } from 'path';
import { TestLogEntry } from './test-logger';

export interface TestSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  outputDir: string;
  logFile: string;
  visualStateFile: string;
  reportFile: string;
  status: 'active' | 'completed' | 'failed';
  entryCount: number;
  fileSize: number;
}

export interface SessionSummary {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  failedSessions: number;
  totalLogEntries: number;
  totalStorageUsed: number;
  oldestSession?: TestSession;
  newestSession?: TestSession;
}

export class LogFileManager {
  private baseDir: string = '.agent-os/test-sessions';
  private maxSessions: number = 50;
  private maxStorageBytes: number = 2 * 1024 * 1024 * 1024; // 2GB
  private retentionDays: number = 30;

  constructor(config?: { maxSessions?: number; maxStorageBytes?: number; retentionDays?: number }) {
    if (config) {
      this.maxSessions = config.maxSessions || this.maxSessions;
      this.maxStorageBytes = config.maxStorageBytes || this.maxStorageBytes;
      this.retentionDays = config.retentionDays || this.retentionDays;
    }

    this.ensureBaseDirectory();
  }

  createSession(sessionId: string): TestSession {
    const timestamp = new Date().toISOString().slice(0, 16).replace(':', '-');
    const sessionDir = join(this.baseDir, `${timestamp}-${sessionId}`);
    
    // Create session directory
    mkdirSync(sessionDir, { recursive: true });

    const session: TestSession = {
      sessionId,
      startTime: Date.now(),
      outputDir: sessionDir,
      logFile: join(sessionDir, 'test-logs.jsonl'),
      visualStateFile: join(sessionDir, 'visual-states.json'),
      reportFile: join(sessionDir, 'report.html'),
      status: 'active',
      entryCount: 0,
      fileSize: 0
    };

    // Create session metadata file
    const metadataFile = join(sessionDir, 'session.json');
    writeFileSync(metadataFile, JSON.stringify(session, null, 2));

    console.log(`[LogFileManager] Created test session: ${sessionDir}`);
    return session;
  }

  updateSession(session: TestSession): void {
    try {
      // Update file size and entry count
      if (existsSync(session.logFile)) {
        const stats = statSync(session.logFile);
        session.fileSize = stats.size;
        
        // Count entries in log file
        const content = readFileSync(session.logFile, 'utf8');
        session.entryCount = content.split('\n').filter(line => line.trim().length > 0).length - 1; // Subtract header
      }

      // Update session metadata
      const metadataFile = join(session.outputDir, 'session.json');
      writeFileSync(metadataFile, JSON.stringify(session, null, 2));
    } catch (error) {
      console.error(`[LogFileManager] Failed to update session:`, error);
    }
  }

  completeSession(session: TestSession): void {
    session.endTime = Date.now();
    session.status = 'completed';
    this.updateSession(session);
    
    console.log(`[LogFileManager] Session completed: ${session.sessionId} (${session.entryCount} entries, ${session.fileSize} bytes)`);
  }

  failSession(session: TestSession, error: string): void {
    session.endTime = Date.now();
    session.status = 'failed';
    
    // Write error information
    const errorFile = join(session.outputDir, 'error.txt');
    writeFileSync(errorFile, `Session failed at ${new Date().toISOString()}\n\nError: ${error}\n`);
    
    this.updateSession(session);
    console.error(`[LogFileManager] Session failed: ${session.sessionId} - ${error}`);
  }

  getAllSessions(): TestSession[] {
    try {
      if (!existsSync(this.baseDir)) {
        return [];
      }

      const sessions: TestSession[] = [];
      const entries = readdirSync(this.baseDir);

      for (const entry of entries) {
        const sessionDir = join(this.baseDir, entry);
        const metadataFile = join(sessionDir, 'session.json');
        
        if (existsSync(metadataFile)) {
          try {
            const content = readFileSync(metadataFile, 'utf8');
            const session = JSON.parse(content) as TestSession;
            sessions.push(session);
          } catch (parseError) {
            console.warn(`[LogFileManager] Failed to parse session metadata: ${metadataFile}`);
          }
        }
      }

      // Sort by start time (newest first)
      return sessions.sort((a, b) => b.startTime - a.startTime);
    } catch (error) {
      console.error(`[LogFileManager] Failed to get all sessions:`, error);
      return [];
    }
  }

  getSessionSummary(): SessionSummary {
    const sessions = this.getAllSessions();
    
    const summary: SessionSummary = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length,
      totalLogEntries: sessions.reduce((sum, s) => sum + s.entryCount, 0),
      totalStorageUsed: sessions.reduce((sum, s) => sum + s.fileSize, 0)
    };

    if (sessions.length > 0) {
      summary.oldestSession = sessions[sessions.length - 1];
      summary.newestSession = sessions[0];
    }

    return summary;
  }

  cleanupOldSessions(): void {
    try {
      const sessions = this.getAllSessions();
      const now = Date.now();
      const cutoffTime = now - (this.retentionDays * 24 * 60 * 60 * 1000);
      
      let deletedSessions = 0;
      let freedBytes = 0;

      for (const session of sessions) {
        // Delete sessions older than retention period
        if (session.startTime < cutoffTime) {
          this.deleteSession(session);
          deletedSessions++;
          freedBytes += session.fileSize;
        }
      }

      // If still over limits, delete oldest sessions
      const remainingSessions = sessions.filter(s => s.startTime >= cutoffTime);
      const summary = this.getSessionSummary();
      
      if (remainingSessions.length > this.maxSessions || summary.totalStorageUsed > this.maxStorageBytes) {
        const excess = Math.max(0, remainingSessions.length - this.maxSessions);
        const sessionsToDelete = remainingSessions
          .sort((a, b) => a.startTime - b.startTime) // Oldest first
          .slice(0, excess);

        for (const session of sessionsToDelete) {
          this.deleteSession(session);
          deletedSessions++;
          freedBytes += session.fileSize;
        }
      }

      if (deletedSessions > 0) {
        console.log(`[LogFileManager] Cleanup completed: ${deletedSessions} sessions deleted, ${freedBytes} bytes freed`);
      }
    } catch (error) {
      console.error(`[LogFileManager] Failed to cleanup old sessions:`, error);
    }
  }

  private deleteSession(session: TestSession): void {
    try {
      const files = [
        session.logFile,
        session.visualStateFile,
        session.reportFile,
        join(session.outputDir, 'session.json'),
        join(session.outputDir, 'error.txt')
      ];

      for (const file of files) {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      }

      // Remove directory if empty
      try {
        const remaining = readdirSync(session.outputDir);
        if (remaining.length === 0) {
          require('fs').rmdirSync(session.outputDir);
        }
      } catch (dirError) {
        // Directory not empty or other error, leave it
      }
    } catch (error) {
      console.error(`[LogFileManager] Failed to delete session ${session.sessionId}:`, error);
    }
  }

  exportSessionData(sessionId: string): { success: boolean; data?: any; error?: string } {
    try {
      const sessions = this.getAllSessions();
      const session = sessions.find(s => s.sessionId === sessionId);
      
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      const data: any = {
        session: session,
        logEntries: [],
        visualStates: []
      };

      // Read log entries
      if (existsSync(session.logFile)) {
        const logContent = readFileSync(session.logFile, 'utf8');
        data.logEntries = logContent
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => {
            try {
              return JSON.parse(line);
            } catch (parseError) {
              return { error: 'Failed to parse log entry', raw: line };
            }
          });
      }

      // Read visual states
      if (existsSync(session.visualStateFile)) {
        const visualContent = readFileSync(session.visualStateFile, 'utf8');
        try {
          data.visualStates = JSON.parse(visualContent);
        } catch (parseError) {
          data.visualStates = { error: 'Failed to parse visual states' };
        }
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private ensureBaseDirectory(): void {
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
      console.log(`[LogFileManager] Created base directory: ${this.baseDir}`);
    }
  }

  // Utility method to get latest session directory (for creating symlink)
  getLatestSessionDir(): string | null {
    const sessions = this.getAllSessions();
    return sessions.length > 0 ? sessions[0].outputDir : null;
  }

  // Create/update 'latest' symlink for convenience
  updateLatestSymlink(session: TestSession): void {
    try {
      const latestPath = join(this.baseDir, 'latest');
      
      // Remove existing symlink if it exists
      if (existsSync(latestPath)) {
        unlinkSync(latestPath);
      }

      // Create new symlink (platform-specific implementation)
      if (process.platform === 'win32') {
        // On Windows, create a text file with the path
        writeFileSync(latestPath + '.txt', session.outputDir);
      } else {
        // On Unix-like systems, create actual symlink
        require('fs').symlinkSync(basename(session.outputDir), latestPath);
      }
    } catch (error) {
      // Symlink creation failure is not critical
      console.warn(`[LogFileManager] Failed to create latest symlink:`, error.message);
    }
  }
}