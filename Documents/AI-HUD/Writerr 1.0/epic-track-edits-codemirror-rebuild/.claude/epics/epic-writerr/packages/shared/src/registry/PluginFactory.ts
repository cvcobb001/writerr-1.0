/**
 * Plugin Factory
 * Factory for creating standardized plugin instances and configurations
 */

import {
  PluginCapability,
  PluginCapabilityCategory,
  PluginMetadata,
  PluginDependency,
  ApiExposure
} from './types';
import { PluginUtils } from './PluginUtils';

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  capabilities: CapabilityDefinition[];
  dependencies?: DependencyDefinition[];
  minObsidianVersion?: string;
  maxObsidianVersion?: string;
}

export interface CapabilityDefinition {
  name: string;
  category: PluginCapabilityCategory;
  description?: string;
  apis?: ApiDefinition[];
  dependencies?: string[];
}

export interface ApiDefinition {
  name: string;
  methods: MethodDefinition[];
  events?: EventDefinition[];
}

export interface MethodDefinition {
  name: string;
  parameters?: ParameterDefinition[];
  returnType?: string;
  description?: string;
}

export interface ParameterDefinition {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface EventDefinition {
  name: string;
  payload?: Record<string, any>;
  description?: string;
}

export interface DependencyDefinition {
  pluginId: string;
  version: string;
  optional?: boolean;
}

export class PluginFactory {
  /**
   * Create a complete plugin registration package from a definition
   */
  static createPluginPackage(definition: PluginDefinition): {
    metadata: PluginMetadata;
    capabilities: PluginCapability[];
  } {
    const metadata = this.createMetadataFromDefinition(definition);
    const capabilities = this.createCapabilitiesFromDefinition(definition);

    return { metadata, capabilities };
  }

  /**
   * Create plugin metadata from definition
   */
  private static createMetadataFromDefinition(definition: PluginDefinition): PluginMetadata {
    const dependencies: PluginDependency[] = (definition.dependencies || []).map(dep => 
      PluginUtils.createDependency(dep.pluginId, dep.version, dep.optional)
    );

    return PluginUtils.createPluginMetadata({
      id: definition.id,
      name: definition.name,
      version: definition.version,
      author: definition.author,
      description: definition.description,
      minObsidianVersion: definition.minObsidianVersion,
      maxObsidianVersion: definition.maxObsidianVersion,
      dependencies
    });
  }

  /**
   * Create capabilities from definition
   */
  private static createCapabilitiesFromDefinition(definition: PluginDefinition): PluginCapability[] {
    return definition.capabilities.map(capDef => {
      const apis: ApiExposure[] = (capDef.apis || []).map(apiDef => 
        PluginUtils.createApiExposure({
          name: apiDef.name,
          methods: apiDef.methods.map(methodDef => ({
            name: methodDef.name,
            parameters: methodDef.parameters,
            returnType: methodDef.returnType,
            description: methodDef.description
          })),
          events: apiDef.events
        })
      );

      return PluginUtils.createCapability({
        id: PluginUtils.generateCapabilityId(definition.id, capDef.name),
        name: capDef.name,
        version: definition.version,
        category: capDef.category,
        description: capDef.description,
        dependencies: capDef.dependencies,
        apis
      });
    });
  }

  /**
   * Create a standard tracking plugin definition
   */
  static createTrackingPluginDefinition(config: {
    id: string;
    name: string;
    version: string;
    description?: string;
    trackingMethods?: string[];
  }): PluginDefinition {
    const methods = config.trackingMethods || ['startTracking', 'stopTracking', 'getChanges'];
    
    return {
      id: config.id,
      name: config.name,
      version: config.version,
      description: config.description,
      capabilities: [{
        name: 'Change Tracking',
        category: PluginCapabilityCategory.TRACKING,
        description: 'Tracks document changes and modifications',
        apis: [{
          name: 'TrackingAPI',
          methods: methods.map(methodName => ({
            name: methodName,
            parameters: this.getStandardTrackingParameters(methodName),
            returnType: this.getStandardTrackingReturnType(methodName),
            description: `${methodName} functionality for change tracking`
          })),
          events: [
            { name: 'change:detected', description: 'Emitted when a change is detected' },
            { name: 'tracking:started', description: 'Emitted when tracking starts' },
            { name: 'tracking:stopped', description: 'Emitted when tracking stops' }
          ]
        }]
      }]
    };
  }

  /**
   * Create a standard AI integration plugin definition
   */
  static createAIPluginDefinition(config: {
    id: string;
    name: string;
    version: string;
    description?: string;
    aiMethods?: string[];
  }): PluginDefinition {
    const methods = config.aiMethods || ['processContent', 'generateSuggestions', 'analyzeText'];
    
    return {
      id: config.id,
      name: config.name,
      version: config.version,
      description: config.description,
      capabilities: [{
        name: 'AI Integration',
        category: PluginCapabilityCategory.AI_INTEGRATION,
        description: 'Provides AI-powered content processing',
        apis: [{
          name: 'AIAPI',
          methods: methods.map(methodName => ({
            name: methodName,
            parameters: this.getStandardAIParameters(methodName),
            returnType: this.getStandardAIReturnType(methodName),
            description: `${methodName} functionality for AI processing`
          })),
          events: [
            { name: 'ai:processing:started', description: 'Emitted when AI processing begins' },
            { name: 'ai:processing:completed', description: 'Emitted when AI processing completes' },
            { name: 'ai:error', description: 'Emitted when AI processing encounters an error' }
          ]
        }]
      }]
    };
  }

  private static getStandardTrackingParameters(methodName: string): ParameterDefinition[] {
    const parameterMap: Record<string, ParameterDefinition[]> = {
      startTracking: [
        { name: 'documentPath', type: 'string', required: true },
        { name: 'options', type: 'TrackingOptions', required: false }
      ],
      stopTracking: [
        { name: 'documentPath', type: 'string', required: true }
      ],
      getChanges: [
        { name: 'documentPath', type: 'string', required: true },
        { name: 'since', type: 'Date', required: false }
      ]
    };

    return parameterMap[methodName] || [];
  }

  private static getStandardTrackingReturnType(methodName: string): string {
    const returnTypeMap: Record<string, string> = {
      startTracking: 'void',
      stopTracking: 'void',
      getChanges: 'Change[]'
    };

    return returnTypeMap[methodName] || 'void';
  }

  private static getStandardAIParameters(methodName: string): ParameterDefinition[] {
    const parameterMap: Record<string, ParameterDefinition[]> = {
      processContent: [
        { name: 'content', type: 'string', required: true },
        { name: 'options', type: 'AIProcessingOptions', required: false }
      ],
      generateSuggestions: [
        { name: 'context', type: 'string', required: true },
        { name: 'count', type: 'number', required: false }
      ],
      analyzeText: [
        { name: 'text', type: 'string', required: true },
        { name: 'analysisType', type: 'string', required: false }
      ]
    };

    return parameterMap[methodName] || [];
  }

  private static getStandardAIReturnType(methodName: string): string {
    const returnTypeMap: Record<string, string> = {
      processContent: 'Promise<string>',
      generateSuggestions: 'Promise<string[]>',
      analyzeText: 'Promise<AnalysisResult>'
    };

    return returnTypeMap[methodName] || 'Promise<void>';
  }
}