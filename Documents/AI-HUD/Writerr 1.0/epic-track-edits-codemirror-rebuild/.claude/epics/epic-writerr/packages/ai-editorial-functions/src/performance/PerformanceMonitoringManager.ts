/**
 * @fileoverview Performance Monitoring Manager - Tracks and manages function performance metrics
 */

import { EventData, globalEventBus } from '@writerr/shared';
import {
  PerformanceMonitor,
  PerformanceConfig,
  PerformanceMetrics,
  PerformanceAlert,
  AlertRule,
  AlertSeverity,
  PerformanceEvent,
  PerformanceEventType,
  ExecutionMetrics,
  ResourceMetrics,
  QualityMetrics,
  BusinessMetrics,
  HistoricalMetrics,
  TrendData,
  TimeSeriesPoint,
  PerformanceError
} from './types';
import { FunctionExecution } from '../types';

export class PerformanceMonitoringManager {
  private monitors = new Map<string, PerformanceMonitor>();
  private metricsHistory = new Map<string, PerformanceMetrics[]>();
  private activeAlerts = new Map<string, PerformanceAlert[]>();
  private monitoringTimer?: NodeJS.Timeout;
  private isEnabled = false;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    this.isEnabled = true;
    this.startMonitoringLoop();
    console.log('[PerformanceMonitoringManager] Initialized successfully');
  }

  /**
   * Configure performance monitoring for a function
   */
  configureFunction(functionId: string, config: Partial<PerformanceConfig>): void {
    try {
      const existingMonitor = this.monitors.get(functionId);
      
      const monitor: PerformanceMonitor = {
        functionId,
        isEnabled: true,
        configuration: {
          monitoring: this.createDefaultMonitoringConfig(),
          resourceLimits: this.createDefaultResourceLimits(),
          thresholds: this.createDefaultThresholds(),
          alerting: this.createDefaultAlertingConfig(),
          optimization: this.createDefaultOptimizationConfig(),
          ...config
        },
        metrics: existingMonitor?.metrics || this.createEmptyMetrics(functionId),
        alerts: existingMonitor?.alerts || [],
        lastUpdate: new Date()
      };

      this.monitors.set(functionId, monitor);
      
      if (!this.metricsHistory.has(functionId)) {
        this.metricsHistory.set(functionId, []);
      }
      
      this.emitPerformanceEvent(
        PerformanceEventType.OPTIMIZATION_APPLIED,
        functionId,
        { configuration: monitor.configuration },
        'info'
      );

    } catch (error) {
      console.error(`[PerformanceMonitoringManager] Error configuring function ${functionId}:`, error);
      throw new PerformanceError(
        `Failed to configure performance monitoring: ${(error as Error).message}`,
        functionId
      );
    }
  }

  /**
   * Record function execution metrics
   */
  recordExecution(execution: FunctionExecution): void {
    try {
      const monitor = this.monitors.get(execution.functionId);
      if (!monitor || !monitor.isEnabled) return;

      this.updateExecutionMetrics(monitor, execution);
      this.updateResourceMetrics(monitor, execution);
      this.updateQualityMetrics(monitor, execution);
      this.updateBusinessMetrics(monitor, execution);
      
      monitor.lastUpdate = new Date();
      
      // Check for threshold violations
      this.checkThresholds(monitor);
      
      // Check for resource exhaustion
      this.checkResourceLimits(monitor);

    } catch (error) {
      console.error(`[PerformanceMonitoringManager] Error recording execution:`, error);
    }
  }

  /**
   * Get current performance metrics for a function
   */
  getMetrics(functionId: string): PerformanceMetrics | null {
    const monitor = this.monitors.get(functionId);
    return monitor ? { ...monitor.metrics } : null;
  }

  /**
   * Get historical metrics for a function
   */
  getHistoricalMetrics(
    functionId: string,
    timeRange: string = '24h',
    granularity: string = '1h'
  ): PerformanceMetrics[] {
    const history = this.metricsHistory.get(functionId) || [];
    const cutoff = this.parseTimeRange(timeRange);
    
    return history
      .filter(metrics => metrics.timestamp.getTime() > cutoff)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get active alerts for a function
   */
  getActiveAlerts(functionId: string): PerformanceAlert[] {
    return this.activeAlerts.get(functionId)?.filter(alert => alert.isActive) || [];
  }

  /**
   * Get all active alerts
   */
  getAllActiveAlerts(): Map<string, PerformanceAlert[]> {
    const allAlerts = new Map<string, PerformanceAlert[]>();
    
    this.activeAlerts.forEach((alerts, functionId) => {
      const active = alerts.filter(alert => alert.isActive);
      if (active.length > 0) {
        allAlerts.set(functionId, active);
      }
    });
    
    return allAlerts;
  }

  /**
   * Enable monitoring for a function
   */
  enableMonitoring(functionId: string): void {
    const monitor = this.monitors.get(functionId);
    if (monitor) {
      monitor.isEnabled = true;
      monitor.lastUpdate = new Date();
    }
  }

  /**
   * Disable monitoring for a function
   */
  disableMonitoring(functionId: string): void {
    const monitor = this.monitors.get(functionId);
    if (monitor) {
      monitor.isEnabled = false;
      monitor.lastUpdate = new Date();
      
      // Resolve all active alerts
      const alerts = this.activeAlerts.get(functionId) || [];
      alerts.forEach(alert => {
        if (alert.isActive) {
          alert.isActive = false;
          alert.resolvedAt = new Date();
        }
      });
    }
  }

  /**
   * Update configuration for a function
   */
  updateConfiguration(functionId: string, configUpdate: Partial<PerformanceConfig>): void {
    const monitor = this.monitors.get(functionId);
    if (monitor) {
      monitor.configuration = {
        ...monitor.configuration,
        ...configUpdate
      };
      monitor.lastUpdate = new Date();
    }
  }

  /**
   * Generate performance report
   */
  generateReport(functionId: string, timeRange: string = '24h'): any {
    const monitor = this.monitors.get(functionId);
    if (!monitor) return null;

    const historicalMetrics = this.getHistoricalMetrics(functionId, timeRange);
    const alerts = this.activeAlerts.get(functionId) || [];
    
    return {
      functionId,
      timeRange,
      generatedAt: new Date(),
      
      // Current status
      currentStatus: this.assessCurrentStatus(monitor),
      
      // Summary metrics
      summary: this.generateSummary(monitor.metrics, historicalMetrics),
      
      // Trends
      trends: this.analyzeTrends(historicalMetrics),
      
      // Alerts
      alertSummary: {
        totalAlerts: alerts.length,
        activeAlerts: alerts.filter(a => a.isActive).length,
        criticalAlerts: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
        recentAlerts: alerts.filter(a => 
          a.triggeredAt.getTime() > Date.now() - this.parseTimeRange('24h')
        ).length
      },
      
      // Recommendations
      recommendations: this.generateRecommendations(monitor, historicalMetrics),
      
      // Raw data
      rawMetrics: monitor.metrics,
      historicalData: historicalMetrics.slice(-100) // Last 100 data points
    };
  }

  /**
   * Clean up old metrics and alerts
   */
  cleanup(): void {
    const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoff = Date.now() - retentionPeriod;

    // Clean up metrics history
    this.metricsHistory.forEach((history, functionId) => {
      const filtered = history.filter(metrics => metrics.timestamp.getTime() > cutoff);
      this.metricsHistory.set(functionId, filtered);
    });

    // Clean up resolved alerts
    this.activeAlerts.forEach((alerts, functionId) => {
      const filtered = alerts.filter(alert => 
        alert.isActive || (alert.resolvedAt && alert.resolvedAt.getTime() > cutoff)
      );
      this.activeAlerts.set(functionId, filtered);
    });

    console.log('[PerformanceMonitoringManager] Cleanup completed');
  }

  // Private helper methods
  private setupEventListeners(): void {
    globalEventBus.on('function-executed', (event: EventData) => {
      const execution = event.payload as FunctionExecution;
      this.recordExecution(execution);
    });

    globalEventBus.on('function-registered', (event: EventData) => {
      const functionDef = event.payload;
      // Auto-configure performance monitoring with defaults
      this.configureFunction(functionDef.id, {});
    });

    globalEventBus.on('resource-usage-updated', (event: EventData) => {
      const { functionId, usage } = event.payload;
      this.updateResourceUsage(functionId, usage);
    });
  }

  private startMonitoringLoop(): void {
    this.monitoringTimer = setInterval(() => {
      this.performPeriodicTasks();
    }, 60000); // Every minute
  }

  private performPeriodicTasks(): void {
    if (!this.isEnabled) return;

    try {
      // Update historical metrics
      this.captureHistoricalMetrics();
      
      // Check for stale monitors
      this.checkStaleMonitors();
      
      // Update trend data
      this.updateTrendData();
      
      // Process alert escalations
      this.processAlertEscalations();
      
      // Run periodic cleanup
      if (Math.random() < 0.1) { // 10% chance each cycle
        this.cleanup();
      }
      
    } catch (error) {
      console.error('[PerformanceMonitoringManager] Error in periodic tasks:', error);
    }
  }

  private updateExecutionMetrics(monitor: PerformanceMonitor, execution: FunctionExecution): void {
    const metrics = monitor.metrics.execution;
    
    metrics.totalRequests++;
    
    if (execution.status === 'completed') {
      metrics.successfulRequests++;
    } else if (execution.status === 'failed') {
      metrics.failedRequests++;
      
      // Update error metrics
      metrics.errors.count++;
      metrics.errors.rate = (metrics.failedRequests / metrics.totalRequests) * 100;
      metrics.errors.lastError = execution.endTime || new Date();
      
      // Track error by type
      const errorType = execution.error ? this.categorizeError(execution.error) : 'unknown';
      metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
    }
    
    // Update latency metrics
    if (execution.duration) {
      this.updateLatencyMetrics(metrics.latency, execution.duration);
    }
    
    // Update throughput metrics
    this.updateThroughputMetrics(metrics.throughput);
  }

  private updateLatencyMetrics(latency: any, duration: number): void {
    // Simple running average implementation
    const currentCount = latency.count || 0;
    const newCount = currentCount + 1;
    
    latency.average = ((latency.average * currentCount) + duration) / newCount;
    latency.min = Math.min(latency.min || duration, duration);
    latency.max = Math.max(latency.max || duration, duration);
    latency.count = newCount;
    
    // For percentiles, we'd need to maintain a histogram or use an approximate algorithm
    // This is a simplified implementation
    if (!latency.values) latency.values = [];
    latency.values.push(duration);
    
    // Keep only last 1000 values for percentile calculation
    if (latency.values.length > 1000) {
      latency.values = latency.values.slice(-1000);
    }
    
    // Calculate percentiles from sorted values
    const sorted = [...latency.values].sort((a, b) => a - b);
    const len = sorted.length;
    
    latency.median = len > 0 ? sorted[Math.floor(len * 0.5)] : 0;
    latency.p95 = len > 0 ? sorted[Math.floor(len * 0.95)] : 0;
    latency.p99 = len > 0 ? sorted[Math.floor(len * 0.99)] : 0;
  }

  private updateThroughputMetrics(throughput: any): void {
    const now = Date.now();
    
    if (!throughput.lastUpdate) {
      throughput.lastUpdate = now;
      throughput.requestCount = 1;
      throughput.windowStart = now;
      return;
    }
    
    const windowSize = 60000; // 1 minute window
    
    if (now - throughput.windowStart > windowSize) {
      // Calculate rates
      const timeElapsed = (now - throughput.windowStart) / 1000; // seconds
      throughput.requestsPerSecond = throughput.requestCount / timeElapsed;
      throughput.requestsPerMinute = throughput.requestCount;
      throughput.requestsPerHour = throughput.requestCount * (3600 / timeElapsed);
      
      // Reset window
      throughput.windowStart = now;
      throughput.requestCount = 1;
    } else {
      throughput.requestCount++;
    }
    
    throughput.lastUpdate = now;
  }

  private updateResourceMetrics(monitor: PerformanceMonitor, execution: FunctionExecution): void {
    const metrics = monitor.metrics.resources;
    
    // Estimate resource usage based on execution characteristics
    // In a real implementation, this would come from system monitoring
    
    // CPU estimation
    const estimatedCPU = this.estimateCPUUsage(execution);
    metrics.cpu.time += estimatedCPU;
    metrics.cpu.averagePerRequest = metrics.cpu.time / monitor.metrics.execution.totalRequests;
    
    // Memory estimation
    const estimatedMemory = this.estimateMemoryUsage(execution);
    metrics.memory.used += estimatedMemory;
    metrics.memory.averagePerRequest = metrics.memory.used / monitor.metrics.execution.totalRequests;
    metrics.memory.peak = Math.max(metrics.memory.peak, metrics.memory.used);
    
    // Network estimation
    const requestSize = execution.input?.length || 0;
    const responseSize = execution.output?.length || 0;
    
    metrics.network.bytesIn += requestSize;
    metrics.network.bytesOut += responseSize;
    
    const totalRequests = monitor.metrics.execution.totalRequests;
    metrics.network.requestSize.average = metrics.network.bytesIn / totalRequests;
    metrics.network.responseSize.average = metrics.network.bytesOut / totalRequests;
    
    metrics.network.requestSize.max = Math.max(metrics.network.requestSize.max || 0, requestSize);
    metrics.network.responseSize.max = Math.max(metrics.network.responseSize.max || 0, responseSize);
  }

  private updateQualityMetrics(monitor: PerformanceMonitor, execution: FunctionExecution): void {
    const metrics = monitor.metrics.quality;
    
    // Update output quality
    if (execution.confidence !== undefined) {
      const currentCount = metrics.outputQuality.count || 0;
      const newCount = currentCount + 1;
      
      metrics.outputQuality.average = ((metrics.outputQuality.average * currentCount) + execution.confidence) / newCount;
      metrics.outputQuality.min = Math.min(metrics.outputQuality.min || execution.confidence, execution.confidence);
      metrics.outputQuality.max = Math.max(metrics.outputQuality.max || execution.confidence, execution.confidence);
      metrics.outputQuality.count = newCount;
      
      // Update quality distribution
      const bucket = Math.floor(execution.confidence * 10) / 10; // Round to nearest 0.1
      const bucketKey = bucket.toString();
      metrics.outputQuality.distribution[bucketKey] = (metrics.outputQuality.distribution[bucketKey] || 0) + 1;
    }
    
    // Calculate consistency score (variance in quality)
    if (metrics.outputQuality.count && metrics.outputQuality.count > 1) {
      // Simplified consistency calculation
      const variance = this.calculateVariance(metrics.outputQuality.distribution);
      metrics.consistency.score = Math.max(0, 1 - variance);
      metrics.consistency.variance = variance;
    }
  }

  private updateBusinessMetrics(monitor: PerformanceMonitor, execution: FunctionExecution): void {
    const metrics = monitor.metrics.business;
    
    // Estimate costs (this would integrate with actual cost tracking)
    const estimatedCost = this.estimateExecutionCost(execution);
    metrics.costs.total += estimatedCost;
    metrics.costs.perRequest = metrics.costs.total / monitor.metrics.execution.totalRequests;
    
    // Update cost breakdown
    const modelCost = estimatedCost * 0.8; // 80% model cost
    const infrastructureCost = estimatedCost * 0.2; // 20% infrastructure cost
    
    metrics.costs.breakdown['model'] = (metrics.costs.breakdown['model'] || 0) + modelCost;
    metrics.costs.breakdown['infrastructure'] = (metrics.costs.breakdown['infrastructure'] || 0) + infrastructureCost;
    
    // Update usage metrics (simplified)
    if (execution.metadata?.sessionId) {
      metrics.usage.totalSessions = Math.max(metrics.usage.totalSessions, 1);
    }
    
    // Estimate time saved (this would be based on user feedback or benchmarks)
    const timeSaved = this.estimateTimeSaved(execution);
    metrics.value.timesSaved += timeSaved;
    metrics.value.automationRate = Math.min(100, (metrics.usage.totalSessions / 100) * 100); // Simplified
  }

  private checkThresholds(monitor: PerformanceMonitor): void {
    const metrics = monitor.metrics;
    const thresholds = monitor.configuration.thresholds;
    
    // Check latency thresholds
    if (metrics.execution.latency.p95 > thresholds.latency.critical) {
      this.triggerAlert(monitor, 'latency-p95-critical', 
        `P95 latency (${metrics.execution.latency.p95}ms) exceeds critical threshold (${thresholds.latency.critical}ms)`,
        AlertSeverity.CRITICAL
      );
    } else if (metrics.execution.latency.p95 > thresholds.latency.warning) {
      this.triggerAlert(monitor, 'latency-p95-warning',
        `P95 latency (${metrics.execution.latency.p95}ms) exceeds warning threshold (${thresholds.latency.warning}ms)`,
        AlertSeverity.WARNING
      );
    }
    
    // Check error rate thresholds
    if (metrics.execution.errors.rate > thresholds.errorRate.critical) {
      this.triggerAlert(monitor, 'error-rate-critical',
        `Error rate (${metrics.execution.errors.rate}%) exceeds critical threshold (${thresholds.errorRate.critical}%)`,
        AlertSeverity.CRITICAL
      );
    } else if (metrics.execution.errors.rate > thresholds.errorRate.warning) {
      this.triggerAlert(monitor, 'error-rate-warning',
        `Error rate (${metrics.execution.errors.rate}%) exceeds warning threshold (${thresholds.errorRate.warning}%)`,
        AlertSeverity.WARNING
      );
    }
    
    // Check quality thresholds
    if (metrics.quality.outputQuality.average < thresholds.quality.critical) {
      this.triggerAlert(monitor, 'quality-critical',
        `Average quality (${metrics.quality.outputQuality.average}) below critical threshold (${thresholds.quality.critical})`,
        AlertSeverity.CRITICAL
      );
    } else if (metrics.quality.outputQuality.average < thresholds.quality.warning) {
      this.triggerAlert(monitor, 'quality-warning',
        `Average quality (${metrics.quality.outputQuality.average}) below warning threshold (${thresholds.quality.warning})`,
        AlertSeverity.WARNING
      );
    }
  }

  private checkResourceLimits(monitor: PerformanceMonitor): void {
    const metrics = monitor.metrics;
    const limits = monitor.configuration.resourceLimits;
    
    // Check memory limits
    if (metrics.resources.memory.used > limits.maxMemoryUsage) {
      this.triggerAlert(monitor, 'memory-limit-exceeded',
        `Memory usage (${metrics.resources.memory.used} bytes) exceeds limit (${limits.maxMemoryUsage} bytes)`,
        AlertSeverity.CRITICAL
      );
    }
    
    // Check cost limits
    const currentHourCost = this.calculateHourlyCost(metrics.business.costs.total);
    if (currentHourCost > limits.maxCostPerHour) {
      this.triggerAlert(monitor, 'cost-limit-exceeded',
        `Hourly cost ($${currentHourCost}) exceeds limit ($${limits.maxCostPerHour})`,
        AlertSeverity.ERROR
      );
    }
  }

  private triggerAlert(monitor: PerformanceMonitor, ruleId: string, message: string, severity: AlertSeverity): void {
    const existingAlert = this.findActiveAlert(monitor.functionId, ruleId);
    if (existingAlert) {
      // Update existing alert
      existingAlert.details.duration = Date.now() - existingAlert.triggeredAt.getTime();
      return;
    }
    
    // Create new alert
    const alert: PerformanceAlert = {
      id: `${monitor.functionId}-${ruleId}-${Date.now()}`,
      functionId: monitor.functionId,
      rule: this.createAlertRule(ruleId, severity),
      severity,
      message,
      triggeredAt: new Date(),
      isActive: true,
      details: {
        metric: ruleId.split('-')[0],
        currentValue: 0, // Would be set based on actual metric
        threshold: 0,    // Would be set based on threshold
        duration: 0
      },
      actions: [],
      escalation: {
        level: 0,
        escalated: false
      }
    };
    
    // Add to active alerts
    if (!this.activeAlerts.has(monitor.functionId)) {
      this.activeAlerts.set(monitor.functionId, []);
    }
    this.activeAlerts.get(monitor.functionId)!.push(alert);
    
    // Add to monitor
    monitor.alerts.push(alert);
    
    // Emit event
    this.emitPerformanceEvent(
      PerformanceEventType.ALERT_TRIGGERED,
      monitor.functionId,
      { alert },
      severity === AlertSeverity.CRITICAL ? 'critical' : 'warning'
    );
    
    // Send notifications
    this.sendAlertNotifications(alert, monitor.configuration.alerting);
  }

  private findActiveAlert(functionId: string, ruleId: string): PerformanceAlert | undefined {
    const alerts = this.activeAlerts.get(functionId) || [];
    return alerts.find(alert => alert.isActive && alert.rule.id === ruleId);
  }

  private sendAlertNotifications(alert: PerformanceAlert, alertingConfig: any): void {
    // Implementation would send notifications through configured channels
    console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
  }

  private captureHistoricalMetrics(): void {
    this.monitors.forEach((monitor, functionId) => {
      if (!monitor.isEnabled) return;
      
      const snapshot = JSON.parse(JSON.stringify(monitor.metrics));
      snapshot.timestamp = new Date();
      
      if (!this.metricsHistory.has(functionId)) {
        this.metricsHistory.set(functionId, []);
      }
      
      const history = this.metricsHistory.get(functionId)!;
      history.push(snapshot);
      
      // Keep only last 168 data points (1 week of hourly data)
      if (history.length > 168) {
        history.splice(0, history.length - 168);
      }
    });
  }

  private checkStaleMonitors(): void {
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    
    this.monitors.forEach((monitor, functionId) => {
      if (now - monitor.lastUpdate.getTime() > staleThreshold) {
        console.warn(`[PerformanceMonitoringManager] Stale monitor detected for function ${functionId}`);
        // Could automatically disable or alert
      }
    });
  }

  private updateTrendData(): void {
    this.monitors.forEach((monitor, functionId) => {
      const history = this.metricsHistory.get(functionId) || [];
      if (history.length < 2) return;
      
      const current = history[history.length - 1];
      const previous = history[history.length - 2];
      
      monitor.metrics.historical.trends = {
        latency: this.calculateTrend(
          current.execution.latency.average,
          previous.execution.latency.average,
          history.map(h => ({ timestamp: h.timestamp, value: h.execution.latency.average }))
        ),
        throughput: this.calculateTrend(
          current.execution.throughput.requestsPerSecond,
          previous.execution.throughput.requestsPerSecond,
          history.map(h => ({ timestamp: h.timestamp, value: h.execution.throughput.requestsPerSecond }))
        ),
        errorRate: this.calculateTrend(
          current.execution.errors.rate,
          previous.execution.errors.rate,
          history.map(h => ({ timestamp: h.timestamp, value: h.execution.errors.rate }))
        ),
        quality: this.calculateTrend(
          current.quality.outputQuality.average,
          previous.quality.outputQuality.average,
          history.map(h => ({ timestamp: h.timestamp, value: h.quality.outputQuality.average }))
        ),
        costs: this.calculateTrend(
          current.business.costs.perRequest,
          previous.business.costs.perRequest,
          history.map(h => ({ timestamp: h.timestamp, value: h.business.costs.perRequest }))
        )
      };
    });
  }

  private processAlertEscalations(): void {
    this.activeAlerts.forEach((alerts, functionId) => {
      alerts.filter(alert => alert.isActive).forEach(alert => {
        if (!alert.escalation.escalated && 
            alert.escalation.nextEscalation && 
            new Date() > alert.escalation.nextEscalation) {
          
          this.escalateAlert(alert);
        }
      });
    });
  }

  private escalateAlert(alert: PerformanceAlert): void {
    alert.escalation.level++;
    alert.escalation.escalated = true;
    
    this.emitPerformanceEvent(
      PerformanceEventType.ALERT_TRIGGERED,
      alert.functionId,
      { alert, escalated: true },
      'critical'
    );
    
    console.log(`[ESCALATION] Alert ${alert.id} escalated to level ${alert.escalation.level}`);
  }

  // Helper methods for estimation and calculation
  private estimateCPUUsage(execution: FunctionExecution): number {
    // Simple estimation based on execution duration and complexity
    const baseCPU = 10; // base CPU time in milliseconds
    const durationFactor = (execution.duration || 1000) / 1000;
    const complexityFactor = execution.input ? Math.log(execution.input.length + 1) : 1;
    
    return baseCPU * durationFactor * complexityFactor;
  }

  private estimateMemoryUsage(execution: FunctionExecution): number {
    // Simple estimation based on input/output size
    const baseMemory = 1024 * 1024; // 1MB base
    const inputSize = execution.input?.length || 0;
    const outputSize = execution.output?.length || 0;
    
    return baseMemory + (inputSize * 2) + (outputSize * 1.5);
  }

  private estimateExecutionCost(execution: FunctionExecution): number {
    // Simple cost estimation
    const baseCost = 0.001; // $0.001 per execution
    const durationFactor = (execution.duration || 1000) / 1000 / 10; // per 10 seconds
    const tokenCost = ((execution.input?.length || 0) + (execution.output?.length || 0)) * 0.000001;
    
    return baseCost + durationFactor + tokenCost;
  }

  private estimateTimeSaved(execution: FunctionExecution): number {
    // Estimate time saved based on task type and quality
    const baseTimeSaved = 300; // 5 minutes base
    const qualityFactor = execution.confidence || 0.8;
    
    return baseTimeSaved * qualityFactor;
  }

  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('rate limit')) return 'rate_limit';
    if (error.includes('validation')) return 'validation';
    if (error.includes('network')) return 'network';
    return 'unknown';
  }

  private calculateVariance(distribution: Record<string, number>): number {
    const values = Object.keys(distribution).map(k => parseFloat(k));
    const weights = Object.values(distribution);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    if (totalWeight === 0) return 0;
    
    // Calculate weighted mean
    const mean = values.reduce((sum, val, i) => sum + (val * weights[i]), 0) / totalWeight;
    
    // Calculate weighted variance
    const variance = values.reduce((sum, val, i) => 
      sum + (weights[i] * Math.pow(val - mean, 2)), 0
    ) / totalWeight;
    
    return variance;
  }

  private calculateHourlyCost(totalCost: number): number {
    // Simple hourly cost calculation (would need more sophisticated logic)
    return totalCost; // Placeholder
  }

  private calculateTrend(current: number, previous: number, dataPoints: TimeSeriesPoint[]): TrendData {
    const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    
    let direction: 'improving' | 'stable' | 'degrading' = 'stable';
    if (Math.abs(change) > 5) { // 5% threshold
      direction = change > 0 ? 'degrading' : 'improving'; // Assuming lower is better for most metrics
    }
    
    return {
      current,
      previous,
      change,
      direction,
      dataPoints: dataPoints.slice(-50) // Keep last 50 points
    };
  }

  private parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/^(\d+)([smhd])$/);
    if (!match) return Date.now() - 24 * 60 * 60 * 1000; // Default 24h
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    return Date.now() - (value * multipliers[unit as keyof typeof multipliers]);
  }

  private assessCurrentStatus(monitor: PerformanceMonitor): string {
    const activeAlerts = monitor.alerts.filter(a => a.isActive);
    const criticalAlerts = activeAlerts.filter(a => a.severity === AlertSeverity.CRITICAL);
    
    if (criticalAlerts.length > 0) return 'critical';
    if (activeAlerts.filter(a => a.severity === AlertSeverity.ERROR).length > 0) return 'error';
    if (activeAlerts.filter(a => a.severity === AlertSeverity.WARNING).length > 0) return 'warning';
    return 'healthy';
  }

  private generateSummary(current: PerformanceMetrics, historical: PerformanceMetrics[]): any {
    return {
      totalRequests: current.execution.totalRequests,
      successRate: current.execution.totalRequests > 0 
        ? (current.execution.successfulRequests / current.execution.totalRequests) * 100 
        : 100,
      averageLatency: current.execution.latency.average,
      averageQuality: current.quality.outputQuality.average,
      totalCost: current.business.costs.total
    };
  }

  private analyzeTrends(historical: PerformanceMetrics[]): any {
    if (historical.length < 2) return {};
    
    const latest = historical[historical.length - 1];
    const previous = historical[historical.length - 2];
    
    return {
      latencyTrend: this.calculateChangePercentage(
        latest.execution.latency.average,
        previous.execution.latency.average
      ),
      qualityTrend: this.calculateChangePercentage(
        latest.quality.outputQuality.average,
        previous.quality.outputQuality.average
      ),
      costTrend: this.calculateChangePercentage(
        latest.business.costs.perRequest,
        previous.business.costs.perRequest
      )
    };
  }

  private calculateChangePercentage(current: number, previous: number): number {
    return previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  }

  private generateRecommendations(monitor: PerformanceMonitor, historical: PerformanceMetrics[]): string[] {
    const recommendations: string[] = [];
    const metrics = monitor.metrics;
    
    // Latency recommendations
    if (metrics.execution.latency.p95 > 5000) { // 5 seconds
      recommendations.push('Consider optimizing function execution time - P95 latency is high');
    }
    
    // Quality recommendations
    if (metrics.quality.outputQuality.average < 0.7) {
      recommendations.push('Review function prompts and parameters - quality scores are below target');
    }
    
    // Cost recommendations
    if (metrics.business.costs.perRequest > 0.1) { // $0.10 per request
      recommendations.push('Consider cost optimization - per-request costs are high');
    }
    
    // Error rate recommendations
    if (metrics.execution.errors.rate > 5) { // 5%
      recommendations.push('Investigate error causes - error rate exceeds acceptable threshold');
    }
    
    return recommendations;
  }

  // Default configuration creators
  private createDefaultMonitoringConfig(): any {
    return {
      enabled: true,
      interval: 60000, // 1 minute
      retentionPeriod: '7d',
      trackCPU: true,
      trackMemory: true,
      trackLatency: true,
      trackThroughput: true,
      trackErrorRate: true,
      trackQuality: true,
      trackCosts: true,
      sampling: {
        enabled: false,
        rate: 1.0,
        strategy: 'random'
      }
    };
  }

  private createDefaultResourceLimits(): any {
    return {
      maxCPUUsage: 80,
      cpuTimeLimit: 30000,
      maxMemoryUsage: 512 * 1024 * 1024,
      memoryGrowthRate: 1024 * 1024,
      maxConcurrentExecutions: 10,
      maxQueueSize: 100,
      maxExecutionTime: 30000,
      maxQueueWaitTime: 5000,
      maxCostPerHour: 10.0,
      maxCostPerRequest: 0.10
    };
  }

  private createDefaultThresholds(): any {
    return {
      latency: {
        warning: 2000,
        critical: 5000,
        p95Target: 1500,
        p99Target: 3000
      },
      throughput: {
        warningMin: 0.1,
        criticalMin: 0.05,
        targetRPS: 1.0
      },
      errorRate: {
        warning: 2,
        critical: 5,
        maxAcceptable: 10
      },
      quality: {
        warning: 0.7,
        critical: 0.5,
        target: 0.85
      },
      resources: {
        cpuWarning: 70,
        cpuCritical: 90,
        memoryWarning: 80,
        memoryCritical: 95
      }
    };
  }

  private createDefaultAlertingConfig(): any {
    return {
      enabled: true,
      channels: [
        {
          id: 'console',
          type: 'log',
          enabled: true,
          configuration: {},
          priority: 'medium'
        }
      ],
      rules: [],
      escalation: {
        enabled: true,
        levels: []
      },
      rateLimiting: {
        enabled: true,
        maxAlertsPerHour: 10,
        cooldownPeriod: 300000
      }
    };
  }

  private createDefaultOptimizationConfig(): any {
    return {
      enabled: true,
      autoScaling: {
        enabled: false,
        minConcurrency: 1,
        maxConcurrency: 10,
        targetUtilization: 70,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 300000
      },
      loadBalancing: {
        enabled: false,
        strategy: 'round-robin',
        weights: {}
      },
      caching: {
        enabled: true,
        strategy: 'lru',
        maxSize: 100 * 1024 * 1024,
        ttl: 3600000
      },
      requestOptimization: {
        enabled: true,
        batching: false,
        compression: false,
        deduplication: true
      }
    };
  }

  private createEmptyMetrics(functionId: string): PerformanceMetrics {
    return {
      functionId,
      timestamp: new Date(),
      timeWindow: '1h',
      execution: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        latency: {
          average: 0,
          median: 0,
          p95: 0,
          p99: 0,
          min: 0,
          max: 0
        },
        throughput: {
          requestsPerSecond: 0,
          requestsPerMinute: 0,
          requestsPerHour: 0
        },
        errors: {
          rate: 0,
          count: 0,
          byType: {},
          lastError: undefined
        },
        queue: {
          currentSize: 0,
          maxSize: 0,
          averageWaitTime: 0,
          maxWaitTime: 0
        }
      },
      resources: {
        cpu: {
          usage: 0,
          time: 0,
          averagePerRequest: 0
        },
        memory: {
          used: 0,
          peak: 0,
          averagePerRequest: 0,
          growthRate: 0
        },
        concurrency: {
          active: 0,
          peak: 0,
          average: 0,
          utilization: 0
        },
        network: {
          bytesIn: 0,
          bytesOut: 0,
          requestSize: {
            average: 0,
            max: 0
          },
          responseSize: {
            average: 0,
            max: 0
          }
        }
      },
      quality: {
        outputQuality: {
          average: 0,
          median: 0,
          min: 0,
          max: 0,
          distribution: {}
        },
        userSatisfaction: {
          average: 0,
          ratingDistribution: {},
          feedbackCount: 0
        },
        accuracy: {
          score: 0,
          validationPassed: 0,
          validationFailed: 0,
          falsePositives: 0,
          falseNegatives: 0
        },
        consistency: {
          score: 1,
          variance: 0,
          outlierCount: 0
        }
      },
      business: {
        costs: {
          total: 0,
          perRequest: 0,
          perHour: 0,
          breakdown: {}
        },
        usage: {
          activeUsers: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          retentionRate: 0
        },
        value: {
          timesSaved: 0,
          improvementScore: 0,
          userProductivity: 0,
          automationRate: 0
        }
      },
      historical: {
        trends: {
          latency: { current: 0, previous: 0, change: 0, direction: 'stable', dataPoints: [] },
          throughput: { current: 0, previous: 0, change: 0, direction: 'stable', dataPoints: [] },
          errorRate: { current: 0, previous: 0, change: 0, direction: 'stable', dataPoints: [] },
          quality: { current: 0, previous: 0, change: 0, direction: 'stable', dataPoints: [] },
          costs: { current: 0, previous: 0, change: 0, direction: 'stable', dataPoints: [] }
        },
        patterns: {
          hourlyUsage: new Array(24).fill(0),
          dailyUsage: new Array(7).fill(0),
          monthlyUsage: new Array(12).fill(0)
        },
        benchmarks: {
          baselineLatency: 0,
          baselineQuality: 0,
          baselineCost: 0,
          lastBenchmarkUpdate: new Date()
        }
      }
    };
  }

  private createAlertRule(ruleId: string, severity: AlertSeverity): AlertRule {
    return {
      id: ruleId,
      name: ruleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      condition: {
        metric: ruleId.split('-')[0],
        operator: 'gt',
        value: 0,
        window: 60000,
        minDataPoints: 1
      },
      severity,
      enabled: true,
      channels: ['console'],
      cooldown: 300000,
      description: `Alert for ${ruleId}`
    };
  }

  private updateResourceUsage(functionId: string, usage: any): void {
    const monitor = this.monitors.get(functionId);
    if (monitor && monitor.isEnabled) {
      // Update real-time resource usage
      monitor.metrics.resources.cpu.usage = usage.cpu || 0;
      monitor.metrics.resources.memory.used = usage.memory || 0;
      monitor.metrics.resources.concurrency.active = usage.concurrency || 0;
    }
  }

  private emitPerformanceEvent(
    type: PerformanceEventType,
    functionId: string,
    data: any,
    severity: 'info' | 'warning' | 'error' | 'critical'
  ): void {
    const event: PerformanceEvent = {
      type,
      functionId,
      data,
      timestamp: new Date(),
      severity
    };

    globalEventBus.emit('performance-event', event, 'performance-monitor');
  }

  dispose(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
    
    this.isEnabled = false;
  }
}

// Export singleton instance
export const performanceMonitoringManager = new PerformanceMonitoringManager();