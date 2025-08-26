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
  }

  async registerMode(mode: ModeDefinition): Promise<void> {
    // Validate mode definition
    const validation = await this.validateMode(mode);
    if (!validation.valid) {
      throw new Error(`Mode validation failed: ${validation.errors.join(', ')}`);
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

  removeMode(id: string): void {
    if (this.modes.has(id)) {
      const mode = this.modes.get(id)!;
      this.modes.delete(id);
      this.eventBus.emit('mode-removed', { modeId: id, mode });
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
}