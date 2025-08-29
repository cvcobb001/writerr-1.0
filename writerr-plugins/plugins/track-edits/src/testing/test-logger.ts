/**
 * Enhanced Test Logger - Structured logging system for Track Edits testing
 * Addresses the critical problem of manual console log copying by providing
 * automatic file writing and structured data capture.
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface TestLogEntry {
  timestamp: number;
  sessionId: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'TRACE';
  category: 'UI' | 'STATE' | 'API' | 'EVENT' | 'ERROR' | 'CONSOLE' | 'PERFORMANCE';
  component: string;
  action: string;
  data: any;
  correlationId?: string;
  visualContext?: VisualState;
}

export interface VisualState {
  sidePanelVisible: boolean;
  sidePanelContent: string;
  editHighlights: EditHighlight[];
  ribbonState: 'active' | 'inactive';
  documentState: DocumentState;
  timestamp: number;
}

export interface EditHighlight {
  id: string;
  type: 'insert' | 'delete';
  from: number;
  to: number;
  text?: string;
  removedText?: string;
}

export interface DocumentState {
  filePath: string;
  wordCount: number;
  characterCount: number;
  hasUnsavedChanges: boolean;
}

export class TestLogger {
  private logBuffer: TestLogEntry[] = [];
  private sessionId: string;
  private outputDir: string;
  private logFile: string;
  private maxBufferSize: number = 1000;
  private maxFileSize: number = 50 * 1024 * 1024; // 50MB
  private rotationCount: number = 0;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.outputDir = this.getOutputDirectory();
    this.logFile = join(this.outputDir, 'test-logs.jsonl');
    this.setupFileWriter();
  }

  private getOutputDirectory(): string {
    const timestamp = new Date().toISOString().slice(0, 16).replace(':', '-');
    const baseDir = '.agent-os/test-sessions';
    const sessionDir = join(baseDir, `${timestamp}-${this.sessionId}`);
    
    // Ensure directory exists
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true });
    }
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }
    
    return sessionDir;
  }

  private setupFileWriter(): void {
    try {
      // Write session header
      const header = {
        sessionStart: new Date().toISOString(),
        sessionId: this.sessionId,
        testingFramework: 'Track Edits Iterative Testing Suite v1.0',
        logFormat: 'JSON Lines (JSONL)'
      };
      
      writeFileSync(this.logFile, JSON.stringify(header) + '\n');
      console.log(`[TestLogger] Log file created: ${this.logFile}`);
    } catch (error) {
      console.error(`[TestLogger] Failed to setup file writer:`, error);
    }
  }

  log(entry: Partial<TestLogEntry>): void {
    const fullEntry: TestLogEntry = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      level: entry.level || 'INFO',
      category: entry.category || 'STATE',
      component: entry.component || 'UNKNOWN',
      action: entry.action || '',
      data: entry.data || {},
      ...entry
    };

    // Add to buffer
    this.logBuffer.push(fullEntry);
    
    // Write to file immediately (no manual copy-paste needed)
    this.writeToFile(fullEntry);
    
    // Check for interesting patterns
    this.checkForPatterns(fullEntry);
    
    // Manage buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.splice(0, 500); // Remove oldest 500 entries
    }
  }

  private writeToFile(entry: TestLogEntry): void {
    try {
      // Check file size and rotate if needed
      if (existsSync(this.logFile)) {
        const stats = require('fs').statSync(this.logFile);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile();
        }
      }

      // Append entry as JSON line
      appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error(`[TestLogger] Failed to write to file:`, error);
    }
  }

  private rotateLogFile(): void {
    try {
      this.rotationCount++;
      const rotatedFile = this.logFile.replace('.jsonl', `-${this.rotationCount}.jsonl`);
      require('fs').renameSync(this.logFile, rotatedFile);
      
      // Create new log file
      this.setupFileWriter();
      console.log(`[TestLogger] Log file rotated to: ${rotatedFile}`);
    } catch (error) {
      console.error(`[TestLogger] Failed to rotate log file:`, error);
    }
  }

  private checkForPatterns(entry: TestLogEntry): void {
    // Detect duplicate processing pattern (whenwhen->iiff case)
    if (entry.category === 'UI' && entry.action === 'EDIT_HIGHLIGHT' && entry.data) {
      const highlights = entry.data.highlights || [];
      const duplicates = this.findDuplicateHighlights(highlights);
      
      if (duplicates.length > 0) {
        this.log({
          level: 'WARN',
          category: 'ERROR',
          component: 'PATTERN_DETECTOR',
          action: 'DUPLICATE_PROCESSING',
          data: {
            originalEntry: entry,
            duplicates,
            pattern: 'User visual issue - needs review'
          },
          correlationId: entry.correlationId
        });
      }
    }

    // Detect console success + visual failure gaps
    if (entry.category === 'CONSOLE' && entry.level === 'INFO' && 
        entry.data && entry.data.includes && entry.data.includes('success')) {
      
      // Look for recent visual errors
      const recentVisualErrors = this.logBuffer
        .filter(log => log.timestamp > entry.timestamp - 5000) // 5 seconds
        .filter(log => log.category === 'UI' && log.level === 'ERROR');
      
      if (recentVisualErrors.length > 0) {
        this.log({
          level: 'ERROR',
          category: 'ERROR',
          component: 'PATTERN_DETECTOR',
          action: 'VISUAL_CONSOLE_GAP',
          data: {
            consoleSuccess: entry,
            visualFailures: recentVisualErrors,
            pattern: 'Console reports success but visual state shows errors'
          },
          correlationId: entry.correlationId
        });
      }
    }
  }

  private findDuplicateHighlights(highlights: EditHighlight[]): EditHighlight[] {
    const seen = new Map<string, EditHighlight>();
    const duplicates: EditHighlight[] = [];
    
    for (const highlight of highlights) {
      const key = `${highlight.from}-${highlight.to}-${highlight.text}`;
      if (seen.has(key)) {
        duplicates.push(highlight);
      } else {
        seen.set(key, highlight);
      }
    }
    
    return duplicates;
  }

  getEntriesSince(timestamp: number): TestLogEntry[] {
    return this.logBuffer.filter(entry => entry.timestamp >= timestamp);
  }

  getEntriesByCategory(category: TestLogEntry['category']): TestLogEntry[] {
    return this.logBuffer.filter(entry => entry.category === category);
  }

  getEntriesByCorrelationId(correlationId: string): TestLogEntry[] {
    return this.logBuffer.filter(entry => entry.correlationId === correlationId);
  }

  exportSession(): { outputDir: string; logFile: string; entryCount: number } {
    return {
      outputDir: this.outputDir,
      logFile: this.logFile,
      entryCount: this.logBuffer.length
    };
  }

  flush(): void {
    // Force write any remaining buffer to file
    try {
      const flushEntry = {
        timestamp: Date.now(),
        sessionId: this.sessionId,
        level: 'INFO' as const,
        category: 'STATE' as const,
        component: 'TEST_LOGGER',
        action: 'SESSION_FLUSH',
        data: { 
          bufferSize: this.logBuffer.length,
          totalEntries: this.logBuffer.length
        }
      };
      
      appendFileSync(this.logFile, JSON.stringify(flushEntry) + '\n');
      console.log(`[TestLogger] Session flushed - ${this.logBuffer.length} entries written to ${this.logFile}`);
    } catch (error) {
      console.error(`[TestLogger] Failed to flush session:`, error);
    }
  }

  // Utility method to generate correlation IDs
  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}