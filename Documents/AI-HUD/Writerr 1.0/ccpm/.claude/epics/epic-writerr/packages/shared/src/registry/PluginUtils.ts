/**
 * Plugin Utilities
 * Helper functions for common plugin registration and management tasks
 */

import {
  PluginCapability,
  PluginCapabilityCategory,
  PluginMetadata,
  PluginDependency,
  PluginStatus,
  ApiExposure,
  ApiMethod,
  ApiParameter
} from './types';

export class PluginUtils {
  /**
   * Create a plugin metadata object with defaults
   */
  static createPluginMetadata(config: {
    id: string;
    name: string;
    version: string;
    author?: string;
    description?: string;
    minObsidianVersion?: string;
    maxObsidianVersion?: string;
    dependencies?: PluginDependency[];
  }): PluginMetadata {
    return {
      status: PluginStatus.UNLOADED,
      dependencies: [],
      ...config
    };
  }

  /**
   * Create a plugin capability with defaults
   */
  static createCapability(config: {
    id: string;
    name: string;
    version: string;
    category: PluginCapabilityCategory;
    description?: string;
    dependencies?: string[];
    apis?: ApiExposure[];
  }): PluginCapability {
    return {
      ...config
    };
  }

  /**
   * Create an API exposure definition
   */
  static createApiExposure(config: {
    name: string;
    methods: {
      name: string;
      parameters?: Array<{name: string, type: string, required?: boolean, description?: string}>;
      returnType?: string;
      description?: string;
    }[];
    events?: Array<{name: string, payload?: Record<string, any>, description?: string}>;
  }): ApiExposure {
    const methods: ApiMethod[] = config.methods.map(method => ({
      name: method.name,
      parameters: (method.parameters || []).map(param => ({
        name: param.name,
        type: param.type,
        required: param.required ?? true,
        description: param.description
      })),
      returnType: method.returnType || 'void',
      description: method.description
    }));

    return {
      name: config.name,
      methods,
      events: config.events
    };
  }

  /**
   * Create a dependency specification
   */
  static createDependency(
    pluginId: string, 
    version: string, 
    optional: boolean = false
  ): PluginDependency {
    return {
      pluginId,
      version,
      optional
    };
  }

  /**
   * Validate plugin metadata
   */
  static validatePluginMetadata(metadata: PluginMetadata): {valid: boolean, errors: string[]} {
    const errors: string[] = [];

    if (!metadata.id || metadata.id.trim().length === 0) {
      errors.push('Plugin ID is required');
    }

    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push('Plugin name is required');
    }

    if (!metadata.version || !this.isValidVersion(metadata.version)) {
      errors.push('Valid plugin version is required (semver format)');
    }

    if (metadata.minObsidianVersion && !this.isValidVersion(metadata.minObsidianVersion)) {
      errors.push('Invalid minObsidianVersion format (semver required)');
    }

    if (metadata.maxObsidianVersion && !this.isValidVersion(metadata.maxObsidianVersion)) {
      errors.push('Invalid maxObsidianVersion format (semver required)');
    }

    // Validate dependencies
    for (const dep of metadata.dependencies) {
      if (!dep.pluginId || dep.pluginId.trim().length === 0) {
        errors.push('Dependency plugin ID is required');
      }
      if (!dep.version || !this.isValidVersionRange(dep.version)) {
        errors.push(`Invalid dependency version for ${dep.pluginId}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate plugin capability
   */
  static validateCapability(capability: PluginCapability): {valid: boolean, errors: string[]} {
    const errors: string[] = [];

    if (!capability.id || capability.id.trim().length === 0) {
      errors.push('Capability ID is required');
    }

    if (!capability.name || capability.name.trim().length === 0) {
      errors.push('Capability name is required');
    }

    if (!capability.version || !this.isValidVersion(capability.version)) {
      errors.push('Valid capability version is required');
    }

    if (!Object.values(PluginCapabilityCategory).includes(capability.category)) {
      errors.push('Valid capability category is required');
    }

    // Validate APIs
    if (capability.apis) {
      for (const api of capability.apis) {
        const apiValidation = this.validateApiExposure(api);
        if (!apiValidation.valid) {
          errors.push(...apiValidation.errors.map(err => `API ${api.name}: ${err}`));
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate API exposure
   */
  static validateApiExposure(api: ApiExposure): {valid: boolean, errors: string[]} {
    const errors: string[] = [];

    if (!api.name || api.name.trim().length === 0) {
      errors.push('API name is required');
    }

    if (!api.methods || api.methods.length === 0) {
      errors.push('At least one API method is required');
    }

    // Validate methods
    for (const method of api.methods) {
      if (!method.name || method.name.trim().length === 0) {
        errors.push('Method name is required');
      }

      // Validate parameters
      for (const param of method.parameters) {
        if (!param.name || param.name.trim().length === 0) {
          errors.push(`Parameter name is required for method ${method.name}`);
        }
        if (!param.type || param.type.trim().length === 0) {
          errors.push(`Parameter type is required for ${method.name}.${param.name}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check if a version string is valid semver
   */
  private static isValidVersion(version: string): boolean {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9-]+))?(?:\+([a-zA-Z0-9-]+))?$/;
    return semverRegex.test(version.trim());
  }

  /**
   * Check if a version range string is valid
   */
  private static isValidVersionRange(version: string): boolean {
    const cleaned = version.trim();
    
    // Basic semver
    if (this.isValidVersion(cleaned)) {
      return true;
    }

    // Caret range
    if (cleaned.startsWith('^') && this.isValidVersion(cleaned.substring(1))) {
      return true;
    }

    // Tilde range
    if (cleaned.startsWith('~') && this.isValidVersion(cleaned.substring(1))) {
      return true;
    }

    // Comparison operators
    const operatorRegex = /^(>=|<=|>|<)\s*(.+)$/;
    const match = cleaned.match(operatorRegex);
    if (match && this.isValidVersion(match[2].trim())) {
      return true;
    }

    // Range
    if (cleaned.includes(' - ')) {
      const [min, max] = cleaned.split(' - ');
      return this.isValidVersion(min.trim()) && this.isValidVersion(max.trim());
    }

    return false;
  }

  /**
   * Generate a unique capability ID based on plugin and capability name
   */
  static generateCapabilityId(pluginId: string, capabilityName: string): string {
    const sanitized = capabilityName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${pluginId}:${sanitized}`;
  }

  /**
   * Extract plugin ID from capability ID
   */
  static extractPluginIdFromCapability(capabilityId: string): string | null {
    const parts = capabilityId.split(':');
    return parts.length >= 2 ? parts[0] : null;
  }

  /**
   * Create a basic API method definition
   */
  static createApiMethod(
    name: string,
    parameters: Array<{name: string, type: string, required?: boolean}> = [],
    returnType: string = 'void',
    description?: string
  ): ApiMethod {
    return {
      name,
      parameters: parameters.map(p => ({
        name: p.name,
        type: p.type,
        required: p.required ?? true,
        description: undefined
      })),
      returnType,
      description
    };
  }

  /**
   * Create a standard capability for common plugin types
   */
  static createStandardCapability(
    pluginId: string,
    type: 'tracking' | 'ai-integration' | 'insights' | 'utilities',
    version: string = '1.0.0'
  ): PluginCapability {
    const capabilityMap = {
      tracking: {
        name: 'Change Tracking',
        category: PluginCapabilityCategory.TRACKING,
        description: 'Tracks and monitors document changes'
      },
      'ai-integration': {
        name: 'AI Integration',
        category: PluginCapabilityCategory.AI_INTEGRATION,
        description: 'Provides AI-powered functionality'
      },
      insights: {
        name: 'Writing Insights',
        category: PluginCapabilityCategory.INSIGHTS,
        description: 'Generates writing analytics and insights'
      },
      utilities: {
        name: 'Utility Functions',
        category: PluginCapabilityCategory.UTILITIES,
        description: 'Provides utility and helper functions'
      }
    };

    const config = capabilityMap[type];
    return this.createCapability({
      id: this.generateCapabilityId(pluginId, config.name),
      name: config.name,
      version,
      category: config.category,
      description: config.description
    });
  }
}