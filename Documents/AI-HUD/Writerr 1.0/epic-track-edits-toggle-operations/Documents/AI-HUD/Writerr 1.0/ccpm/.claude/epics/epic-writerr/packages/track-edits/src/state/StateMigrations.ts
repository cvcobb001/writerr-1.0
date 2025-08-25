/**
 * @fileoverview State versioning and migration system
 */

import { StateMigration } from './types';
import { EventEmitter } from 'events';

export class StateMigrations extends EventEmitter {
  private migrations = new Map<string, StateMigration>();
  private currentVersion = 1;

  constructor() {
    super();
    this.registerDefaultMigrations();
  }

  /**
   * Register migration
   */
  registerMigration(migration: StateMigration): void {
    const key = `${migration.from}-${migration.to}`;
    this.migrations.set(key, migration);
    
    // Update current version if this is the highest
    if (migration.to > this.currentVersion) {
      this.currentVersion = migration.to;
    }
  }

  /**
   * Migrate state from one version to another
   */
  async migrateState(state: any, fromVersion: number, toVersion?: number): Promise<any> {
    const targetVersion = toVersion || this.currentVersion;
    
    if (fromVersion === targetVersion) {
      return state; // No migration needed
    }
    
    if (fromVersion > targetVersion) {
      throw new Error(`Cannot migrate backwards from version ${fromVersion} to ${targetVersion}`);
    }

    let currentState = state;
    let currentVersion = fromVersion;

    // Find migration path
    const migrationPath = this.findMigrationPath(fromVersion, targetVersion);
    if (!migrationPath) {
      throw new Error(`No migration path found from version ${fromVersion} to ${targetVersion}`);
    }

    // Execute migrations in sequence
    for (const step of migrationPath) {
      const migration = this.migrations.get(`${step.from}-${step.to}`);
      if (!migration) {
        throw new Error(`Migration not found: ${step.from} -> ${step.to}`);
      }

      try {
        this.emit('migrationStarted', { 
          from: step.from, 
          to: step.to, 
          description: migration.description 
        });

        currentState = await migration.migrateFn(currentState);
        currentVersion = step.to;

        this.emit('migrationCompleted', { 
          from: step.from, 
          to: step.to, 
          success: true 
        });

      } catch (error) {
        this.emit('migrationFailed', { 
          from: step.from, 
          to: step.to, 
          error: error.message 
        });

        // Attempt rollback if available
        if (migration.rollbackFn) {
          try {
            currentState = await migration.rollbackFn(currentState);
            this.emit('rollbackCompleted', { from: step.from, to: step.to });
          } catch (rollbackError) {
            this.emit('rollbackFailed', { 
              from: step.from, 
              to: step.to, 
              error: rollbackError.message 
            });
          }
        }

        throw new Error(`Migration failed from ${step.from} to ${step.to}: ${error.message}`);
      }
    }

    return currentState;
  }

  /**
   * Check if state needs migration
   */
  needsMigration(stateVersion: number): boolean {
    return stateVersion < this.currentVersion;
  }

  /**
   * Get current version
   */
  getCurrentVersion(): number {
    return this.currentVersion;
  }

  /**
   * Validate state version
   */
  validateStateVersion(state: any): number {
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid state object');
    }

    // Check for version in metadata
    const version = state.version || state.metadata?.version || state.__version__ || 1;
    
    if (typeof version !== 'number' || version < 1) {
      throw new Error('Invalid state version');
    }

    return version;
  }

  /**
   * Create state backup before migration
   */
  async createMigrationBackup(state: any, version: number): Promise<StateBackup> {
    const backup: StateBackup = {
      id: this.generateBackupId(),
      timestamp: Date.now(),
      version,
      originalState: JSON.parse(JSON.stringify(state)), // Deep clone
      checksum: this.calculateChecksum(JSON.stringify(state)),
      description: `Pre-migration backup from version ${version}`
    };

    return backup;
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backup: StateBackup): Promise<any> {
    // Validate backup integrity
    const currentChecksum = this.calculateChecksum(JSON.stringify(backup.originalState));
    if (currentChecksum !== backup.checksum) {
      throw new Error('Backup integrity validation failed');
    }

    return backup.originalState;
  }

  /**
   * Get available migrations
   */
  getAvailableMigrations(): Array<{ from: number; to: number; description: string; breaking: boolean }> {
    const migrations: Array<{ from: number; to: number; description: string; breaking: boolean }> = [];
    
    for (const migration of this.migrations.values()) {
      migrations.push({
        from: migration.from,
        to: migration.to,
        description: migration.description,
        breaking: migration.breaking
      });
    }

    return migrations.sort((a, b) => a.from - b.from);
  }

  // Private methods

  private registerDefaultMigrations(): void {
    // Migration from v1 to v2: Add session metadata
    this.registerMigration({
      from: 1,
      to: 2,
      description: 'Add session metadata and analytics tracking',
      breaking: false,
      migrateFn: async (state: any) => {
        if (!state.sessions) {
          state.sessions = new Map();
          return state;
        }

        // Convert existing sessions to include metadata
        const sessions = state.sessions instanceof Map ? state.sessions : new Map(Object.entries(state.sessions || {}));
        
        for (const [sessionId, session] of sessions) {
          if (!session.metadata) {
            session.metadata = {
              userId: undefined,
              userAgent: undefined,
              platform: undefined,
              startLocation: undefined,
              totalKeystrokes: 0,
              totalMouseClicks: 0,
              focusTime: 0,
              idleTime: 0,
              workingTime: 0,
              breakTime: 0,
              efficiency: 1.0,
              tags: []
            };
          }
        }

        state.sessions = sessions;
        state.version = 2;
        return state;
      },
      rollbackFn: async (state: any) => {
        // Remove metadata from sessions
        const sessions = state.sessions instanceof Map ? state.sessions : new Map(Object.entries(state.sessions || {}));
        
        for (const [sessionId, session] of sessions) {
          delete session.metadata;
        }

        state.sessions = sessions;
        state.version = 1;
        return state;
      }
    });

    // Migration from v2 to v3: Add compression and memory optimization
    this.registerMigration({
      from: 2,
      to: 3,
      description: 'Add compression and memory optimization features',
      breaking: false,
      migrateFn: async (state: any) => {
        // Add compression metadata
        if (!state.metadata) {
          state.metadata = {};
        }

        state.metadata.compressionLevel = 0;
        state.metadata.compressionEnabled = false;
        state.metadata.memoryOptimized = false;

        // Add snapshot compression flags
        if (state.snapshots) {
          for (const snapshot of state.snapshots) {
            if (!snapshot.hasOwnProperty('compressed')) {
              snapshot.compressed = false;
            }
          }
        }

        state.version = 3;
        return state;
      },
      rollbackFn: async (state: any) => {
        // Remove compression metadata
        if (state.metadata) {
          delete state.metadata.compressionLevel;
          delete state.metadata.compressionEnabled;
          delete state.metadata.memoryOptimized;
        }

        // Remove snapshot compression flags
        if (state.snapshots) {
          for (const snapshot of state.snapshots) {
            delete snapshot.compressed;
          }
        }

        state.version = 2;
        return state;
      }
    });

    // Migration from v3 to v4: Add audit trail and security features
    this.registerMigration({
      from: 3,
      to: 4,
      description: 'Add comprehensive audit trail and security features',
      breaking: false,
      migrateFn: async (state: any) => {
        // Add audit log structure
        if (!state.auditLog) {
          state.auditLog = [];
        }

        // Add security metadata
        if (!state.security) {
          state.security = {
            encryptionEnabled: false,
            integrityCheckEnabled: true,
            accessControlEnabled: false,
            permissions: {
              read: ['*'],
              write: ['*'],
              delete: ['admin']
            }
          };
        }

        // Add user tracking to changes
        if (state.changes) {
          const changes = state.changes instanceof Map ? state.changes : new Map(Object.entries(state.changes || {}));
          
          for (const [changeId, change] of changes) {
            if (!change.userId) {
              change.userId = 'unknown';
            }
            if (!change.auditTrail) {
              change.auditTrail = [];
            }
          }

          state.changes = changes;
        }

        state.version = 4;
        return state;
      },
      rollbackFn: async (state: any) => {
        // Remove audit log
        delete state.auditLog;

        // Remove security metadata
        delete state.security;

        // Remove user tracking from changes
        if (state.changes) {
          const changes = state.changes instanceof Map ? state.changes : new Map(Object.entries(state.changes || {}));
          
          for (const [changeId, change] of changes) {
            delete change.userId;
            delete change.auditTrail;
          }

          state.changes = changes;
        }

        state.version = 3;
        return state;
      }
    });

    // Migration from v4 to v5: Add performance monitoring and analytics
    this.registerMigration({
      from: 4,
      to: 5,
      description: 'Add performance monitoring and advanced analytics',
      breaking: false,
      migrateFn: async (state: any) => {
        // Add performance metrics
        if (!state.performance) {
          state.performance = {
            metrics: {
              avgProcessingTime: 0,
              peakMemoryUsage: 0,
              cacheHitRate: 1.0,
              errorRate: 0
            },
            monitoring: {
              enabled: true,
              interval: 60000,
              retentionDays: 30
            }
          };
        }

        // Add analytics structure
        if (!state.analytics) {
          state.analytics = {
            sessionMetrics: {},
            changeMetrics: {},
            userBehavior: {},
            systemHealth: {}
          };
        }

        state.version = 5;
        return state;
      },
      rollbackFn: async (state: any) => {
        // Remove performance monitoring
        delete state.performance;

        // Remove analytics
        delete state.analytics;

        state.version = 4;
        return state;
      }
    });
  }

  private findMigrationPath(fromVersion: number, toVersion: number): Array<{ from: number; to: number }> | null {
    const path: Array<{ from: number; to: number }> = [];
    let currentVersion = fromVersion;

    while (currentVersion < toVersion) {
      let nextVersion: number | null = null;

      // Find the next available migration step
      for (const migration of this.migrations.values()) {
        if (migration.from === currentVersion && migration.to <= toVersion) {
          if (nextVersion === null || migration.to > nextVersion) {
            nextVersion = migration.to;
          }
        }
      }

      if (nextVersion === null) {
        return null; // No path found
      }

      path.push({ from: currentVersion, to: nextVersion });
      currentVersion = nextVersion;
    }

    return path;
  }

  private calculateChecksum(data: string): string {
    let hash = 0;
    if (data.length === 0) return hash.toString();

    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(36);
  }

  private generateBackupId(): string {
    return `migration_backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface StateBackup {
  id: string;
  timestamp: number;
  version: number;
  originalState: any;
  checksum: string;
  description: string;
}