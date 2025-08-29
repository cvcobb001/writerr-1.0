/**
 * Plugin Capability Validator
 * 
 * Validates and manages plugin capabilities for AI processing plugins,
 * ensuring they can perform the operations they claim to support.
 */

import { 
  AIProcessingPlugin,
  PluginCapabilities,
  EditorialOperationType 
} from '../types/submit-changes-from-ai';

import {
  IPluginCapabilityValidator,
  CapabilityValidationResult,
  DEFAULT_PLUGIN_CAPABILITIES
} from './plugin-interface';

/**
 * Validator for plugin capabilities with operation-specific validation
 */
export class PluginCapabilityValidator implements IPluginCapabilityValidator {
  private supportedEditorialOperations = new Set<string>([
    'replace', 'insert', 'delete', 'restructure', 'format', 'analyze', 
    'translate', 'summarize', 'expand', 'compress', 'correct', 'enhance'
  ]);

  private supportedAIProviders = new Set<string>([
    'openai', 'anthropic', 'google', 'microsoft', 'meta', 'cohere',
    'huggingface', 'replicate', 'together', 'local', 'ollama'
  ]);

  private supportedFileTypes = new Set<string>([
    'markdown', 'text', 'json', 'yaml', 'html', 'xml', 'csv'
  ]);

  /**
   * Validate plugin capabilities against requirements
   */
  async validateCapabilities(
    plugin: AIProcessingPlugin,
    requiredCapabilities: string[],
    context?: any
  ): Promise<CapabilityValidationResult> {
    const result: CapabilityValidationResult = {
      isValid: true,
      missingCapabilities: [],
      recommendedCapabilities: [],
      warnings: []
    };

    try {
      // Validate editorial operations
      await this.validateEditorialOperations(plugin, requiredCapabilities, result);

      // Validate AI provider support
      await this.validateAIProviderSupport(plugin, result);

      // Validate batch processing capabilities
      await this.validateBatchCapabilities(plugin, context, result);

      // Validate file type support
      await this.validateFileTypeSupport(plugin, context, result);

      // Validate real-time capabilities
      await this.validateRealTimeCapabilities(plugin, context, result);

      // Validate conversation context support
      await this.validateConversationContextSupport(plugin, context, result);

      // Generate recommendations
      this.generateCapabilityRecommendations(plugin, requiredCapabilities, result);

      // Final validation status
      result.isValid = result.missingCapabilities.length === 0;

      return result;

    } catch (error) {
      result.isValid = false;
      result.warnings.push(`Capability validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  /**
   * Get recommended capabilities for specific operation types
   */
  getRecommendedCapabilities(operationType: string): PluginCapabilities {
    // Return default capabilities based on operation type
    const defaultCapabilities = DEFAULT_PLUGIN_CAPABILITIES[operationType];
    
    if (defaultCapabilities) {
      return {
        editorialOperations: defaultCapabilities.editorialOperations || [],
        aiProviders: defaultCapabilities.aiProviders || [],
        maxBatchSize: defaultCapabilities.maxBatchSize || 10,
        supportsRealTime: defaultCapabilities.supportsRealTime || false,
        supportsConversationContext: defaultCapabilities.supportsConversationContext || false,
        supportedFileTypes: defaultCapabilities.supportedFileTypes || ['markdown'],
        requiredPermissions: defaultCapabilities.requiredPermissions || []
      };
    }

    // Return basic capabilities for unknown operation types
    return {
      editorialOperations: ['replace', 'insert'],
      aiProviders: ['openai'],
      maxBatchSize: 5,
      supportsRealTime: false,
      supportsConversationContext: false,
      supportedFileTypes: ['markdown'],
      requiredPermissions: []
    };
  }

  /**
   * Validate editorial operations capabilities
   */
  private async validateEditorialOperations(
    plugin: AIProcessingPlugin,
    requiredCapabilities: string[],
    result: CapabilityValidationResult
  ): Promise<void> {
    const { editorialOperations } = plugin.capabilities;

    // Check if plugin declares any editorial operations
    if (!editorialOperations || editorialOperations.length === 0) {
      result.warnings.push('Plugin declares no editorial operations');
      result.recommendedCapabilities.push('basic_text_editing');
      return;
    }

    // Validate each declared operation
    for (const operation of editorialOperations) {
      if (!this.supportedEditorialOperations.has(operation)) {
        result.warnings.push(`Unknown editorial operation: ${operation}`);
      }
    }

    // Check for required capabilities
    const missingOperations = requiredCapabilities.filter(capability => 
      this.isEditorialOperation(capability) && 
      !editorialOperations.includes(capability as EditorialOperationType)
    );

    result.missingCapabilities.push(...missingOperations);

    // Validate operation combinations
    this.validateOperationCombinations(editorialOperations, result);
  }

  /**
   * Validate AI provider support
   */
  private async validateAIProviderSupport(
    plugin: AIProcessingPlugin,
    result: CapabilityValidationResult
  ): Promise<void> {
    const { aiProviders } = plugin.capabilities;

    if (!aiProviders || aiProviders.length === 0) {
      result.warnings.push('Plugin declares no AI provider support - will use system default');
      return;
    }

    // Validate each declared provider
    for (const provider of aiProviders) {
      if (!this.supportedAIProviders.has(provider.toLowerCase())) {
        result.warnings.push(`Unrecognized AI provider: ${provider}`);
      }
    }

    // Check for provider-specific requirements
    this.validateProviderSpecificRequirements(aiProviders, result);
  }

  /**
   * Validate batch processing capabilities
   */
  private async validateBatchCapabilities(
    plugin: AIProcessingPlugin,
    context: any,
    result: CapabilityValidationResult
  ): Promise<void> {
    const { maxBatchSize } = plugin.capabilities;

    // Validate batch size limits
    if (maxBatchSize <= 0) {
      result.warnings.push('Plugin declares zero or negative batch size');
      return;
    }

    if (maxBatchSize > 1000) {
      result.warnings.push('Plugin declares very large batch size - may cause performance issues');
      result.recommendedCapabilities.push('streaming_support');
    }

    // Context-specific validation
    if (context?.expectedBatchSize && maxBatchSize < context.expectedBatchSize) {
      result.warnings.push(`Plugin batch size (${maxBatchSize}) is smaller than expected (${context.expectedBatchSize})`);
    }
  }

  /**
   * Validate file type support
   */
  private async validateFileTypeSupport(
    plugin: AIProcessingPlugin,
    context: any,
    result: CapabilityValidationResult
  ): Promise<void> {
    const { supportedFileTypes } = plugin.capabilities;

    if (!supportedFileTypes || supportedFileTypes.length === 0) {
      result.warnings.push('Plugin declares no file type support - assuming markdown only');
      return;
    }

    // Validate each declared file type
    for (const fileType of supportedFileTypes) {
      if (!this.supportedFileTypes.has(fileType.toLowerCase())) {
        result.warnings.push(`Unsupported file type: ${fileType}`);
      }
    }

    // Context-specific file type validation
    if (context?.requiredFileType) {
      const requiredType = context.requiredFileType.toLowerCase();
      if (!supportedFileTypes.some(type => type.toLowerCase() === requiredType)) {
        result.missingCapabilities.push(`file_type_${requiredType}`);
      }
    }
  }

  /**
   * Validate real-time processing capabilities
   */
  private async validateRealTimeCapabilities(
    plugin: AIProcessingPlugin,
    context: any,
    result: CapabilityValidationResult
  ): Promise<void> {
    const { supportsRealTime } = plugin.capabilities;

    if (context?.requiresRealTime && !supportsRealTime) {
      result.missingCapabilities.push('real_time_processing');
      result.recommendedCapabilities.push('streaming_api', 'incremental_updates');
    }

    if (supportsRealTime) {
      // Validate that plugin has appropriate permissions for real-time operations
      if (!plugin.capabilities.requiredPermissions.some(p => p.toString().includes('USER_INTERFACE'))) {
        result.warnings.push('Plugin claims real-time support but lacks UI permissions');
      }
    }
  }

  /**
   * Validate conversation context support
   */
  private async validateConversationContextSupport(
    plugin: AIProcessingPlugin,
    context: any,
    result: CapabilityValidationResult
  ): Promise<void> {
    const { supportsConversationContext } = plugin.capabilities;

    if (context?.requiresConversationContext && !supportsConversationContext) {
      result.missingCapabilities.push('conversation_context');
      result.recommendedCapabilities.push('session_management', 'context_tracking');
    }

    if (supportsConversationContext) {
      // Validate that plugin can handle session management
      if (!plugin.capabilities.editorialOperations.includes('analyze' as EditorialOperationType)) {
        result.warnings.push('Plugin supports conversation context but lacks analysis capabilities');
      }
    }
  }

  /**
   * Generate capability recommendations based on plugin configuration
   */
  private generateCapabilityRecommendations(
    plugin: AIProcessingPlugin,
    requiredCapabilities: string[],
    result: CapabilityValidationResult
  ): void {
    const capabilities = plugin.capabilities;

    // Recommend based on editorial operations
    if (capabilities.editorialOperations.includes('restructure' as EditorialOperationType)) {
      if (!capabilities.editorialOperations.includes('analyze' as EditorialOperationType)) {
        result.recommendedCapabilities.push('content_analysis');
      }
    }

    // Recommend based on batch size
    if (capabilities.maxBatchSize > 50) {
      if (!capabilities.supportsRealTime) {
        result.recommendedCapabilities.push('progress_reporting');
      }
    }

    // Recommend based on AI providers
    if (capabilities.aiProviders.includes('local') || capabilities.aiProviders.includes('ollama')) {
      result.recommendedCapabilities.push('offline_support');
    }

    // Recommend based on missing capabilities
    if (result.missingCapabilities.length > 0) {
      result.recommendedCapabilities.push('capability_extension_api');
    }
  }

  /**
   * Validate combinations of editorial operations
   */
  private validateOperationCombinations(
    operations: EditorialOperationType[],
    result: CapabilityValidationResult
  ): void {
    // Some operations require others
    const dependencies = new Map<string, string[]>([
      ['restructure', ['analyze']],
      ['enhance', ['analyze', 'format']],
      ['summarize', ['analyze']],
      ['translate', ['analyze']],
    ]);

    for (const operation of operations) {
      const requiredDeps = dependencies.get(operation);
      if (requiredDeps) {
        const missingDeps = requiredDeps.filter(dep => 
          !operations.includes(dep as EditorialOperationType));
        
        if (missingDeps.length > 0) {
          result.warnings.push(
            `Operation '${operation}' typically requires: ${missingDeps.join(', ')}`
          );
        }
      }
    }

    // Warn about potentially conflicting operations
    if (operations.includes('compress' as EditorialOperationType) && 
        operations.includes('expand' as EditorialOperationType)) {
      result.warnings.push('Plugin declares both compress and expand - ensure proper operation selection');
    }
  }

  /**
   * Validate provider-specific requirements
   */
  private validateProviderSpecificRequirements(
    providers: string[],
    result: CapabilityValidationResult
  ): void {
    // OpenAI-specific validation
    if (providers.includes('openai')) {
      result.recommendedCapabilities.push('api_key_management', 'rate_limit_handling');
    }

    // Anthropic-specific validation
    if (providers.includes('anthropic')) {
      result.recommendedCapabilities.push('message_format_handling');
    }

    // Local provider validation
    if (providers.includes('local') || providers.includes('ollama')) {
      result.recommendedCapabilities.push('model_management', 'offline_support');
    }

    // Multiple provider support
    if (providers.length > 3) {
      result.recommendedCapabilities.push('provider_switching', 'unified_api');
    }
  }

  /**
   * Check if a capability is an editorial operation
   */
  private isEditorialOperation(capability: string): boolean {
    return this.supportedEditorialOperations.has(capability);
  }

  /**
   * Get capability score for a plugin (0-100)
   */
  getCapabilityScore(plugin: AIProcessingPlugin): number {
    let score = 0;
    const capabilities = plugin.capabilities;

    // Score based on editorial operations (0-40 points)
    const operationScore = Math.min(40, capabilities.editorialOperations.length * 5);
    score += operationScore;

    // Score based on AI provider support (0-20 points)
    const providerScore = Math.min(20, capabilities.aiProviders.length * 4);
    score += providerScore;

    // Score based on batch size (0-15 points)
    const batchScore = Math.min(15, Math.log10(capabilities.maxBatchSize) * 5);
    score += batchScore;

    // Score based on advanced features (0-25 points)
    let featureScore = 0;
    if (capabilities.supportsRealTime) featureScore += 8;
    if (capabilities.supportsConversationContext) featureScore += 8;
    if (capabilities.supportedFileTypes.length > 2) featureScore += 9;
    score += featureScore;

    return Math.round(Math.min(100, score));
  }

  /**
   * Get compatibility matrix between plugins
   */
  getPluginCompatibilityMatrix(plugins: AIProcessingPlugin[]): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();

    for (let i = 0; i < plugins.length; i++) {
      const pluginA = plugins[i];
      const compatibilityMap = new Map<string, number>();

      for (let j = 0; j < plugins.length; j++) {
        if (i === j) continue;

        const pluginB = plugins[j];
        const compatibility = this.calculateCompatibilityScore(pluginA, pluginB);
        compatibilityMap.set(pluginB.id, compatibility);
      }

      matrix.set(pluginA.id, compatibilityMap);
    }

    return matrix;
  }

  /**
   * Calculate compatibility score between two plugins (0-100)
   */
  private calculateCompatibilityScore(pluginA: AIProcessingPlugin, pluginB: AIProcessingPlugin): number {
    let score = 0;

    // Editorial operations overlap (0-40 points)
    const operationsA = new Set(pluginA.capabilities.editorialOperations);
    const operationsB = new Set(pluginB.capabilities.editorialOperations);
    const operationOverlap = this.calculateSetOverlap(operationsA, operationsB);
    score += operationOverlap * 40;

    // AI provider overlap (0-25 points)
    const providersA = new Set(pluginA.capabilities.aiProviders);
    const providersB = new Set(pluginB.capabilities.aiProviders);
    const providerOverlap = this.calculateSetOverlap(providersA, providersB);
    score += providerOverlap * 25;

    // File type overlap (0-20 points)
    const fileTypesA = new Set(pluginA.capabilities.supportedFileTypes);
    const fileTypesB = new Set(pluginB.capabilities.supportedFileTypes);
    const fileTypeOverlap = this.calculateSetOverlap(fileTypesA, fileTypesB);
    score += fileTypeOverlap * 20;

    // Feature compatibility (0-15 points)
    let featureScore = 0;
    if (pluginA.capabilities.supportsRealTime === pluginB.capabilities.supportsRealTime) {
      featureScore += 7;
    }
    if (pluginA.capabilities.supportsConversationContext === pluginB.capabilities.supportsConversationContext) {
      featureScore += 8;
    }
    score += featureScore;

    return Math.round(Math.min(100, score));
  }

  /**
   * Calculate overlap ratio between two sets
   */
  private calculateSetOverlap<T>(setA: Set<T>, setB: Set<T>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}