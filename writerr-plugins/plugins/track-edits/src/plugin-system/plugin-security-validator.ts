/**
 * Plugin Security Validator
 * 
 * Provides security validation, sandboxing, and permission management
 * for AI processing plugins in the Track Edits system.
 */

import { 
  PluginPermission,
  AIProcessingPlugin 
} from '../types/submit-changes-from-ai';

import {
  IAIProcessingPlugin,
  PluginSecurityOptions,
  SecurityValidationResult
} from './plugin-interface';

import { IPluginSecurityValidator } from './plugin-registry';
// Simple hash function for plugin fingerprinting (no crypto dependency)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Security validator for plugins with comprehensive security checks
 */
export class PluginSecurityValidator implements IPluginSecurityValidator {
  private trustedAuthors = new Set<string>(['writerr-official', 'obsidian-community']);
  private blacklistedPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /require\s*\(/,
    /import\s*\(/,
    /process\./,
    /global\./,
    /window\./,
    /document\./
  ];

  /**
   * Validate plugin security with comprehensive checks
   */
  async validateSecurity(
    plugin: IAIProcessingPlugin, 
    options: PluginSecurityOptions
  ): Promise<SecurityValidationResult> {
    const result: SecurityValidationResult = {
      isSecure: true,
      securityThreats: [],
      warnings: [],
      recommendedRestrictions: [],
      securityHash: ''
    };

    const pluginInfo = plugin.getPluginInfo();

    try {
      // Generate security hash
      result.securityHash = this.generateSecurityHash(pluginInfo);

      // Validate plugin metadata
      this.validatePluginMetadata(pluginInfo, result);

      // Validate capabilities and permissions
      this.validateCapabilitiesAndPermissions(pluginInfo, result);

      // Check code security (static analysis)
      await this.performStaticSecurityAnalysis(plugin, result);

      // Validate against security options
      this.validateAgainstSecurityOptions(pluginInfo, options, result);

      // Author trust validation
      this.validateAuthorTrust(pluginInfo, result);

      // Permission risk assessment
      this.assessPermissionRisks(pluginInfo.capabilities.requiredPermissions, result);

      // Network access validation
      if (pluginInfo.capabilities.requiredPermissions.includes(PluginPermission.NETWORK_ACCESS)) {
        this.validateNetworkAccess(pluginInfo, options, result);
      }

      // Storage access validation
      if (pluginInfo.capabilities.requiredPermissions.includes(PluginPermission.STORAGE_ACCESS)) {
        this.validateStorageAccess(pluginInfo, options, result);
      }

      // Determine final security status
      result.isSecure = result.securityThreats.length === 0;

      if (result.securityThreats.length > 0) {
        console.warn(`[PluginSecurityValidator] Security threats detected for plugin ${pluginInfo.id}:`, 
          result.securityThreats);
      }

      return result;

    } catch (error) {
      result.isSecure = false;
      result.securityThreats.push(`Security validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  /**
   * Generate security hash for plugin integrity verification
   */
  generateSecurityHash(plugin: AIProcessingPlugin): string {
    const hashInput = JSON.stringify({
      id: plugin.id,
      version: plugin.version,
      author: plugin.author,
      capabilities: plugin.capabilities,
      apiVersion: plugin.apiVersion
    });

    return simpleHash(hashInput);
  }

  /**
   * Verify plugin integrity against expected hash
   */
  verifyIntegrity(plugin: IAIProcessingPlugin, expectedHash: string): boolean {
    const pluginInfo = plugin.getPluginInfo();
    const currentHash = this.generateSecurityHash(pluginInfo);
    return currentHash === expectedHash;
  }

  /**
   * Validate plugin metadata for security issues
   */
  private validatePluginMetadata(plugin: AIProcessingPlugin, result: SecurityValidationResult): void {
    // Check for suspicious plugin IDs
    if (plugin.id.includes('..') || plugin.id.includes('/') || plugin.id.includes('\\')) {
      result.securityThreats.push('Plugin ID contains suspicious path characters');
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(plugin.version)) {
      result.warnings.push('Non-standard version format detected');
    }

    // Check description for suspicious content
    if (plugin.description && this.containsSuspiciousContent(plugin.description)) {
      result.warnings.push('Plugin description contains potentially suspicious content');
    }

    // Validate repository URL if provided
    if (plugin.metadata.repository) {
      if (!this.isValidRepositoryUrl(plugin.metadata.repository)) {
        result.warnings.push('Invalid or suspicious repository URL');
      }
    }
  }

  /**
   * Validate capabilities and permissions for security risks
   */
  private validateCapabilitiesAndPermissions(plugin: AIProcessingPlugin, result: SecurityValidationResult): void {
    const { capabilities } = plugin;

    // Check for excessive permissions
    if (capabilities.requiredPermissions.length > 5) {
      result.warnings.push('Plugin requests an unusually high number of permissions');
    }

    // Validate permission combinations
    const hasNetworkAndModify = capabilities.requiredPermissions.includes(PluginPermission.NETWORK_ACCESS) &&
                                capabilities.requiredPermissions.includes(PluginPermission.MODIFY_DOCUMENTS);
    
    if (hasNetworkAndModify) {
      result.warnings.push('Plugin combines network access with document modification - high risk combination');
      result.recommendedRestrictions.push('monitor_network_activity');
    }

    // Check for suspicious AI providers
    if (capabilities.aiProviders && capabilities.aiProviders.some(provider => 
        this.isSuspiciousAIProvider(provider))) {
      result.warnings.push('Plugin declares support for unrecognized AI providers');
    }

    // Validate batch size limits
    if (capabilities.maxBatchSize > 1000) {
      result.warnings.push('Plugin declares unusually large batch size - potential DoS risk');
      result.recommendedRestrictions.push('limit_batch_size');
    }
  }

  /**
   * Perform static security analysis on plugin code
   */
  private async performStaticSecurityAnalysis(
    plugin: IAIProcessingPlugin, 
    result: SecurityValidationResult
  ): Promise<void> {
    try {
      // Convert plugin to string for analysis (simplified approach)
      const pluginString = plugin.toString();

      // Check for dangerous patterns
      for (const pattern of this.blacklistedPatterns) {
        if (pattern.test(pluginString)) {
          result.securityThreats.push(`Dangerous code pattern detected: ${pattern.source}`);
        }
      }

      // Check for obfuscated code
      if (this.appearsObfuscated(pluginString)) {
        result.securityThreats.push('Plugin code appears to be obfuscated');
      }

      // Check for external imports/requires
      const externalImports = this.findExternalImports(pluginString);
      if (externalImports.length > 0) {
        result.warnings.push(`Plugin attempts to import external modules: ${externalImports.join(', ')}`);
      }

    } catch (error) {
      result.warnings.push('Static code analysis failed - manual review required');
    }
  }

  /**
   * Validate against security options
   */
  private validateAgainstSecurityOptions(
    plugin: AIProcessingPlugin, 
    options: PluginSecurityOptions, 
    result: SecurityValidationResult
  ): void {
    // Check network access against options
    if (plugin.capabilities.requiredPermissions.includes(PluginPermission.NETWORK_ACCESS) && 
        !options.allowNetworkAccess) {
      result.securityThreats.push('Plugin requires network access but policy disallows it');
    }

    // Check storage access against options
    if (plugin.capabilities.requiredPermissions.includes(PluginPermission.STORAGE_ACCESS) && 
        !options.allowStorageAccess) {
      result.securityThreats.push('Plugin requires storage access but policy disallows it');
    }

    // Validate sandbox requirements
    if (options.sandboxEnabled && !this.isSandboxCompatible(plugin)) {
      result.securityThreats.push('Plugin is not compatible with sandbox environment');
    }

    // Check memory usage requirements
    if (plugin.capabilities.maxBatchSize * 1024 > options.maxMemoryUsage) {
      result.warnings.push('Plugin may exceed memory limits based on batch size');
      result.recommendedRestrictions.push('limit_memory_usage');
    }
  }

  /**
   * Validate author trust level
   */
  private validateAuthorTrust(plugin: AIProcessingPlugin, result: SecurityValidationResult): void {
    const { author } = plugin;

    if (this.trustedAuthors.has(author)) {
      result.warnings.push('Plugin from trusted author - reduced security restrictions');
      return;
    }

    // Check for suspicious author names
    if (this.isSuspiciousAuthor(author)) {
      result.warnings.push('Plugin author appears suspicious - enhanced monitoring recommended');
      result.recommendedRestrictions.push('enhanced_monitoring');
    }

    // First-time author warning
    result.warnings.push('Plugin from unverified author - standard security restrictions apply');
  }

  /**
   * Assess risk levels for requested permissions
   */
  private assessPermissionRisks(permissions: PluginPermission[], result: SecurityValidationResult): void {
    const highRiskPermissions = [
      PluginPermission.NETWORK_ACCESS,
      PluginPermission.STORAGE_ACCESS,
      PluginPermission.ACCESS_VAULT_METADATA
    ];

    const mediumRiskPermissions = [
      PluginPermission.MODIFY_DOCUMENTS,
      PluginPermission.USER_INTERFACE
    ];

    const highRiskCount = permissions.filter(p => highRiskPermissions.includes(p)).length;
    const mediumRiskCount = permissions.filter(p => mediumRiskPermissions.includes(p)).length;

    if (highRiskCount > 2) {
      result.warnings.push('Plugin requests multiple high-risk permissions');
      result.recommendedRestrictions.push('enhanced_monitoring', 'audit_trail');
    }

    if (highRiskCount + mediumRiskCount > 4) {
      result.warnings.push('Plugin requests elevated privilege level');
      result.recommendedRestrictions.push('user_confirmation_required');
    }
  }

  /**
   * Validate network access requirements
   */
  private validateNetworkAccess(
    plugin: AIProcessingPlugin, 
    options: PluginSecurityOptions, 
    result: SecurityValidationResult
  ): void {
    if (!options.allowNetworkAccess) {
      result.securityThreats.push('Network access requested but not allowed by security policy');
      return;
    }

    // Check for specific AI providers that require network access
    if (plugin.capabilities.aiProviders) {
      const externalProviders = plugin.capabilities.aiProviders.filter(provider => 
        !this.isLocalAIProvider(provider));
      
      if (externalProviders.length > 0) {
        result.warnings.push(`Plugin requires network access for external AI providers: ${externalProviders.join(', ')}`);
        result.recommendedRestrictions.push('monitor_network_traffic');
      }
    }

    result.recommendedRestrictions.push('firewall_rules', 'connection_logging');
  }

  /**
   * Validate storage access requirements
   */
  private validateStorageAccess(
    plugin: AIProcessingPlugin, 
    options: PluginSecurityOptions, 
    result: SecurityValidationResult
  ): void {
    if (!options.allowStorageAccess) {
      result.securityThreats.push('Storage access requested but not allowed by security policy');
      return;
    }

    result.recommendedRestrictions.push('limit_storage_scope', 'audit_file_access');
    result.warnings.push('Plugin can access local storage - ensure vault backup is current');
  }

  /**
   * Check if content contains suspicious patterns
   */
  private containsSuspiciousContent(content: string): boolean {
    const suspiciousPatterns = [
      /cryptocurrency|bitcoin|mining/i,
      /password|credential|token|secret/i,
      /malware|virus|trojan/i,
      /eval|execute|run|shell/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate repository URL format and safety
   */
  private isValidRepositoryUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const allowedHosts = ['github.com', 'gitlab.com', 'bitbucket.org'];
      return allowedHosts.some(host => parsed.hostname.endsWith(host));
    } catch {
      return false;
    }
  }

  /**
   * Check if AI provider appears suspicious
   */
  private isSuspiciousAIProvider(provider: string): boolean {
    const knownProviders = [
      'openai', 'anthropic', 'google', 'microsoft', 'meta',
      'cohere', 'huggingface', 'replicate', 'together'
    ];

    return !knownProviders.some(known => 
      provider.toLowerCase().includes(known));
  }

  /**
   * Check if code appears obfuscated
   */
  private appearsObfuscated(code: string): boolean {
    // Simple heuristics for code obfuscation
    const suspiciousPatterns = [
      /[a-zA-Z_$][a-zA-Z0-9_$]{50,}/,  // Extremely long variable names
      /\\x[0-9a-fA-F]{2}/,             // Hex escape sequences
      /\\u[0-9a-fA-F]{4}/,             // Unicode escape sequences
      /eval\s*\(\s*['"]/,              // eval with string
      /String\.fromCharCode/           // Character code conversion
    ];

    return suspiciousPatterns.some(pattern => pattern.test(code));
  }

  /**
   * Find external imports in code
   */
  private findExternalImports(code: string): string[] {
    const imports: string[] = [];
    const importPatterns = [
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];

    importPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        imports.push(match[1]);
      }
    });

    return imports.filter(imp => !imp.startsWith('.') && !imp.startsWith('/'));
  }

  /**
   * Check if author name appears suspicious
   */
  private isSuspiciousAuthor(author: string): boolean {
    const suspiciousPatterns = [
      /^[a-zA-Z0-9]{32,}$/,  // Random-looking long strings
      /test|temp|fake|anonymous/i,
      /admin|root|system/i,
      /[0-9]{5,}/             // Long sequences of numbers
    ];

    return suspiciousPatterns.some(pattern => pattern.test(author));
  }

  /**
   * Check if AI provider is local/offline
   */
  private isLocalAIProvider(provider: string): boolean {
    const localProviders = [
      'local', 'offline', 'llamacpp', 'ollama', 
      'transformers', 'tensorflow', 'pytorch'
    ];

    return localProviders.some(local => 
      provider.toLowerCase().includes(local));
  }

  /**
   * Check if plugin is compatible with sandbox environment
   */
  private isSandboxCompatible(plugin: AIProcessingPlugin): boolean {
    const incompatiblePermissions = [
      PluginPermission.NETWORK_ACCESS,
      PluginPermission.STORAGE_ACCESS
    ];

    // Plugin is sandbox compatible if it doesn't require incompatible permissions
    return !plugin.capabilities.requiredPermissions.some(permission =>
      incompatiblePermissions.includes(permission));
  }
}