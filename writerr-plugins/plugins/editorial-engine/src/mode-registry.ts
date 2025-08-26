import { ModeDefinition, CompiledConstraint } from './types';
import { WritterrEventBus } from './event-bus';
import { RulesetCompiler } from './ruleset-compiler';

export class ModeRegistry {
  private modes: Map<string, ModeDefinition> = new Map();
  private compiler: RulesetCompiler;

  constructor(
    private eventBus: WritterrEventBus,
    private settings: any
  ) {
    this.compiler = new RulesetCompiler();
    this.loadPersistedModes();
  }

  async registerMode(mode: ModeDefinition): Promise<void> {
    // Validate mode definition
    const validation = await this.validateMode(mode);
    if (!validation.valid) {
      throw new Error(`Mode validation failed: ${validation.errors.join(', ')}`);
    }

    // Check for version migration if mode already exists
    if (this.modes.has(mode.id)) {
      const existingMode = this.modes.get(mode.id)!;
      mode = await this.migrateMode(mode, existingMode.version);
    }

    // Compile natural language rules if not already compiled
    if (!mode.constraints || mode.constraints.length === 0) {
      try {
        const compiled = await this.compiler.compileMode(mode);
        mode.constraints = compiled.constraints;
      } catch (error) {
        console.warn(`Failed to compile constraints for mode ${mode.id}:`, error);
        mode.constraints = [];
      }
    }

    // Store mode
    this.modes.set(mode.id, mode);
    
    // Emit registration event
    this.eventBus.emit('mode-registered', { mode });
    
    // Persist custom modes (skip default ones)
    if (!['proofreader', 'copy-editor', 'developmental-editor', 'creative-writing-assistant'].includes(mode.id)) {
      await this.persistModes();
    }
    
    console.log(`Registered mode: ${mode.name} (${mode.id})`);
  }

  getMode(id: string): ModeDefinition | undefined {
    return this.modes.get(id);
  }

  getAllModes(): ModeDefinition[] {
    return Array.from(this.modes.values());
  }

  getModesByCategory(category: string): ModeDefinition[] {
    return this.getAllModes().filter(mode => mode.metadata.category === category);
  }

  async updateMode(id: string, updates: Partial<ModeDefinition>): Promise<void> {
    const existingMode = this.modes.get(id);
    if (!existingMode) {
      throw new Error(`Mode not found: ${id}`);
    }

    const updatedMode = { ...existingMode, ...updates };
    
    // Re-validate and recompile if rules changed
    if (updates.naturalLanguageRules) {
      const compiled = await this.compiler.compileMode(updatedMode);
      updatedMode.constraints = compiled.constraints;
    }

    this.modes.set(id, updatedMode);
    this.eventBus.emit('mode-updated', { mode: updatedMode });
  }

  async removeMode(id: string): Promise<void> {
    if (this.modes.has(id)) {
      const mode = this.modes.get(id)!;
      
      // Prevent removal of default modes
      if (['proofreader', 'copy-editor', 'developmental-editor', 'creative-writing-assistant'].includes(id)) {
        throw new Error(`Cannot remove default mode: ${id}`);
      }
      
      this.modes.delete(id);
      this.eventBus.emit('mode-removed', { modeId: id, mode });
      
      // Update persistence
      await this.persistModes();
      
      console.log(`Removed mode: ${mode.name} (${id})`);
    }
  }

  private async validateMode(mode: ModeDefinition): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Required fields
    if (!mode.id) errors.push('Mode ID is required');
    if (!mode.name) errors.push('Mode name is required');
    if (!mode.description) errors.push('Mode description is required');
    if (!mode.version) errors.push('Mode version is required');

    // Check for duplicate ID
    if (mode.id && this.modes.has(mode.id)) {
      errors.push(`Mode ID already exists: ${mode.id}`);
    }

    // Validate natural language rules
    if (!mode.naturalLanguageRules) {
      errors.push('Natural language rules are required');
    } else {
      if (!mode.naturalLanguageRules.allowed || mode.naturalLanguageRules.allowed.length === 0) {
        errors.push('At least one allowed rule is required');
      }
      
      // Check for empty rules
      const allRules = [
        ...mode.naturalLanguageRules.allowed,
        ...mode.naturalLanguageRules.forbidden,
        ...mode.naturalLanguageRules.focus,
        ...mode.naturalLanguageRules.boundaries
      ];
      
      for (const rule of allRules) {
        if (!rule.trim()) {
          errors.push('Rules cannot be empty');
          break;
        }
      }
    }

    // Validate metadata
    if (!mode.metadata) {
      errors.push('Mode metadata is required');
    } else {
      if (!mode.metadata.category) {
        errors.push('Mode category is required');
      }
      if (!mode.metadata.difficulty) {
        errors.push('Mode difficulty is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Export modes for sharing/backup
  exportModes(): string {
    const modesArray = Array.from(this.modes.values());
    return JSON.stringify(modesArray, null, 2);
  }

  // Import modes from JSON
  async importModes(modesJson: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const modes: ModeDefinition[] = JSON.parse(modesJson);
      
      if (!Array.isArray(modes)) {
        throw new Error('Invalid format: expected array of modes');
      }

      for (const mode of modes) {
        try {
          await this.registerMode(mode);
          imported++;
        } catch (error) {
          errors.push(`Failed to import mode ${mode.id || 'unknown'}: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`JSON parsing failed: ${error.message}`);
    }

    return { imported, errors };
  }

  // Mode persistence for Obsidian restarts
  private async loadPersistedModes(): Promise<void> {
    if (this.settings?.app?.vault) {
      try {
        const data = await this.settings.app.vault.adapter.read('.obsidian/plugins/editorial-engine/modes.json');
        if (data) {
          const modes: ModeDefinition[] = JSON.parse(data);
          for (const mode of modes) {
            // Skip if mode is already registered (e.g., default modes)
            if (!this.modes.has(mode.id)) {
              await this.registerMode(mode);
            }
          }
          console.log(`Loaded ${modes.length} persisted modes`);
        }
      } catch (error) {
        // File doesn't exist or other error - this is normal on first run
        console.log('No persisted modes found or failed to load');
      }
    }
  }

  private async persistModes(): Promise<void> {
    if (this.settings?.app?.vault) {
      try {
        const customModes = Array.from(this.modes.values()).filter(mode => 
          !['proofreader', 'copy-editor', 'developmental-editor', 'creative-writing-assistant'].includes(mode.id)
        );
        
        const data = JSON.stringify(customModes, null, 2);
        await this.settings.app.vault.adapter.write('.obsidian/plugins/editorial-engine/modes.json', data);
        console.log(`Persisted ${customModes.length} custom modes`);
      } catch (error) {
        console.error('Failed to persist modes:', error);
      }
    }
  }

  // Version migration support
  private async migrateMode(mode: ModeDefinition, targetVersion: string): Promise<ModeDefinition> {
    const currentVersion = mode.version || '1.0.0';
    
    if (this.compareVersions(currentVersion, targetVersion) >= 0) {
      return mode; // Already up to date
    }

    // Create migration path
    const migratedMode = { ...mode };
    
    // Example migration from 1.0.0 to 1.1.0
    if (currentVersion === '1.0.0' && this.compareVersions(targetVersion, '1.1.0') >= 0) {
      // Add new fields that were introduced in 1.1.0
      if (!migratedMode.metadata.migrationHistory) {
        migratedMode.metadata.migrationHistory = [
          {
            from: currentVersion,
            to: '1.1.0',
            timestamp: Date.now(),
            changes: ['Added migration history tracking']
          }
        ];
      }
      migratedMode.version = '1.1.0';
    }

    this.eventBus.emit('mode-migrated', { 
      mode: migratedMode, 
      fromVersion: currentVersion, 
      toVersion: targetVersion 
    });

    return migratedMode;
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    
    return 0;
  }
}