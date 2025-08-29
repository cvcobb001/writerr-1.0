/**
 * Console Interceptor - Automatic console log capture system
 * Eliminates manual copy-pasting of console logs by intercepting all console output
 * and routing it through the structured test logging system.
 */

import { TestLogger, TestLogEntry } from './test-logger';

export interface ConsoleInterceptionConfig {
  captureStackTraces: boolean;
  filterPatterns?: RegExp[];
  maxStackDepth: number;
  preserveOriginalConsole: boolean;
}

export class ConsoleInterceptor {
  private testLogger: TestLogger;
  private originalConsole: Console;
  private config: ConsoleInterceptionConfig;
  private isActive: boolean = false;

  constructor(testLogger: TestLogger, config: Partial<ConsoleInterceptionConfig> = {}) {
    this.testLogger = testLogger;
    this.originalConsole = { ...window.console };
    this.config = {
      captureStackTraces: true,
      maxStackDepth: 10,
      preserveOriginalConsole: true,
      ...config
    };
  }

  start(): void {
    if (this.isActive) {
      console.warn('[ConsoleInterceptor] Already active, ignoring start request');
      return;
    }

    this.isActive = true;
    this.interceptConsoleMethods();
    
    this.testLogger.log({
      level: 'INFO',
      category: 'STATE',
      component: 'CONSOLE_INTERCEPTOR',
      action: 'INTERCEPTION_STARTED',
      data: { 
        config: this.config,
        timestamp: Date.now()
      }
    });

    console.log('[ConsoleInterceptor] Console interception started');
  }

  stop(): void {
    if (!this.isActive) {
      console.warn('[ConsoleInterceptor] Not active, ignoring stop request');
      return;
    }

    this.restoreOriginalConsole();
    this.isActive = false;
    
    // Log to original console since we're stopping interception
    this.originalConsole.log('[ConsoleInterceptor] Console interception stopped');
  }

  private interceptConsoleMethods(): void {
    const methodsToIntercept: (keyof Console)[] = ['log', 'warn', 'error', 'debug', 'info', 'trace'];
    
    methodsToIntercept.forEach(method => {
      const originalMethod = this.originalConsole[method];
      
      (window.console as any)[method] = (...args: any[]) => {
        // Capture to test logger first
        this.captureConsoleCall(method as string, args);
        
        // Call original console method if configured to preserve
        if (this.config.preserveOriginalConsole && originalMethod) {
          originalMethod.apply(this.originalConsole, args);
        }
      };
    });
  }

  private captureConsoleCall(method: string, args: any[]): void {
    try {
      // Filter out internal logging calls to prevent recursion
      if (this.isInternalLoggingCall(args)) {
        return;
      }

      // Apply filters if configured
      if (this.config.filterPatterns && this.shouldFilterCall(args)) {
        return;
      }

      const entry: Partial<TestLogEntry> = {
        level: this.mapConsoleMethodToLevel(method),
        category: 'CONSOLE',
        component: 'CONSOLE_CAPTURE',
        action: method.toUpperCase(),
        data: {
          method,
          args: this.serializeArgs(args),
          callStack: this.config.captureStackTraces ? this.captureStackTrace() : undefined,
          timestamp: Date.now()
        },
        correlationId: TestLogger.generateCorrelationId()
      };

      this.testLogger.log(entry);
    } catch (error) {
      // Fallback to original console to avoid breaking the application
      this.originalConsole.error('[ConsoleInterceptor] Error capturing console call:', error);
    }
  }

  private isInternalLoggingCall(args: any[]): boolean {
    // Check if this is from our own logging system to prevent recursion
    const firstArg = args[0];
    if (typeof firstArg === 'string') {
      return firstArg.includes('[TestLogger]') || 
             firstArg.includes('[ConsoleInterceptor]') ||
             firstArg.includes('[VisualStateMonitor]');
    }
    return false;
  }

  private shouldFilterCall(args: any[]): boolean {
    if (!this.config.filterPatterns) return false;
    
    const combinedText = args.join(' ');
    return this.config.filterPatterns.some(pattern => pattern.test(combinedText));
  }

  private mapConsoleMethodToLevel(method: string): TestLogEntry['level'] {
    switch (method.toLowerCase()) {
      case 'error': return 'ERROR';
      case 'warn': return 'WARN';
      case 'debug': return 'DEBUG';
      case 'trace': return 'TRACE';
      default: return 'INFO';
    }
  }

  private serializeArgs(args: any[]): any[] {
    return args.map(arg => {
      try {
        // Handle different argument types
        if (arg === null || arg === undefined) {
          return arg;
        }
        
        if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
          return arg;
        }
        
        if (typeof arg === 'function') {
          return `[Function: ${arg.name || 'anonymous'}]`;
        }
        
        if (arg instanceof Error) {
          return {
            name: arg.name,
            message: arg.message,
            stack: arg.stack
          };
        }
        
        if (typeof arg === 'object') {
          // Handle circular references and deep objects safely
          return this.safeStringifyObject(arg);
        }
        
        return String(arg);
      } catch (error) {
        return `[Serialization Error: ${error.message}]`;
      }
    });
  }

  private safeStringifyObject(obj: any, depth: number = 0): any {
    if (depth > 3) return '[Object: max depth reached]';
    
    try {
      if (obj === null || obj === undefined) return obj;
      
      if (Array.isArray(obj)) {
        return obj.slice(0, 10).map(item => 
          typeof item === 'object' ? this.safeStringifyObject(item, depth + 1) : item
        );
      }
      
      const result: any = {};
      const keys = Object.keys(obj).slice(0, 20); // Limit keys to prevent huge objects
      
      for (const key of keys) {
        try {
          const value = obj[key];
          
          if (typeof value === 'function') {
            result[key] = `[Function: ${value.name || 'anonymous'}]`;
          } else if (typeof value === 'object' && value !== null) {
            result[key] = this.safeStringifyObject(value, depth + 1);
          } else {
            result[key] = value;
          }
        } catch (keyError) {
          result[key] = `[Error accessing property: ${keyError.message}]`;
        }
      }
      
      return result;
    } catch (error) {
      return `[Object serialization error: ${error.message}]`;
    }
  }

  private captureStackTrace(): string[] {
    try {
      const stack = new Error().stack;
      if (!stack) return [];
      
      const lines = stack.split('\n')
        .slice(2) // Remove Error line and this function
        .slice(0, this.config.maxStackDepth)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      return lines;
    } catch (error) {
      return [`[Stack trace error: ${error.message}]`];
    }
  }

  private restoreOriginalConsole(): void {
    try {
      // Restore all original console methods
      Object.keys(this.originalConsole).forEach(key => {
        if (typeof this.originalConsole[key as keyof Console] === 'function') {
          (window.console as any)[key] = this.originalConsole[key as keyof Console];
        }
      });
    } catch (error) {
      this.originalConsole.error('[ConsoleInterceptor] Error restoring original console:', error);
    }
  }

  // Utility method to manually log without interception
  logDirect(message: string, data?: any): void {
    this.originalConsole.log(`[ConsoleInterceptor] ${message}`, data || '');
  }

  // Get current interception stats
  getStats(): { isActive: boolean; config: ConsoleInterceptionConfig } {
    return {
      isActive: this.isActive,
      config: this.config
    };
  }
}