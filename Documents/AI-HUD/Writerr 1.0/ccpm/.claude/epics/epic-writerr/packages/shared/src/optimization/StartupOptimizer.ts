/**
 * Startup Optimizer
 * Optimizes plugin startup time with progressive initialization and dependency management
 */

import { globalEventBus } from '../event-bus';
import { performanceProfiler, PerformanceCategory } from './PerformanceProfiler';
import { StartupPhase } from './types';

export interface StartupConfig {
  targetStartupTime: number;        // Target total startup time (3000ms)
  maxConcurrentInits: number;       // Max concurrent initializations
  progressiveLoading: boolean;       // Enable progressive loading
  criticalFirstMode: boolean;       // Initialize critical plugins first
  timeoutMode: 'aggressive' | 'conservative'; // Timeout handling mode
}

export interface StartupMetrics {
  totalTime: number;
  phases: Array<{
    name: string;
    duration: number;
    success: boolean;
    errors?: string[];
  }>;
  concurrency: {
    peak: number;
    average: number;
  };
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

/**
 * Manages and optimizes plugin startup sequence
 */
export class StartupOptimizer {
  private static instance: StartupOptimizer;
  private config: StartupConfig;
  private phases: Map<string, StartupPhase> = new Map();
  private activeInitializations: Set<string> = new Set();
  private completedPhases: Set<string> = new Set();
  private startupPromises: Map<string, Promise<void>> = new Map();
  private startupStartTime: number = 0;
  private progressCallback?: (phase: string, progress: number) => void;

  private constructor() {
    this.config = {
      targetStartupTime: 3000,
      maxConcurrentInits: 3,
      progressiveLoading: true,
      criticalFirstMode: true,
      timeoutMode: 'conservative'
    };
  }

  public static getInstance(): StartupOptimizer {
    if (!StartupOptimizer.instance) {
      StartupOptimizer.instance = new StartupOptimizer();
    }
    return StartupOptimizer.instance;
  }

  /**
   * Configure startup optimization
   */
  configure(config: Partial<StartupConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Register a startup phase
   */
  registerPhase(phase: StartupPhase): void {
    this.phases.set(phase.name, phase);
  }

  /**
   * Begin optimized startup sequence
   */
  async startOptimizedStartup(progressCallback?: (phase: string, progress: number) => void): Promise<void> {
    this.progressCallback = progressCallback;
    this.startupStartTime = performance.now();

    return performanceProfiler.measureAsync(
      'startup-total',
      PerformanceCategory.STARTUP,
      () => this.executeStartupSequence(),
      { optimized: true }
    );
  }

  /**
   * Execute startup phases with optimization
   */
  private async executeStartupSequence(): Promise<void> {
    const phases = Array.from(this.phases.values());
    
    // Sort phases by priority (critical first if enabled)
    const sortedPhases = this.config.criticalFirstMode 
      ? phases.sort((a, b) => (b.critical ? 1 : 0) - (a.critical ? 1 : 0))
      : phases;

    // Group phases by dependencies
    const phaseGroups = this.groupPhasesByDependencies(sortedPhases);
    
    let totalPhases = phases.length;
    let completedCount = 0;

    try {
      // Execute phases in dependency order
      for (const group of phaseGroups) {
        const groupPromises = group.map(phase => 
          this.executePhase(phase).then(() => {
            completedCount++;
            this.reportProgress(phase.name, (completedCount / totalPhases) * 100);
          })
        );

        // Control concurrency
        await this.manageConcurrentExecution(groupPromises);
      }

      const totalTime = performance.now() - this.startupStartTime;
      
      globalEventBus.emit('startup-completed', {
        totalTime,
        phasesCompleted: completedCount,
        success: true
      });

      // Check if we met the target time
      if (totalTime > this.config.targetStartupTime) {
        console.warn(`[StartupOptimizer] Startup time ${totalTime.toFixed(0)}ms exceeded target ${this.config.targetStartupTime}ms`);
        this.generateOptimizationRecommendations(totalTime);
      }

    } catch (error) {
      const totalTime = performance.now() - this.startupStartTime;
      
      globalEventBus.emit('startup-failed', {
        totalTime,
        phasesCompleted: completedCount,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  /**
   * Execute a single startup phase
   */
  private async executePhase(phase: StartupPhase): Promise<void> {
    const phaseId = `startup-phase-${phase.name}`;
    
    return performanceProfiler.measureAsync(
      phaseId,
      PerformanceCategory.STARTUP,
      async () => {
        this.activeInitializations.add(phase.name);

        try {
          // Check dependencies
          await this.waitForDependencies(phase.dependencies);

          // Execute phase with timeout
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Phase ${phase.name} timed out`)), phase.timeout)
          );

          const phasePromise = this.executePhaseLogic(phase);
          
          await Promise.race([phasePromise, timeoutPromise]);
          
          this.completedPhases.add(phase.name);
          
          globalEventBus.emit('startup-phase-completed', {
            phase: phase.name,
            duration: performance.now() - phase.startTime,
            success: true
          });

        } catch (error) {
          globalEventBus.emit('startup-phase-failed', {
            phase: phase.name,
            duration: performance.now() - phase.startTime,
            error: error instanceof Error ? error.message : String(error)
          });
          
          // Decide whether to continue or abort based on criticality
          if (phase.critical) {
            throw error;
          } else {
            console.warn(`[StartupOptimizer] Non-critical phase ${phase.name} failed:`, error);
          }
        } finally {
          this.activeInitializations.delete(phase.name);
        }
      },
      {
        phase: phase.name,
        critical: phase.critical,
        dependencies: phase.dependencies
      }
    );
  }

  /**
   * Execute the actual phase logic (to be implemented by plugins)
   */
  private async executePhaseLogic(phase: StartupPhase): Promise<void> {
    // This is a placeholder - actual phase logic would be provided by the plugins
    // For now, we'll simulate initialization
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
  }

  /**
   * Wait for phase dependencies to complete
   */
  private async waitForDependencies(dependencies: string[]): Promise<void> {
    if (!dependencies.length) return;

    const dependencyPromises = dependencies.map(dep => {
      if (this.completedPhases.has(dep)) {
        return Promise.resolve();
      }

      const promise = this.startupPromises.get(dep);
      if (promise) {
        return promise;
      }

      return new Promise<void>((resolve, reject) => {
        const checkDependency = () => {
          if (this.completedPhases.has(dep)) {
            resolve();
          } else {
            setTimeout(checkDependency, 10);
          }
        };
        
        // Timeout for dependency waiting
        setTimeout(() => {
          reject(new Error(`Dependency ${dep} failed to complete within timeout`));
        }, 5000);
        
        checkDependency();
      });
    });

    await Promise.all(dependencyPromises);
  }

  /**
   * Manage concurrent execution of startup phases
   */
  private async manageConcurrentExecution(promises: Promise<void>[]): Promise<void> {
    if (promises.length <= this.config.maxConcurrentInits) {
      // Execute all concurrently if under limit
      await Promise.all(promises);
    } else {
      // Execute in batches to limit concurrency
      const batches = this.chunkArray(promises, this.config.maxConcurrentInits);
      
      for (const batch of batches) {
        await Promise.all(batch);
      }
    }
  }

  /**
   * Group phases by their dependencies to determine execution order
   */
  private groupPhasesByDependencies(phases: StartupPhase[]): StartupPhase[][] {
    const groups: StartupPhase[][] = [];
    const remaining = new Set(phases);
    const completed = new Set<string>();

    while (remaining.size > 0) {
      const currentGroup: StartupPhase[] = [];
      
      // Find phases that can execute now (dependencies satisfied)
      for (const phase of remaining) {
        const canExecute = phase.dependencies.every(dep => completed.has(dep));
        
        if (canExecute) {
          currentGroup.push(phase);
        }
      }

      if (currentGroup.length === 0) {
        // Circular dependency or missing dependency
        const remainingPhases = Array.from(remaining).map(p => p.name).join(', ');
        throw new Error(`Circular dependency detected in phases: ${remainingPhases}`);
      }

      groups.push(currentGroup);
      
      // Remove from remaining and add to completed
      currentGroup.forEach(phase => {
        remaining.delete(phase);
        completed.add(phase.name);
      });
    }

    return groups;
  }

  /**
   * Generate optimization recommendations based on startup performance
   */
  private generateOptimizationRecommendations(totalTime: number): void {
    const metrics = performanceProfiler.getMeasurementsByCategory(PerformanceCategory.STARTUP);
    const slowPhases = metrics
      .filter(m => m.duration && m.duration > 500)
      .sort((a, b) => (b.duration! - a.duration!));

    const recommendations: string[] = [];

    if (slowPhases.length > 0) {
      recommendations.push(`Optimize slow phases: ${slowPhases.map(p => p.name).join(', ')}`);
    }

    if (totalTime > this.config.targetStartupTime * 1.5) {
      recommendations.push('Consider lazy loading non-essential features');
      recommendations.push('Implement progressive initialization');
    }

    if (this.activeInitializations.size > this.config.maxConcurrentInits) {
      recommendations.push('Increase maxConcurrentInits or reduce concurrent operations');
    }

    globalEventBus.emit('startup-optimization-recommendations', {
      totalTime,
      targetTime: this.config.targetStartupTime,
      recommendations
    });
  }

  /**
   * Get startup metrics
   */
  getStartupMetrics(): StartupMetrics {
    const startupMeasurements = performanceProfiler.getMeasurementsByCategory(PerformanceCategory.STARTUP);
    
    return {
      totalTime: startupMeasurements.find(m => m.name === 'startup-total')?.duration || 0,
      phases: startupMeasurements
        .filter(m => m.name.startsWith('startup-phase-'))
        .map(m => ({
          name: m.name.replace('startup-phase-', ''),
          duration: m.duration || 0,
          success: m.metadata?.success !== false,
          errors: m.metadata?.error ? [m.metadata.error] : undefined
        })),
      concurrency: {
        peak: Math.max(...Array.from(this.phases.values()).map(p => p.dependencies.length + 1)),
        average: 0 // Would need to track over time
      },
      resourceUsage: {
        memory: (performance as any).memory?.usedJSHeapSize || 0,
        cpu: 0 // Would need CPU monitoring
      }
    };
  }

  /**
   * Reset startup optimizer state
   */
  reset(): void {
    this.phases.clear();
    this.activeInitializations.clear();
    this.completedPhases.clear();
    this.startupPromises.clear();
  }

  /**
   * Enable progressive loading mode
   */
  enableProgressiveLoading(): void {
    this.config.progressiveLoading = true;
    
    // Set up intersection observer for lazy loading
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Trigger loading of components that come into view
            const componentId = entry.target.getAttribute('data-component-id');
            if (componentId) {
              this.loadComponentProgressively(componentId);
            }
          }
        });
      });

      // Observer would be set up to watch for lazy-loadable components
    }
  }

  /**
   * Load a component progressively (lazy loading)
   */
  private async loadComponentProgressively(componentId: string): Promise<void> {
    return performanceProfiler.measureAsync(
      `progressive-load-${componentId}`,
      PerformanceCategory.STARTUP,
      async () => {
        // Component loading logic would go here
        // For now, simulate loading
        await new Promise(resolve => setTimeout(resolve, 100));
      },
      { progressive: true, componentId }
    );
  }

  /**
   * Report startup progress
   */
  private reportProgress(phase: string, progress: number): void {
    if (this.progressCallback) {
      this.progressCallback(phase, progress);
    }
    
    globalEventBus.emit('startup-progress', {
      phase,
      progress,
      timestamp: Date.now()
    });
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
export const startupOptimizer = StartupOptimizer.getInstance();

// Convenience functions
export function registerStartupPhase(phase: StartupPhase): void {
  startupOptimizer.registerPhase(phase);
}

export function startOptimizedStartup(progressCallback?: (phase: string, progress: number) => void): Promise<void> {
  return startupOptimizer.startOptimizedStartup(progressCallback);
}

export function getStartupMetrics(): StartupMetrics {
  return startupOptimizer.getStartupMetrics();
}

export function configureStartup(config: Partial<StartupConfig>): void {
  startupOptimizer.configure(config);
}