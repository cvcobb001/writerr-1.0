/**
 * @fileoverview Security validation for Track Edits data persistence and state management
 */

import { InputSanitizer, ValidationResult } from '@writerr/shared/security/InputSanitizer';

export interface EditDataValidation {
  isValid: boolean;
  sanitizedData: any;
  violations: DataSecurityViolation[];
  riskScore: number;
  dataSize: number;
}

export interface DataSecurityViolation {
  type: 'data-injection' | 'state-corruption' | 'size-limit' | 'sensitive-data' | 'deserialization' | 'memory-bomb';
  severity: 'low' | 'medium' | 'high' | 'critical';
  field: string;
  description: string;
  originalValue: string;
  position?: number;
}

export interface StateSecurityConfig {
  maxEditHistorySize: number;
  maxIndividualEditSize: number;
  maxStateDepth: number;
  enableDataSanitization: boolean;
  enableSensitiveDataDetection: boolean;
  allowedDataTypes: string[];
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export class DataValidator {
  private static readonly DEFAULT_CONFIG: StateSecurityConfig = {
    maxEditHistorySize: 10 * 1024 * 1024, // 10MB
    maxIndividualEditSize: 1024 * 1024,    // 1MB per edit
    maxStateDepth: 50,                      // Maximum nesting level
    enableDataSanitization: true,
    enableSensitiveDataDetection: true,
    allowedDataTypes: ['string', 'number', 'boolean', 'object', 'array'],
    compressionEnabled: true,
    encryptionEnabled: false
  };

  private static readonly SENSITIVE_DATA_PATTERNS = [
    // API Keys and tokens
    { pattern: /sk-[a-zA-Z0-9]{48}/, name: 'OpenAI API Key', severity: 'critical' as const },
    { pattern: /AIza[0-9A-Za-z\\-_]{35}/, name: 'Google API Key', severity: 'critical' as const },
    { pattern: /AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}/, name: 'Anthropic API Key', severity: 'critical' as const },
    { pattern: /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/, name: 'Slack Bot Token', severity: 'high' as const },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Personal Access Token', severity: 'high' as const },
    { pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/, name: 'Bearer Token', severity: 'high' as const },
    
    // Passwords and credentials
    { pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/, name: 'Password Field', severity: 'high' as const },
    { pattern: /passwd\s*[:=]\s*['"][^'"]{8,}['"]/, name: 'Password Field', severity: 'high' as const },
    { pattern: /secret\s*[:=]\s*['"][^'"]{8,}['"]/, name: 'Secret Field', severity: 'high' as const },
    { pattern: /credential\s*[:=]\s*['"][^'"]{8,}['"]/, name: 'Credential Field', severity: 'high' as const },
    
    // Personal information
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/, name: 'Social Security Number', severity: 'high' as const },
    { pattern: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, name: 'Credit Card Number', severity: 'high' as const },
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, name: 'Email Address', severity: 'medium' as const },
    { pattern: /\b\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/, name: 'Phone Number', severity: 'medium' as const },
    
    // File paths that might be sensitive
    { pattern: /\/home\/[^\/\s]+\/\.ssh\//, name: 'SSH Directory Path', severity: 'medium' as const },
    { pattern: /[C-Z]:\\Users\\[^\\]+\\Documents\\/, name: 'Personal Documents Path', severity: 'low' as const },
    { pattern: /\/Users\/[^\/\s]+\/Desktop\//, name: 'Desktop Path', severity: 'low' as const },
    
    // Database connection strings
    { pattern: /mongodb:\/\/[^@]+:[^@]+@/, name: 'MongoDB Connection String', severity: 'high' as const },
    { pattern: /postgres:\/\/[^@]+:[^@]+@/, name: 'PostgreSQL Connection String', severity: 'high' as const },
    { pattern: /mysql:\/\/[^@]+:[^@]+@/, name: 'MySQL Connection String', severity: 'high' as const }
  ];

  private config: StateSecurityConfig;

  constructor(config: Partial<StateSecurityConfig> = {}) {
    this.config = { ...DataValidator.DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate edit data before persistence
   */
  validateEditData(editData: any): EditDataValidation {
    const violations: DataSecurityViolation[] = [];
    let sanitizedData = editData;
    let riskScore = 0;

    // Calculate data size
    const dataSize = this.calculateDataSize(editData);

    // Size validation
    if (dataSize > this.config.maxIndividualEditSize) {
      violations.push({
        type: 'size-limit',
        severity: 'high',
        field: 'root',
        description: `Edit data exceeds size limit: ${dataSize} bytes > ${this.config.maxIndividualEditSize} bytes`,
        originalValue: `${dataSize} bytes`
      });
      riskScore += 30;
    }

    // Structure validation
    const structureViolations = this.validateDataStructure(editData);
    violations.push(...structureViolations);
    riskScore += structureViolations.length * 15;

    // Content validation
    if (this.config.enableDataSanitization) {
      const contentValidation = this.validateEditContent(editData);
      violations.push(...contentValidation.violations);
      sanitizedData = contentValidation.sanitizedData;
      riskScore += contentValidation.riskScore;
    }

    // Sensitive data detection
    if (this.config.enableSensitiveDataDetection) {
      const sensitiveViolations = this.detectSensitiveData(editData);
      violations.push(...sensitiveViolations);
      riskScore += sensitiveViolations.filter(v => v.severity === 'critical').length * 40;
      riskScore += sensitiveViolations.filter(v => v.severity === 'high').length * 25;
    }

    // State corruption detection
    const corruptionViolations = this.detectStateCorruption(editData);
    violations.push(...corruptionViolations);
    riskScore += corruptionViolations.length * 20;

    const isValid = violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0;

    return {
      isValid,
      sanitizedData,
      violations,
      riskScore: Math.min(riskScore, 100),
      dataSize
    };
  }

  /**
   * Validate complete edit history for security
   */
  validateEditHistory(history: any[]): {
    isValid: boolean;
    sanitizedHistory: any[];
    violations: DataSecurityViolation[];
    totalSize: number;
    recommendations: string[];
  } {
    const violations: DataSecurityViolation[] = [];
    const sanitizedHistory: any[] = [];
    let totalSize = 0;

    // Validate each edit in history
    history.forEach((edit, index) => {
      const validation = this.validateEditData(edit);
      sanitizedHistory.push(validation.sanitizedData);
      totalSize += validation.dataSize;

      // Prefix violations with edit index
      const indexedViolations = validation.violations.map(violation => ({
        ...violation,
        field: `edit[${index}].${violation.field}`,
        description: `Edit ${index}: ${violation.description}`
      }));
      violations.push(...indexedViolations);
    });

    // Check total history size
    if (totalSize > this.config.maxEditHistorySize) {
      violations.push({
        type: 'size-limit',
        severity: 'medium',
        field: 'history',
        description: `Edit history exceeds size limit: ${totalSize} bytes > ${this.config.maxEditHistorySize} bytes`,
        originalValue: `${history.length} edits, ${totalSize} bytes`
      });
    }

    // Check for patterns across history that might indicate attacks
    const patternViolations = this.detectHistoryPatterns(history);
    violations.push(...patternViolations);

    const recommendations = this.generateRecommendations(violations);
    const isValid = violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0;

    return {
      isValid,
      sanitizedHistory,
      violations,
      totalSize,
      recommendations
    };
  }

  /**
   * Validate data structure for security issues
   */
  private validateDataStructure(data: any, path = 'root', depth = 0): DataSecurityViolation[] {
    const violations: DataSecurityViolation[] = [];

    // Check nesting depth
    if (depth > this.config.maxStateDepth) {
      violations.push({
        type: 'memory-bomb',
        severity: 'high',
        field: path,
        description: `Data structure too deeply nested: depth ${depth} > ${this.config.maxStateDepth}`,
        originalValue: `depth: ${depth}`
      });
      return violations; // Don't continue deeper
    }

    // Check data type
    const dataType = Array.isArray(data) ? 'array' : typeof data;
    if (!this.config.allowedDataTypes.includes(dataType)) {
      violations.push({
        type: 'data-injection',
        severity: 'medium',
        field: path,
        description: `Disallowed data type: ${dataType}`,
        originalValue: String(data).substring(0, 100)
      });
    }

    // Recursively validate nested structures
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        // Check array length for potential memory bombs
        if (data.length > 10000) {
          violations.push({
            type: 'memory-bomb',
            severity: 'medium',
            field: path,
            description: `Array too large: ${data.length} elements`,
            originalValue: `${data.length} elements`
          });
        }

        data.forEach((item, index) => {
          const itemViolations = this.validateDataStructure(item, `${path}[${index}]`, depth + 1);
          violations.push(...itemViolations);
        });
      } else {
        // Check object properties
        const keys = Object.keys(data);
        if (keys.length > 1000) {
          violations.push({
            type: 'memory-bomb',
            severity: 'medium',
            field: path,
            description: `Object has too many properties: ${keys.length}`,
            originalValue: `${keys.length} properties`
          });
        }

        // Check for prototype pollution attempts
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
        dangerousKeys.forEach(key => {
          if (keys.includes(key)) {
            violations.push({
              type: 'state-corruption',
              severity: 'critical',
              field: `${path}.${key}`,
              description: `Dangerous property name detected: ${key}`,
              originalValue: key
            });
          }
        });

        // Recursively validate properties
        keys.forEach(key => {
          const propViolations = this.validateDataStructure(data[key], `${path}.${key}`, depth + 1);
          violations.push(...propViolations);
        });
      }
    }

    return violations;
  }

  /**
   * Validate edit content for security issues
   */
  private validateEditContent(data: any): { violations: DataSecurityViolation[]; sanitizedData: any; riskScore: number } {
    const violations: DataSecurityViolation[] = [];
    let sanitizedData = data;
    let riskScore = 0;

    if (data && typeof data === 'object') {
      sanitizedData = this.sanitizeDataRecursively(data, violations);
      riskScore = violations.length * 10;
    }

    return { violations, sanitizedData, riskScore };
  }

  /**
   * Recursively sanitize data structure
   */
  private sanitizeDataRecursively(data: any, violations: DataSecurityViolation[], path = 'root'): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Sanitize string content
      const validation = InputSanitizer.sanitize(data, { 
        contextType: 'user-input',
        maxLength: 50000 
      });
      
      if (!validation.isValid) {
        validation.violations.forEach(violation => {
          violations.push({
            type: 'data-injection',
            severity: violation.severity,
            field: path,
            description: `String content: ${violation.description}`,
            originalValue: violation.originalValue
          });
        });
      }
      
      return validation.sanitizedValue;
    }

    if (Array.isArray(data)) {
      return data.map((item, index) => 
        this.sanitizeDataRecursively(item, violations, `${path}[${index}]`)
      );
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Skip dangerous keys
        if (['__proto__', 'constructor', 'prototype'].includes(key)) {
          violations.push({
            type: 'state-corruption',
            severity: 'critical',
            field: `${path}.${key}`,
            description: `Removed dangerous property: ${key}`,
            originalValue: String(value)
          });
          continue;
        }

        sanitized[key] = this.sanitizeDataRecursively(value, violations, `${path}.${key}`);
      }
      
      return sanitized;
    }

    return data;
  }

  /**
   * Detect sensitive data in edit content
   */
  private detectSensitiveData(data: any, path = 'root'): DataSecurityViolation[] {
    const violations: DataSecurityViolation[] = [];

    if (typeof data === 'string') {
      // Check against sensitive data patterns
      DataValidator.SENSITIVE_DATA_PATTERNS.forEach(({ pattern, name, severity }) => {
        const matches = data.match(pattern);
        if (matches) {
          matches.forEach(match => {
            violations.push({
              type: 'sensitive-data',
              severity,
              field: path,
              description: `Sensitive data detected: ${name}`,
              originalValue: match.substring(0, 20) + '...',
              position: data.indexOf(match)
            });
          });
        }
      });
    } else if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const itemViolations = this.detectSensitiveData(item, `${path}[${index}]`);
        violations.push(...itemViolations);
      });
    } else if (data && typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        // Check if key name suggests sensitive data
        const sensitiveKeyPatterns = [
          'password', 'passwd', 'pwd', 'secret', 'token', 'key', 'credential',
          'auth', 'authorization', 'bearer', 'apikey', 'api_key'
        ];
        
        if (sensitiveKeyPatterns.some(pattern => key.toLowerCase().includes(pattern))) {
          violations.push({
            type: 'sensitive-data',
            severity: 'medium',
            field: `${path}.${key}`,
            description: `Field name suggests sensitive data: ${key}`,
            originalValue: key
          });
        }

        const valueViolations = this.detectSensitiveData(value, `${path}.${key}`);
        violations.push(...valueViolations);
      });
    }

    return violations;
  }

  /**
   * Detect potential state corruption attempts
   */
  private detectStateCorruption(data: any): DataSecurityViolation[] {
    const violations: DataSecurityViolation[] = [];

    // Check for circular references (simplified check)
    try {
      JSON.stringify(data);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('circular')) {
        violations.push({
          type: 'state-corruption',
          severity: 'high',
          field: 'root',
          description: 'Circular reference detected in data structure',
          originalValue: 'circular reference'
        });
      }
    }

    // Check for function objects (shouldn't be in edit data)
    const functions = this.findFunctions(data);
    functions.forEach(path => {
      violations.push({
        type: 'state-corruption',
        severity: 'high',
        field: path,
        description: 'Function object found in edit data',
        originalValue: 'function'
      });
    });

    return violations;
  }

  /**
   * Find function objects in data structure
   */
  private findFunctions(data: any, path = 'root'): string[] {
    const functions: string[] = [];

    if (typeof data === 'function') {
      functions.push(path);
    } else if (Array.isArray(data)) {
      data.forEach((item, index) => {
        functions.push(...this.findFunctions(item, `${path}[${index}]`));
      });
    } else if (data && typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        functions.push(...this.findFunctions(value, `${path}.${key}`));
      });
    }

    return functions;
  }

  /**
   * Detect suspicious patterns across edit history
   */
  private detectHistoryPatterns(history: any[]): DataSecurityViolation[] {
    const violations: DataSecurityViolation[] = [];

    // Check for rapid-fire edits (potential DoS)
    if (history.length > 1000) {
      violations.push({
        type: 'memory-bomb',
        severity: 'medium',
        field: 'history',
        description: `Too many edits in history: ${history.length}`,
        originalValue: `${history.length} edits`
      });
    }

    // Check for identical edits (potential replay attack)
    const editHashes = new Set();
    const duplicates = history.filter(edit => {
      const hash = this.hashObject(edit);
      if (editHashes.has(hash)) {
        return true;
      }
      editHashes.add(hash);
      return false;
    });

    if (duplicates.length > 10) {
      violations.push({
        type: 'state-corruption',
        severity: 'medium',
        field: 'history',
        description: `Too many duplicate edits detected: ${duplicates.length}`,
        originalValue: `${duplicates.length} duplicates`
      });
    }

    return violations;
  }

  /**
   * Calculate the size of data in bytes
   */
  private calculateDataSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  /**
   * Generate a hash for an object
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(violations: DataSecurityViolation[]): string[] {
    const recommendations: string[] = [];
    const violationTypes = new Set(violations.map(v => v.type));

    if (violationTypes.has('sensitive-data')) {
      recommendations.push('Enable data sanitization to automatically remove sensitive information');
      recommendations.push('Implement field-level encryption for sensitive data');
      recommendations.push('Consider excluding sensitive content from edit tracking');
    }

    if (violationTypes.has('size-limit')) {
      recommendations.push('Implement data compression to reduce storage size');
      recommendations.push('Consider purging old edit history to stay within limits');
      recommendations.push('Break large edits into smaller chunks');
    }

    if (violationTypes.has('state-corruption')) {
      recommendations.push('Implement data integrity checks before persistence');
      recommendations.push('Use schema validation to ensure data consistency');
      recommendations.push('Monitor for unusual edit patterns');
    }

    if (violationTypes.has('memory-bomb')) {
      recommendations.push('Implement strict limits on data structure depth and size');
      recommendations.push('Use streaming processing for large datasets');
      recommendations.push('Monitor memory usage during data processing');
    }

    if (violationTypes.has('data-injection')) {
      recommendations.push('Enable comprehensive input sanitization');
      recommendations.push('Validate all user-provided data before storage');
      recommendations.push('Use parameterized queries and safe serialization');
    }

    return [...new Set(recommendations)];
  }

  /**
   * Update security configuration
   */
  updateConfig(config: Partial<StateSecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current security configuration
   */
  getConfig(): StateSecurityConfig {
    return { ...this.config };
  }

  /**
   * Generate comprehensive security report
   */
  generateSecurityReport(validations: EditDataValidation[]): string {
    const totalEdits = validations.length;
    const validEdits = validations.filter(v => v.isValid).length;
    const invalidEdits = totalEdits - validEdits;
    const totalSize = validations.reduce((sum, v) => sum + v.dataSize, 0);
    const averageRiskScore = validations.reduce((sum, v) => sum + v.riskScore, 0) / totalEdits;

    const violationsByType = validations
      .flatMap(v => v.violations)
      .reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const violationsBySeverity = validations
      .flatMap(v => v.violations)
      .reduce((acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return `# Track Edits Data Security Report

## Summary
- Total Edits Validated: ${totalEdits}
- Valid Edits: ${validEdits} (${((validEdits/totalEdits)*100).toFixed(1)}%)
- Invalid Edits: ${invalidEdits} (${((invalidEdits/totalEdits)*100).toFixed(1)}%)
- Total Data Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB
- Average Risk Score: ${averageRiskScore.toFixed(1)}/100

## Security Configuration
- Max Edit Size: ${(this.config.maxIndividualEditSize / 1024 / 1024).toFixed(2)} MB
- Max History Size: ${(this.config.maxEditHistorySize / 1024 / 1024).toFixed(2)} MB
- Max State Depth: ${this.config.maxStateDepth}
- Data Sanitization: ${this.config.enableDataSanitization ? 'Enabled' : 'Disabled'}
- Sensitive Data Detection: ${this.config.enableSensitiveDataDetection ? 'Enabled' : 'Disabled'}
- Compression: ${this.config.compressionEnabled ? 'Enabled' : 'Disabled'}
- Encryption: ${this.config.encryptionEnabled ? 'Enabled' : 'Disabled'}

## Violations by Type
${Object.entries(violationsByType).map(([type, count]) => 
  `- ${type.replace('-', ' ')}: ${count}`
).join('\n')}

## Violations by Severity  
${Object.entries(violationsBySeverity).map(([severity, count]) => 
  `- ${severity.toUpperCase()}: ${count}`
).join('\n')}

## Data Quality Metrics
- Average Edit Size: ${(totalSize / totalEdits / 1024).toFixed(2)} KB
- Largest Edit: ${Math.max(...validations.map(v => v.dataSize / 1024)).toFixed(2)} KB
- Smallest Edit: ${Math.min(...validations.map(v => v.dataSize / 1024)).toFixed(2)} KB

## Recommendations
${invalidEdits > 0 ? 
  `- Review and sanitize ${invalidEdits} invalid edits
- Implement stricter validation for high-risk data types
- Consider enabling additional security features
- Monitor for patterns in security violations` : 
  '- All edit data passed validation
- Continue monitoring for new security threats
- Consider periodic security audits of stored data'}

---

*Generated on ${new Date().toISOString()}*`;
  }
}