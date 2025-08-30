/**
 * Test Harness Integration - Connects testing system to TrackEditsPlugin
 * Provides non-invasive integration with the main plugin for test mode
 */

import { TestLogger } from './test-logger';
import { ConsoleInterceptor } from './console-interceptor';
import { LogFileManager, TestSession } from './log-file-manager';

export interface TestHarnessConfig {
  sessionId?: string;
  enableConsoleInterception: boolean;
  enableVisualMonitoring: boolean;
  autoGenerateReports: boolean;
  cleanupOnExit: boolean;
}

export class TestHarnessIntegration {
  private testLogger: TestLogger | null = null;
  private consoleInterceptor: ConsoleInterceptor | null = null;
  private logFileManager: LogFileManager;
  private currentSession: TestSession | null = null;
  private isActive: boolean = false;
  private config: TestHarnessConfig;

  constructor(config: Partial<TestHarnessConfig> = {}) {
    this.config = {
      sessionId: `test_${Date.now()}`,
      enableConsoleInterception: true,
      enableVisualMonitoring: true,
      autoGenerateReports: true,
      cleanupOnExit: true,
      ...config
    };

    this.logFileManager = new LogFileManager();
  }

  isTestMode(): boolean {
    // Check if we're in test mode via environment or URL params
    return process.env.NODE_ENV === 'test' || 
           window.location.search.includes('test-mode=true') ||
           window.location.hash.includes('test-mode');
  }

  async startTestHarness(): Promise<{ success: boolean; session?: TestSession; error?: string }> {
    try {
      if (this.isActive) {
        return { success: false, error: 'Test harness already active' };
      }

      if (!this.isTestMode()) {
        return { success: false, error: 'Not in test mode' };
      }

      console.log('[TestHarness] Starting test harness integration...');

      // Create test session
      this.currentSession = this.logFileManager.createSession(this.config.sessionId!);

      // Initialize test logger
      this.testLogger = new TestLogger(this.currentSession.sessionId);

      // Setup console interception if enabled
      if (this.config.enableConsoleInterception) {
        this.consoleInterceptor = new ConsoleInterceptor(this.testLogger, {
          captureStackTraces: true,
          preserveOriginalConsole: true,
          maxStackDepth: 8
        });
        this.consoleInterceptor.start();
      }

      // Log test harness start
      this.testLogger.log({
        level: 'INFO',
        category: 'STATE',
        component: 'TEST_HARNESS',
        action: 'HARNESS_STARTED',
        data: {
          sessionId: this.currentSession.sessionId,
          config: this.config,
          timestamp: Date.now()
        }
      });

      this.isActive = true;
      this.logFileManager.updateLatestSymlink(this.currentSession);

      console.log(`[TestHarness] Test session started: ${this.currentSession.outputDir}`);
      return { success: true, session: this.currentSession };

    } catch (error) {
      console.error('[TestHarness] Failed to start test harness:', error);
      return { success: false, error: error.message };
    }
  }

  async stopTestHarness(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isActive) {
        return { success: false, error: 'Test harness not active' };
      }

      console.log('[TestHarness] Stopping test harness...');

      // Log test harness stop
      if (this.testLogger) {
        this.testLogger.log({
          level: 'INFO',
          category: 'STATE',
          component: 'TEST_HARNESS',
          action: 'HARNESS_STOPPED',
          data: {
            sessionId: this.currentSession?.sessionId,
            timestamp: Date.now()
          }
        });

        // Flush any remaining logs
        this.testLogger.flush();
      }

      // Stop console interception
      if (this.consoleInterceptor) {
        this.consoleInterceptor.stop();
        this.consoleInterceptor = null;
      }

      // Complete session
      if (this.currentSession) {
        this.logFileManager.completeSession(this.currentSession);
      }

      // Cleanup if configured
      if (this.config.cleanupOnExit) {
        this.logFileManager.cleanupOldSessions();
      }

      this.isActive = false;
      this.testLogger = null;
      this.currentSession = null;

      console.log('[TestHarness] Test harness stopped successfully');
      return { success: true };

    } catch (error) {
      console.error('[TestHarness] Failed to stop test harness:', error);
      return { success: false, error: error.message };
    }
  }

  // Plugin integration hooks
  logPluginEvent(component: string, action: string, data: any, correlationId?: string): void {
    if (!this.testLogger || !this.isActive) return;

    this.testLogger.log({
      level: 'INFO',
      category: 'EVENT',
      component,
      action,
      data,
      correlationId
    });
  }

  logUIEvent(action: string, data: any, visualContext?: any): void {
    if (!this.testLogger || !this.isActive) return;

    this.testLogger.log({
      level: 'INFO',
      category: 'UI',
      component: 'TRACK_EDITS_UI',
      action,
      data,
      visualContext
    });
  }

  logPerformanceEvent(operation: string, duration: number, data?: any): void {
    if (!this.testLogger || !this.isActive) return;

    this.testLogger.log({
      level: duration > 16 ? 'WARN' : 'INFO', // Flag operations over 16ms
      category: 'PERFORMANCE',
      component: 'PERFORMANCE_MONITOR',
      action: operation,
      data: {
        duration,
        threshold: 16,
        ...data
      }
    });
  }

  logError(error: Error, component: string, context?: any): void {
    if (!this.testLogger || !this.isActive) return;

    this.testLogger.log({
      level: 'ERROR',
      category: 'ERROR',
      component,
      action: 'ERROR_OCCURRED',
      data: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        context
      }
    });
  }

  // Enhanced debug integration with existing DebugMonitor
  integrateWithExistingDebugMonitor(debugMonitor: any): void {
    if (!this.testLogger || !this.isActive) return;

    try {
      // Patch the existing log method to also send to test logger
      const originalLog = debugMonitor.log;
      debugMonitor.log = (type: string, data: any) => {
        // Call original method first
        originalLog.call(debugMonitor, type, data);

        // Send to test logger
        this.testLogger!.log({
          level: this.mapDebugTypeToLevel(type),
          category: this.mapDebugTypeToCategory(type),
          component: 'DEBUG_MONITOR_INTEGRATION',
          action: type,
          data
        });
      };

      console.log('[TestHarness] Integrated with existing DebugMonitor');
    } catch (error) {
      console.error('[TestHarness] Failed to integrate with DebugMonitor:', error);
    }
  }

  private mapDebugTypeToLevel(type: string): 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' {
    if (type.includes('ERROR') || type.includes('FAILED')) return 'ERROR';
    if (type.includes('WARN') || type.includes('SLOW')) return 'WARN';
    if (type.includes('DEBUG')) return 'DEBUG';
    return 'INFO';
  }

  private mapDebugTypeToCategory(type: string): 'UI' | 'STATE' | 'API' | 'EVENT' | 'ERROR' | 'PERFORMANCE' {
    if (type.includes('UI') || type.includes('VISUAL')) return 'UI';
    if (type.includes('STATE') || type.includes('SESSION')) return 'STATE';
    if (type.includes('API') || type.includes('METHOD')) return 'API';
    if (type.includes('EVENT') || type.includes('DISPATCH')) return 'EVENT';
    if (type.includes('ERROR') || type.includes('FAILED')) return 'ERROR';
    if (type.includes('PERF') || type.includes('TIMER')) return 'PERFORMANCE';
    return 'STATE';
  }

  // Getters for current state
  getCurrentSession(): TestSession | null {
    return this.currentSession;
  }

  getTestLogger(): TestLogger | null {
    return this.testLogger;
  }

  isRunning(): boolean {
    return this.isActive;
  }

  // Generate quick status report
  getStatus(): any {
    const session = this.currentSession;
    const summary = this.logFileManager.getSessionSummary();
    
    return {
      isActive: this.isActive,
      isTestMode: this.isTestMode(),
      currentSession: session ? {
        sessionId: session.sessionId,
        startTime: new Date(session.startTime).toISOString(),
        outputDir: session.outputDir,
        status: session.status
      } : null,
      globalSummary: summary,
      config: this.config
    };
  }
}