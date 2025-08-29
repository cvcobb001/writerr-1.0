/**
 * Central Plugin Registry for AI Processing Plugins
 * 
 * Manages registration, authentication, validation, and lifecycle of AI processing plugins
 * that integrate with the Track Edits plugin system.
 */

import { 
  AIProcessingPlugin,
  PluginRegistration,
  PluginRegistrationStatus,
  PluginPerformanceMetrics,
  PluginPermission,
  PluginAuthenticationContext
} from '../types/submit-changes-from-ai';

import {
  IAIProcessingPlugin,
  IPluginRegistry,
  PluginLifecycleEvent,
  PluginSecurityOptions,
  PluginRegistrationResult,
  PluginCredentials,
  PermissionValidationResult,
  PluginFilter,
  RateLimitConfig,
  PLUGIN_API_VERSION
} from './plugin-interface';

import { generateId } from '../utils';
import { Plugin } from 'obsidian';

/**
 * Central registry for managing AI processing plugins
 */
export class PluginRegistry implements IPluginRegistry {
  private plugins = new Map<string, IAIProcessingPlugin>();
  private registrations = new Map<string, PluginRegistration>();
  private authTokens = new Map<string, PluginAuthenticationContext>();
  private performanceMetrics = new Map<string, PluginPerformanceMetrics>();
  private rateLimitTrackers = new Map<string, RateLimitTracker>();

  constructor(
    private obsidianPlugin: Plugin,
    private securityValidator: IPluginSecurityValidator,
    private capabilityValidator: IPluginCapabilityValidator
  ) {}

  /**
   * Register a new AI processing plugin
   */
  async registerPlugin(
    plugin: IAIProcessingPlugin, 
    securityOptions: PluginSecurityOptions = this.getDefaultSecurityOptions()
  ): Promise<PluginRegistrationResult> {
    const result: PluginRegistrationResult = {
      success: false,
      pluginId: '',
      authToken: '',
      permissions: [],
      errors: [],
      warnings: [],
      expiresAt: new Date()
    };

    try {
      const pluginInfo = plugin.getPluginInfo();
      result.pluginId = pluginInfo.id;

      // Validate plugin API compatibility
      if (pluginInfo.apiVersion !== PLUGIN_API_VERSION) {
        result.errors.push(`Incompatible API version: ${pluginInfo.apiVersion}. Expected: ${PLUGIN_API_VERSION}`);
        return result;
      }

      // Check if plugin is already registered
      if (this.registrations.has(pluginInfo.id)) {
        const existingRegistration = this.registrations.get(pluginInfo.id)!;
        if (existingRegistration.status === PluginRegistrationStatus.ACTIVE) {
          result.errors.push(`Plugin ${pluginInfo.id} is already registered and active`);
          return result;
        }
      }

      // Validate plugin metadata
      const validationResult = this.validatePluginMetadata(pluginInfo);
      if (!validationResult.isValid) {
        result.errors.push(...validationResult.errors);
        result.warnings.push(...validationResult.warnings);
        return result;
      }

      // Security validation
      const securityResult = await this.securityValidator.validateSecurity(plugin, securityOptions);
      if (!securityResult.isSecure) {
        result.errors.push('Plugin failed security validation');
        result.errors.push(...securityResult.securityThreats);
        result.warnings.push(...securityResult.warnings);
        return result;
      }

      result.warnings.push(...securityResult.warnings);

      // Generate authentication token
      const authToken = this.generateAuthToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

      // Determine granted permissions based on capabilities and security validation
      const grantedPermissions = this.determineGrantedPermissions(
        pluginInfo.capabilities.requiredPermissions,
        securityResult.recommendedRestrictions
      );

      // Create authentication context
      const authContext: PluginAuthenticationContext = {
        pluginId: pluginInfo.id,
        sessionToken: authToken,
        permissions: grantedPermissions,
        issuedAt: new Date(),
        expiresAt,
        requestSignature: this.generateRequestSignature(pluginInfo.id, authToken)
      };

      // Create plugin registration
      const registration: PluginRegistration = {
        plugin: pluginInfo,
        registrationTime: new Date(),
        status: PluginRegistrationStatus.ACTIVE,
        securityHash: securityResult.securityHash,
        validatedCapabilities: pluginInfo.capabilities,
        performanceMetrics: this.createInitialPerformanceMetrics()
      };

      // Initialize rate limiting
      const rateLimitConfig: RateLimitConfig = {
        requestsPerMinute: securityOptions.rateLimitConfig.requestsPerMinute,
        requestsPerHour: securityOptions.rateLimitConfig.requestsPerHour,
        burstLimit: securityOptions.rateLimitConfig.burstLimit,
        cooldownPeriod: securityOptions.rateLimitConfig.cooldownPeriod
      };

      // Store registration data
      this.plugins.set(pluginInfo.id, plugin);
      this.registrations.set(pluginInfo.id, registration);
      this.authTokens.set(authToken, authContext);
      this.performanceMetrics.set(pluginInfo.id, registration.performanceMetrics);
      this.rateLimitTrackers.set(pluginInfo.id, new RateLimitTracker(rateLimitConfig));

      // Initialize plugin
      await plugin.initialize(this, authContext);

      // Notify plugin of successful registration
      await plugin.onLifecycleEvent(PluginLifecycleEvent.REGISTERED, { 
        authContext, 
        permissions: grantedPermissions 
      });

      // Activate plugin
      await plugin.onLifecycleEvent(PluginLifecycleEvent.ACTIVATED);
      
      // Success
      result.success = true;
      result.authToken = authToken;
      result.permissions = grantedPermissions;
      result.expiresAt = expiresAt;

      console.log(`[PluginRegistry] Successfully registered plugin: ${pluginInfo.id}`, {
        version: pluginInfo.version,
        permissions: grantedPermissions,
        capabilities: Object.keys(pluginInfo.capabilities)
      });

      return result;

    } catch (error) {
      const errorMessage = `Plugin registration failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMessage);
      console.error(`[PluginRegistry] Registration error for ${result.pluginId}:`, error);
      return result;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string, reason?: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      const registration = this.registrations.get(pluginId);

      if (!plugin || !registration) {
        console.warn(`[PluginRegistry] Cannot unregister unknown plugin: ${pluginId}`);
        return false;
      }

      // Notify plugin of deactivation
      try {
        await plugin.onLifecycleEvent(PluginLifecycleEvent.DEACTIVATED, { reason });
        await plugin.cleanup();
      } catch (error) {
        console.warn(`[PluginRegistry] Plugin cleanup failed for ${pluginId}:`, error);
      }

      // Remove from all tracking maps
      this.plugins.delete(pluginId);
      this.registrations.delete(pluginId);
      this.performanceMetrics.delete(pluginId);
      this.rateLimitTrackers.delete(pluginId);

      // Remove auth tokens
      for (const [token, authContext] of this.authTokens.entries()) {
        if (authContext.pluginId === pluginId) {
          this.authTokens.delete(token);
        }
      }

      console.log(`[PluginRegistry] Successfully unregistered plugin: ${pluginId}`, { reason });
      return true;

    } catch (error) {
      console.error(`[PluginRegistry] Error unregistering plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Get a registered plugin by ID
   */
  getPlugin(pluginId: string): IAIProcessingPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins with optional filtering
   */
  getPlugins(filter?: PluginFilter): IAIProcessingPlugin[] {
    const plugins: IAIProcessingPlugin[] = [];

    for (const [pluginId, plugin] of this.plugins.entries()) {
      const registration = this.registrations.get(pluginId);
      if (!registration) continue;

      // Apply filters
      if (filter) {
        if (filter.status && !filter.status.includes(registration.status)) continue;
        if (filter.author && registration.plugin.author !== filter.author) continue;
        if (filter.capabilities && !this.hasCapabilities(registration.plugin, filter.capabilities)) continue;
        if (filter.permissions && !this.hasPermissions(registration.validatedCapabilities.requiredPermissions, filter.permissions)) continue;
        if (filter.minVersion && !this.isVersionCompatible(registration.plugin.version, filter.minVersion, '>=')) continue;
        if (filter.maxVersion && !this.isVersionCompatible(registration.plugin.version, filter.maxVersion, '<=')) continue;
      }

      plugins.push(plugin);
    }

    return plugins;
  }

  /**
   * Update plugin status
   */
  async updatePluginStatus(pluginId: string, status: PluginRegistrationStatus, reason?: string): Promise<boolean> {
    const registration = this.registrations.get(pluginId);
    const plugin = this.plugins.get(pluginId);

    if (!registration || !plugin) {
      return false;
    }

    const previousStatus = registration.status;
    registration.status = status;

    // Notify plugin of status change
    try {
      const eventMapping = {
        [PluginRegistrationStatus.ACTIVE]: PluginLifecycleEvent.ACTIVATED,
        [PluginRegistrationStatus.SUSPENDED]: PluginLifecycleEvent.SUSPENDED,
        [PluginRegistrationStatus.DEACTIVATED]: PluginLifecycleEvent.DEACTIVATED,
        [PluginRegistrationStatus.SECURITY_VIOLATION]: PluginLifecycleEvent.ERROR,
        [PluginRegistrationStatus.VERSION_INCOMPATIBLE]: PluginLifecycleEvent.ERROR
      };

      const event = eventMapping[status];
      if (event) {
        await plugin.onLifecycleEvent(event, { previousStatus, reason });
      }

      console.log(`[PluginRegistry] Updated plugin ${pluginId} status: ${previousStatus} -> ${status}`, { reason });
      return true;

    } catch (error) {
      console.error(`[PluginRegistry] Error updating status for plugin ${pluginId}:`, error);
      registration.status = previousStatus; // Rollback
      return false;
    }
  }

  /**
   * Authenticate a plugin for API operations
   */
  async authenticatePlugin(pluginId: string, credentials: PluginCredentials): Promise<PluginAuthenticationContext | null> {
    try {
      // Validate credentials
      if (credentials.pluginId !== pluginId) {
        return null;
      }

      const authContext = this.authTokens.get(credentials.authToken || '');
      if (!authContext || authContext.pluginId !== pluginId) {
        return null;
      }

      // Check expiration
      if (authContext.expiresAt < new Date()) {
        this.authTokens.delete(credentials.authToken || '');
        return null;
      }

      // Validate registration status
      const registration = this.registrations.get(pluginId);
      if (!registration || registration.status !== PluginRegistrationStatus.ACTIVE) {
        return null;
      }

      // Update last activity
      registration.lastActivity = new Date();

      return authContext;

    } catch (error) {
      console.error(`[PluginRegistry] Authentication error for plugin ${pluginId}:`, error);
      return null;
    }
  }

  /**
   * Validate plugin permissions for an operation
   */
  async validatePermissions(
    pluginId: string, 
    requiredPermissions: PluginPermission[], 
    context?: any
  ): Promise<PermissionValidationResult> {
    const result: PermissionValidationResult = {
      hasPermission: false,
      missingPermissions: [],
      warnings: [],
      contextValidation: true
    };

    try {
      const registration = this.registrations.get(pluginId);
      if (!registration) {
        result.missingPermissions = requiredPermissions;
        return result;
      }

      const grantedPermissions = registration.validatedCapabilities.requiredPermissions;
      const missingPermissions: PluginPermission[] = [];

      for (const permission of requiredPermissions) {
        if (!grantedPermissions.includes(permission)) {
          missingPermissions.push(permission);
        }
      }

      result.hasPermission = missingPermissions.length === 0;
      result.missingPermissions = missingPermissions;

      // Context-specific validation
      if (context && result.hasPermission) {
        result.contextValidation = await this.validatePermissionContext(pluginId, requiredPermissions, context);
        if (!result.contextValidation) {
          result.warnings.push('Permission granted but context validation failed');
        }
      }

      return result;

    } catch (error) {
      result.warnings.push(`Permission validation error: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  /**
   * Get plugin performance metrics
   */
  getPluginMetrics(pluginId: string): PluginPerformanceMetrics | undefined {
    return this.performanceMetrics.get(pluginId);
  }

  /**
   * Record plugin error and update metrics
   */
  async recordPluginError(pluginId: string, error: Error, context?: any): Promise<void> {
    const metrics = this.performanceMetrics.get(pluginId);
    if (metrics) {
      metrics.errorRate = (metrics.errorRate * metrics.totalSubmissions + 1) / (metrics.totalSubmissions + 1);
      metrics.lastErrorTime = new Date();
    }

    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      try {
        await plugin.onLifecycleEvent(PluginLifecycleEvent.ERROR, { error, context });
      } catch (lifecycleError) {
        console.error(`[PluginRegistry] Plugin lifecycle error handling failed for ${pluginId}:`, lifecycleError);
      }
    }

    console.error(`[PluginRegistry] Recorded error for plugin ${pluginId}:`, { error: error.message, context });
  }

  /**
   * Check if a plugin has required capabilities
   */
  private hasCapabilities(plugin: AIProcessingPlugin, requiredCapabilities: string[]): boolean {
    return requiredCapabilities.every(capability => 
      plugin.capabilities.editorialOperations.includes(capability as any)
    );
  }

  /**
   * Check if permissions include required permissions
   */
  private hasPermissions(grantedPermissions: PluginPermission[], requiredPermissions: PluginPermission[]): boolean {
    return requiredPermissions.every(permission => grantedPermissions.includes(permission));
  }

  /**
   * Check version compatibility
   */
  private isVersionCompatible(version: string, compareVersion: string, operator: '>=' | '<='): boolean {
    // Simple semantic version comparison (would use a proper semver library in production)
    const parseVersion = (v: string) => v.split('.').map(n => parseInt(n, 10));
    const v1 = parseVersion(version);
    const v2 = parseVersion(compareVersion);

    for (let i = 0; i < 3; i++) {
      if (v1[i] !== v2[i]) {
        return operator === '>=' ? v1[i] >= v2[i] : v1[i] <= v2[i];
      }
    }
    return true; // Equal versions
  }

  /**
   * Validate plugin metadata structure
   */
  private validatePluginMetadata(plugin: AIProcessingPlugin): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!plugin.id || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(plugin.id)) {
      errors.push('Invalid plugin ID format');
    }

    if (!plugin.name || plugin.name.length === 0) {
      errors.push('Plugin name is required');
    }

    if (!plugin.version || !/^\d+\.\d+\.\d+$/.test(plugin.version)) {
      errors.push('Invalid version format (expected semantic versioning)');
    }

    if (!plugin.author || plugin.author.length === 0) {
      errors.push('Plugin author is required');
    }

    if (!plugin.capabilities.editorialOperations || plugin.capabilities.editorialOperations.length === 0) {
      errors.push('Plugin must declare at least one editorial operation capability');
    }

    if (!plugin.capabilities.requiredPermissions || plugin.capabilities.requiredPermissions.length === 0) {
      warnings.push('Plugin declares no required permissions - this may limit functionality');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Generate authentication token
   */
  private generateAuthToken(): string {
    return `plugin_${generateId()}_${Date.now()}`;
  }

  /**
   * Generate request signature for authentication
   */
  private generateRequestSignature(pluginId: string, authToken: string): string {
    // In production, this would use proper cryptographic signing
    return `sig_${btoa(`${pluginId}:${authToken}:${Date.now()}`)}}`;
  }

  /**
   * Determine granted permissions based on requested permissions and security restrictions
   */
  private determineGrantedPermissions(
    requestedPermissions: PluginPermission[], 
    securityRestrictions: string[]
  ): PluginPermission[] {
    const grantedPermissions = [...requestedPermissions];

    // Apply security restrictions
    if (securityRestrictions.includes('no_network_access')) {
      const index = grantedPermissions.indexOf(PluginPermission.NETWORK_ACCESS);
      if (index > -1) grantedPermissions.splice(index, 1);
    }

    if (securityRestrictions.includes('no_storage_access')) {
      const index = grantedPermissions.indexOf(PluginPermission.STORAGE_ACCESS);
      if (index > -1) grantedPermissions.splice(index, 1);
    }

    return grantedPermissions;
  }

  /**
   * Create initial performance metrics for a new plugin
   */
  private createInitialPerformanceMetrics(): PluginPerformanceMetrics {
    return {
      totalSubmissions: 0,
      successRate: 1.0,
      averageResponseTime: 0,
      errorRate: 0,
      rateLimitViolations: 0
    };
  }

  /**
   * Get default security options
   */
  private getDefaultSecurityOptions(): PluginSecurityOptions {
    return {
      validateCodeSignature: true,
      allowNetworkAccess: false,
      allowStorageAccess: true,
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      rateLimitConfig: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        burstLimit: 10,
        cooldownPeriod: 1000
      },
      sandboxEnabled: true
    };
  }

  /**
   * Validate permission context for specific operations
   */
  private async validatePermissionContext(
    pluginId: string, 
    permissions: PluginPermission[], 
    context: any
  ): Promise<boolean> {
    // Context-specific validation logic would go here
    // For example, checking file access permissions against specific files
    return true;
  }
}

/**
 * Rate limiting tracker for plugins
 */
class RateLimitTracker {
  private requestTimes: number[] = [];
  private burstCount = 0;
  private lastBurstTime = 0;

  constructor(private config: RateLimitConfig) {}

  /**
   * Check if a request is allowed under rate limits
   */
  isRequestAllowed(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Clean old requests
    this.requestTimes = this.requestTimes.filter(time => time > oneHourAgo);

    // Check hourly limit
    if (this.requestTimes.length >= this.config.requestsPerHour) {
      return false;
    }

    // Check per-minute limit
    const recentRequests = this.requestTimes.filter(time => time > oneMinuteAgo);
    if (recentRequests.length >= this.config.requestsPerMinute) {
      return false;
    }

    // Check burst limit
    if (now - this.lastBurstTime > this.config.cooldownPeriod) {
      this.burstCount = 0;
      this.lastBurstTime = now;
    }

    if (this.burstCount >= this.config.burstLimit) {
      return false;
    }

    return true;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    const now = Date.now();
    this.requestTimes.push(now);
    this.burstCount++;
  }
}

/**
 * Interfaces for security and capability validation (to be implemented in separate files)
 */
export interface IPluginSecurityValidator {
  validateSecurity(plugin: IAIProcessingPlugin, options: PluginSecurityOptions): Promise<{
    isSecure: boolean;
    securityThreats: string[];
    warnings: string[];
    recommendedRestrictions: string[];
    securityHash: string;
  }>;
}

export interface IPluginCapabilityValidator {
  validateCapabilities(plugin: AIProcessingPlugin, requiredCapabilities: string[], context?: any): Promise<{
    isValid: boolean;
    missingCapabilities: string[];
    warnings: string[];
  }>;
}