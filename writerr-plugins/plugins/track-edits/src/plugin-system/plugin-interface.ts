/**
 * Plugin Interface Standards for AI Processing Plugins
 * 
 * This file defines the standardized interfaces that all AI processing plugins
 * must implement to integrate with the Track Edits plugin registry system.
 */

import { 
  AIProcessingPlugin, 
  PluginCapabilities, 
  PluginPermission, 
  PluginAuthenticationContext,
  PluginSubmissionOptions,
  SubmitChangesFromAIResult,
  PluginRegistrationStatus,
  PluginPerformanceMetrics
} from '../types/submit-changes-from-ai';
import { EditChange, AIProcessingContext } from '../types';

/**
 * Standard API version for plugin compatibility
 */
export const PLUGIN_API_VERSION = '1.0.0';

/**
 * Required interface that all AI processing plugins must implement
 */
export interface IAIProcessingPlugin {
  /**
   * Plugin identification and metadata
   */
  getPluginInfo(): AIProcessingPlugin;

  /**
   * Initialize the plugin with the Track Edits registry
   * @param registry - The plugin registry instance
   * @param authContext - Authentication context for secure operations
   */
  initialize(registry: IPluginRegistry, authContext: PluginAuthenticationContext): Promise<void>;

  /**
   * Submit AI-generated changes to Track Edits
   * @param changes - Array of changes to submit
   * @param aiProvider - AI provider identifier
   * @param aiModel - AI model identifier
   * @param processingContext - Context for the AI processing
   * @param options - Additional submission options
   */
  submitChanges(
    changes: EditChange[],
    aiProvider: string,
    aiModel: string,
    processingContext?: AIProcessingContext,
    options?: Partial<PluginSubmissionOptions>
  ): Promise<SubmitChangesFromAIResult>;

  /**
   * Validate plugin capabilities against requested operation
   * @param operation - The operation type to validate
   * @param context - Additional context for validation
   */
  validateCapability(operation: string, context?: any): Promise<boolean>;

  /**
   * Clean up resources and prepare for deactivation
   */
  cleanup(): Promise<void>;

  /**
   * Handle plugin lifecycle events
   * @param event - The lifecycle event
   * @param data - Event-specific data
   */
  onLifecycleEvent(event: PluginLifecycleEvent, data?: any): Promise<void>;
}

/**
 * Plugin lifecycle events
 */
export enum PluginLifecycleEvent {
  REGISTERED = 'registered',
  ACTIVATED = 'activated',
  DEACTIVATED = 'deactivated',
  SUSPENDED = 'suspended',
  UPDATED = 'updated',
  PERMISSION_CHANGED = 'permission_changed',
  ERROR = 'error'
}

/**
 * Plugin registry interface for managing registered plugins
 */
export interface IPluginRegistry {
  /**
   * Register a new AI processing plugin
   * @param plugin - The plugin to register
   * @param securityOptions - Security validation options
   */
  registerPlugin(plugin: IAIProcessingPlugin, securityOptions?: PluginSecurityOptions): Promise<PluginRegistrationResult>;

  /**
   * Unregister a plugin
   * @param pluginId - ID of the plugin to unregister
   * @param reason - Reason for unregistration
   */
  unregisterPlugin(pluginId: string, reason?: string): Promise<boolean>;

  /**
   * Get a registered plugin by ID
   * @param pluginId - The plugin ID
   */
  getPlugin(pluginId: string): IAIProcessingPlugin | undefined;

  /**
   * Get all registered plugins with optional filtering
   * @param filter - Optional filter criteria
   */
  getPlugins(filter?: PluginFilter): IAIProcessingPlugin[];

  /**
   * Update plugin status
   * @param pluginId - The plugin ID
   * @param status - New status
   * @param reason - Reason for status change
   */
  updatePluginStatus(pluginId: string, status: PluginRegistrationStatus, reason?: string): Promise<boolean>;

  /**
   * Authenticate a plugin for API operations
   * @param pluginId - The plugin ID
   * @param credentials - Authentication credentials
   */
  authenticatePlugin(pluginId: string, credentials: PluginCredentials): Promise<PluginAuthenticationContext | null>;

  /**
   * Validate plugin permissions for an operation
   * @param pluginId - The plugin ID
   * @param requiredPermissions - Required permissions
   * @param context - Operation context
   */
  validatePermissions(
    pluginId: string, 
    requiredPermissions: PluginPermission[], 
    context?: any
  ): Promise<PermissionValidationResult>;

  /**
   * Get plugin performance metrics
   * @param pluginId - The plugin ID
   */
  getPluginMetrics(pluginId: string): PluginPerformanceMetrics | undefined;

  /**
   * Handle plugin error and update metrics
   * @param pluginId - The plugin ID
   * @param error - The error that occurred
   * @param context - Error context
   */
  recordPluginError(pluginId: string, error: Error, context?: any): Promise<void>;
}

/**
 * Plugin security validation options
 */
export interface PluginSecurityOptions {
  readonly validateCodeSignature: boolean;
  readonly allowNetworkAccess: boolean;
  readonly allowStorageAccess: boolean;
  readonly maxMemoryUsage: number;
  readonly rateLimitConfig: RateLimitConfig;
  readonly sandboxEnabled: boolean;
}

/**
 * Rate limiting configuration for plugins
 */
export interface RateLimitConfig {
  readonly requestsPerMinute: number;
  readonly requestsPerHour: number;
  readonly burstLimit: number;
  readonly cooldownPeriod: number;
}

/**
 * Plugin registration result
 */
export interface PluginRegistrationResult {
  readonly success: boolean;
  readonly pluginId: string;
  readonly authToken: string;
  readonly permissions: PluginPermission[];
  readonly errors: string[];
  readonly warnings: string[];
  readonly expiresAt: Date;
}

/**
 * Plugin credentials for authentication
 */
export interface PluginCredentials {
  readonly pluginId: string;
  readonly authToken?: string;
  readonly signature?: string;
  readonly timestamp: Date;
  readonly nonce: string;
}

/**
 * Permission validation result
 */
export interface PermissionValidationResult {
  readonly hasPermission: boolean;
  readonly missingPermissions: PluginPermission[];
  readonly warnings: string[];
  readonly contextValidation: boolean;
}

/**
 * Plugin filter for querying registered plugins
 */
export interface PluginFilter {
  readonly status?: PluginRegistrationStatus[];
  readonly capabilities?: string[];
  readonly permissions?: PluginPermission[];
  readonly author?: string;
  readonly minVersion?: string;
  readonly maxVersion?: string;
}

/**
 * Plugin capability validation interface
 */
export interface IPluginCapabilityValidator {
  /**
   * Validate that a plugin has the required capabilities for an operation
   * @param plugin - The plugin to validate
   * @param requiredCapabilities - Required capabilities
   * @param context - Operation context
   */
  validateCapabilities(
    plugin: AIProcessingPlugin,
    requiredCapabilities: string[],
    context?: any
  ): Promise<CapabilityValidationResult>;

  /**
   * Get recommended capabilities for an operation type
   * @param operationType - The type of operation
   */
  getRecommendedCapabilities(operationType: string): PluginCapabilities;
}

/**
 * Capability validation result
 */
export interface CapabilityValidationResult {
  readonly isValid: boolean;
  readonly missingCapabilities: string[];
  readonly recommendedCapabilities: string[];
  readonly warnings: string[];
}

/**
 * Plugin security validator interface
 */
export interface IPluginSecurityValidator {
  /**
   * Perform security validation on a plugin
   * @param plugin - The plugin to validate
   * @param options - Security validation options
   */
  validateSecurity(plugin: IAIProcessingPlugin, options: PluginSecurityOptions): Promise<SecurityValidationResult>;

  /**
   * Generate security hash for plugin verification
   * @param plugin - The plugin to hash
   */
  generateSecurityHash(plugin: AIProcessingPlugin): string;

  /**
   * Verify plugin integrity
   * @param plugin - The plugin to verify
   * @param expectedHash - Expected security hash
   */
  verifyIntegrity(plugin: IAIProcessingPlugin, expectedHash: string): boolean;
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  readonly isSecure: boolean;
  readonly securityThreats: string[];
  readonly warnings: string[];
  readonly recommendedRestrictions: string[];
  readonly securityHash: string;
}

/**
 * Plugin metadata schema for standardized plugin information
 */
export const PLUGIN_METADATA_SCHEMA = {
  required: ['id', 'name', 'version', 'author', 'capabilities', 'apiVersion'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*[a-z0-9]$' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    author: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    apiVersion: { type: 'string', enum: [PLUGIN_API_VERSION] },
    capabilities: {
      type: 'object',
      required: ['editorialOperations', 'requiredPermissions'],
      properties: {
        editorialOperations: { type: 'array', items: { type: 'string' } },
        aiProviders: { type: 'array', items: { type: 'string' } },
        maxBatchSize: { type: 'number', minimum: 1, maximum: 1000 },
        requiredPermissions: { 
          type: 'array', 
          items: { enum: Object.values(PluginPermission) } 
        }
      }
    }
  }
} as const;

/**
 * Default plugin capabilities for different operation types
 */
export const DEFAULT_PLUGIN_CAPABILITIES: Record<string, Partial<PluginCapabilities>> = {
  basic_editing: {
    editorialOperations: ['replace', 'insert', 'delete'],
    maxBatchSize: 10,
    supportsRealTime: false,
    requiredPermissions: [PluginPermission.MODIFY_DOCUMENTS]
  },
  advanced_editing: {
    editorialOperations: ['replace', 'insert', 'delete', 'restructure', 'format'],
    maxBatchSize: 50,
    supportsRealTime: true,
    supportsConversationContext: true,
    requiredPermissions: [
      PluginPermission.MODIFY_DOCUMENTS,
      PluginPermission.READ_DOCUMENTS,
      PluginPermission.CREATE_SESSIONS
    ]
  },
  ai_assistant: {
    editorialOperations: ['replace', 'insert', 'delete', 'restructure', 'format', 'analyze'],
    maxBatchSize: 100,
    supportsRealTime: true,
    supportsConversationContext: true,
    requiredPermissions: [
      PluginPermission.MODIFY_DOCUMENTS,
      PluginPermission.READ_DOCUMENTS,
      PluginPermission.CREATE_SESSIONS,
      PluginPermission.ACCESS_VAULT_METADATA,
      PluginPermission.NETWORK_ACCESS
    ]
  }
};

/**
 * Plugin API contract requirements
 */
export const PLUGIN_API_CONTRACT = {
  minimumMethods: ['getPluginInfo', 'initialize', 'submitChanges', 'cleanup'],
  requiredEvents: ['registered', 'activated', 'deactivated'],
  supportedVersions: [PLUGIN_API_VERSION],
  securityRequirements: {
    authentication: true,
    permissionValidation: true,
    rateLimiting: true,
    integrityChecking: true
  }
} as const;