/**
 * @fileoverview Security-focused logging and monitoring system
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export enum SecurityEventType {
  AUTHENTICATION_ATTEMPT = 'auth_attempt',
  AUTHORIZATION_FAILURE = 'auth_failure',
  INPUT_SANITIZATION = 'input_sanitization',
  FUNCTION_SANDBOX_VIOLATION = 'function_sandbox_violation',
  MODE_VALIDATION_FAILURE = 'mode_validation_failure',
  DATA_VALIDATION_FAILURE = 'data_validation_failure',
  SENSITIVE_DATA_DETECTED = 'sensitive_data_detected',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  RESOURCE_LIMIT_EXCEEDED = 'resource_limit_exceeded',
  SECURITY_POLICY_VIOLATION = 'security_policy_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SYSTEM_COMPROMISE_ATTEMPT = 'system_compromise_attempt'
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  eventType: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  userId?: string;
  sessionId?: string;
  description: string;
  details: Record<string, any>;
  remediation?: string;
  tags: string[];
}

export interface LoggerConfig {
  logLevel: LogLevel;
  enableConsoleOutput: boolean;
  enableFileOutput: boolean;
  enableRemoteLogging: boolean;
  sanitizeOutput: boolean;
  maxLogFileSize: number;
  maxLogFiles: number;
  remoteEndpoint?: string;
  bufferSize: number;
  flushInterval: number;
}

export class SecurityLogger {
  private static instance: SecurityLogger;
  private config: LoggerConfig;
  private logBuffer: SecurityEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private eventCallbacks: Map<SecurityEventType, ((event: SecurityEvent) => void)[]> = new Map();

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      logLevel: LogLevel.INFO,
      enableConsoleOutput: true,
      enableFileOutput: false,
      enableRemoteLogging: false,
      sanitizeOutput: true,
      maxLogFileSize: 10 * 1024 * 1024, // 10MB
      maxLogFiles: 5,
      bufferSize: 100,
      flushInterval: 60000, // 1 minute
      ...config
    };

    this.setupFlushTimer();
  }

  static getInstance(config?: Partial<LoggerConfig>): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger(config);
    }
    return SecurityLogger.instance;
  }

  /**
   * Log a security event
   */
  logSecurityEvent(
    eventType: SecurityEventType,
    severity: SecurityEvent['severity'],
    source: string,
    description: string,
    details: Record<string, any> = {},
    remediation?: string
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType,
      severity,
      source,
      description,
      details: this.config.sanitizeOutput ? this.sanitizeDetails(details) : details,
      remediation,
      tags: this.generateTags(eventType, severity, source)
    };

    // Add user context if available
    if (details.userId) event.userId = String(details.userId);
    if (details.sessionId) event.sessionId = String(details.sessionId);

    this.processEvent(event);
  }

  /**
   * Log input sanitization events
   */
  logInputSanitization(
    source: string,
    input: string,
    violations: any[],
    sanitizedValue: string
  ): void {
    const severity = violations.some(v => v.severity === 'critical') ? 'critical' :
                    violations.some(v => v.severity === 'high') ? 'high' : 'medium';

    this.logSecurityEvent(
      SecurityEventType.INPUT_SANITIZATION,
      severity,
      source,
      `Input sanitization performed with ${violations.length} violations`,
      {
        inputLength: input.length,
        sanitizedLength: sanitizedValue.length,
        violationCount: violations.length,
        violationTypes: violations.map(v => v.type),
        riskScore: violations.reduce((sum, v) => sum + (v.riskScore || 0), 0)
      },
      violations.length > 0 ? 'Review input validation rules and user training' : undefined
    );
  }

  /**
   * Log function sandbox violations
   */
  logFunctionSandboxViolation(
    functionId: string,
    violations: any[],
    executionTime: number,
    memoryUsage: number
  ): void {
    const severity = violations.some(v => v.severity === 'critical') ? 'critical' : 'high';

    this.logSecurityEvent(
      SecurityEventType.FUNCTION_SANDBOX_VIOLATION,
      severity,
      'function-sandbox',
      `Function ${functionId} violated sandbox security`,
      {
        functionId,
        violationCount: violations.length,
        violationTypes: violations.map(v => v.type),
        executionTime,
        memoryUsage,
        actions: violations.map(v => v.action)
      },
      'Review function definition and consider stricter sandbox policies'
    );
  }

  /**
   * Log mode validation failures
   */
  logModeValidationFailure(
    modeId: string,
    violations: any[],
    riskScore: number
  ): void {
    const severity = riskScore > 80 ? 'critical' : 
                    riskScore > 60 ? 'high' : 
                    riskScore > 40 ? 'medium' : 'low';

    this.logSecurityEvent(
      SecurityEventType.MODE_VALIDATION_FAILURE,
      severity,
      'mode-validator',
      `Mode ${modeId} failed security validation`,
      {
        modeId,
        riskScore,
        violationCount: violations.length,
        violationTypes: violations.map(v => v.type),
        fieldsAffected: [...new Set(violations.map(v => v.field))]
      },
      'Review mode definition and remove security violations'
    );
  }

  /**
   * Log data validation failures
   */
  logDataValidationFailure(
    source: string,
    dataSize: number,
    violations: any[]
  ): void {
    const severity = violations.some(v => v.severity === 'critical') ? 'critical' :
                    violations.some(v => v.severity === 'high') ? 'high' : 'medium';

    this.logSecurityEvent(
      SecurityEventType.DATA_VALIDATION_FAILURE,
      severity,
      source,
      `Data validation failed for ${dataSize} bytes of data`,
      {
        dataSize,
        violationCount: violations.length,
        violationTypes: violations.map(v => v.type),
        sensitiveDataDetected: violations.some(v => v.type === 'sensitive-data')
      },
      'Review data content and enable additional sanitization if needed'
    );
  }

  /**
   * Log sensitive data detection
   */
  logSensitiveDataDetection(
    source: string,
    dataType: string,
    detectionCount: number,
    confidence: number
  ): void {
    this.logSecurityEvent(
      SecurityEventType.SENSITIVE_DATA_DETECTED,
      confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low',
      source,
      `Detected ${detectionCount} instances of sensitive data (${dataType})`,
      {
        dataType,
        detectionCount,
        confidence,
        timestamp: new Date().toISOString()
      },
      'Enable data loss prevention policies and user training'
    );
  }

  /**
   * Log rate limit violations
   */
  logRateLimitExceeded(
    source: string,
    limit: number,
    currentCount: number,
    timeWindow: number
  ): void {
    this.logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      currentCount > limit * 2 ? 'high' : 'medium',
      source,
      `Rate limit exceeded: ${currentCount}/${limit} requests in ${timeWindow}ms`,
      {
        limit,
        currentCount,
        timeWindow,
        exceededBy: currentCount - limit,
        timestamp: new Date().toISOString()
      },
      'Implement stricter rate limiting or investigate potential abuse'
    );
  }

  /**
   * Log resource limit violations
   */
  logResourceLimitExceeded(
    resource: string,
    limit: number,
    actual: number,
    unit: string
  ): void {
    this.logSecurityEvent(
      SecurityEventType.RESOURCE_LIMIT_EXCEEDED,
      actual > limit * 1.5 ? 'high' : 'medium',
      'resource-monitor',
      `Resource limit exceeded: ${resource} used ${actual}${unit}, limit ${limit}${unit}`,
      {
        resource,
        limit,
        actual,
        unit,
        exceededBy: actual - limit,
        percentageOver: ((actual - limit) / limit * 100).toFixed(1)
      },
      'Review resource allocation and consider scaling or optimization'
    );
  }

  /**
   * Log suspicious activity patterns
   */
  logSuspiciousActivity(
    source: string,
    activityType: string,
    confidence: number,
    indicators: string[]
  ): void {
    this.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low',
      source,
      `Suspicious activity detected: ${activityType}`,
      {
        activityType,
        confidence,
        indicators,
        indicatorCount: indicators.length,
        timestamp: new Date().toISOString()
      },
      'Investigate activity patterns and consider implementing additional monitoring'
    );
  }

  /**
   * Register callback for specific event types
   */
  onSecurityEvent(eventType: SecurityEventType, callback: (event: SecurityEvent) => void): void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType)!.push(callback);
  }

  /**
   * Process and route security event
   */
  private processEvent(event: SecurityEvent): void {
    // Add to buffer
    this.logBuffer.push(event);

    // Check if immediate flush is needed for critical events
    if (event.severity === 'critical') {
      this.flush();
    } else if (this.logBuffer.length >= this.config.bufferSize) {
      this.flush();
    }

    // Console output
    if (this.config.enableConsoleOutput && this.shouldLog(event)) {
      this.outputToConsole(event);
    }

    // Trigger callbacks
    const callbacks = this.eventCallbacks.get(event.eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in security event callback:', error);
        }
      });
    }
  }

  /**
   * Check if event should be logged based on level
   */
  private shouldLog(event: SecurityEvent): boolean {
    const eventLevels = {
      low: LogLevel.DEBUG,
      medium: LogLevel.INFO,
      high: LogLevel.WARN,
      critical: LogLevel.ERROR
    };

    return eventLevels[event.severity] >= this.config.logLevel;
  }

  /**
   * Output event to console
   */
  private outputToConsole(event: SecurityEvent): void {
    const timestamp = event.timestamp.toISOString();
    const prefix = `[SECURITY][${event.severity.toUpperCase()}][${timestamp}]`;
    const message = `${prefix} ${event.source}: ${event.description}`;

    switch (event.severity) {
      case 'critical':
      case 'high':
        console.error(message, event.details);
        break;
      case 'medium':
        console.warn(message, event.details);
        break;
      default:
        console.log(message, event.details);
    }
  }

  /**
   * Flush log buffer to persistent storage
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const events = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // File output
      if (this.config.enableFileOutput) {
        await this.writeToFile(events);
      }

      // Remote logging
      if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
        await this.sendToRemote(events);
      }
    } catch (error) {
      console.error('Error flushing security logs:', error);
      // Put events back in buffer for retry
      this.logBuffer.unshift(...events);
    }
  }

  /**
   * Write events to log file
   */
  private async writeToFile(events: SecurityEvent[]): Promise<void> {
    // Implementation would write to rotating log files
    const logData = events.map(event => JSON.stringify(event)).join('\n') + '\n';
    
    // In a real implementation, this would use fs.appendFile with log rotation
    console.log('Would write to log file:', logData.length, 'bytes');
  }

  /**
   * Send events to remote logging service
   */
  private async sendToRemote(events: SecurityEvent[]): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.LOGGING_API_KEY
        },
        body: JSON.stringify({
          service: 'writerr-security',
          events
        })
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote service:', error);
      throw error;
    }
  }

  /**
   * Sanitize details to remove sensitive information
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential', 'auth'];

    for (const [key, value] of Object.entries(details)) {
      const keyLower = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '...[TRUNCATED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `sec-${timestamp}-${random}`;
  }

  /**
   * Generate tags for event categorization
   */
  private generateTags(eventType: SecurityEventType, severity: string, source: string): string[] {
    const tags = ['security', eventType, severity, source];
    
    // Add category tags based on event type
    if (eventType.includes('auth')) {
      tags.push('authentication');
    }
    if (eventType.includes('input') || eventType.includes('sanitization')) {
      tags.push('input-validation');
    }
    if (eventType.includes('data')) {
      tags.push('data-protection');
    }
    if (eventType.includes('limit')) {
      tags.push('resource-management');
    }

    return tags;
  }

  /**
   * Setup automatic buffer flushing
   */
  private setupFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Get security event statistics
   */
  getStatistics(timeRange: number = 3600000): {
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    eventsByType: Record<string, number>;
    topSources: Array<{ source: string; count: number }>;
  } {
    // This would query stored events in a real implementation
    // For now, return placeholder data
    return {
      totalEvents: this.logBuffer.length,
      eventsBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      eventsByType: {},
      topSources: []
    };
  }

  /**
   * Generate security report
   */
  generateSecurityReport(timeRange: number = 86400000): string {
    const stats = this.getStatistics(timeRange);
    const hours = timeRange / 3600000;

    return `# Security Monitoring Report

## Time Range
Last ${hours} hour(s) - ${new Date().toISOString()}

## Event Summary
- Total Security Events: ${stats.totalEvents}
- Critical Events: ${stats.eventsBySeverity.critical || 0}
- High Severity Events: ${stats.eventsBySeverity.high || 0}
- Medium Severity Events: ${stats.eventsBySeverity.medium || 0}
- Low Severity Events: ${stats.eventsBySeverity.low || 0}

## Configuration
- Log Level: ${LogLevel[this.config.logLevel]}
- Console Output: ${this.config.enableConsoleOutput ? 'Enabled' : 'Disabled'}
- File Output: ${this.config.enableFileOutput ? 'Enabled' : 'Disabled'}
- Remote Logging: ${this.config.enableRemoteLogging ? 'Enabled' : 'Disabled'}
- Output Sanitization: ${this.config.sanitizeOutput ? 'Enabled' : 'Disabled'}

## Buffer Status
- Current Buffer Size: ${this.logBuffer.length}/${this.config.bufferSize}
- Flush Interval: ${this.config.flushInterval / 1000} seconds

## Recommendations
${stats.eventsBySeverity.critical > 0 ? 
  '- URGENT: Review and address critical security events immediately' : ''}
${stats.eventsBySeverity.high > 10 ? 
  '- Consider implementing additional security controls for high-severity events' : ''}
${stats.totalEvents > 100 ? 
  '- High volume of security events detected - investigate for potential attacks' : ''}
- Regular security audits and monitoring configuration reviews recommended
- Ensure all security event callbacks are functioning properly

---

*Report generated by Writerr Security Logger*`;
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart flush timer if interval changed
    if (config.flushInterval && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.setupFlushTimer();
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush
    this.flush();
  }
}

// Export singleton instance
export const securityLogger = SecurityLogger.getInstance({
  logLevel: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.SECURITY_LOG_ENDPOINT
});