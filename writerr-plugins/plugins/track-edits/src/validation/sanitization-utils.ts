/**
 * Sanitization utilities for AI metadata security
 * Provides comprehensive string cleaning and data validation utilities
 * to prevent XSS, injection attacks, and data corruption
 */

export interface SanitizationOptions {
  maxLength?: number;
  preserveNewlines?: boolean;
  allowBasicFormatting?: boolean;
  strictMode?: boolean;
}

export class SanitizationUtils {
  // Known malicious patterns for security detection
  private static readonly SCRIPT_PATTERNS = [
    /<script[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?<\/iframe>/gi,
    /<object[\s\S]*?<\/object>/gi,
    /<embed[\s\S]*?>/gi,
    /<form[\s\S]*?<\/form>/gi,
    /<input[\s\S]*?>/gi,
    /<textarea[\s\S]*?<\/textarea>/gi,
    /<select[\s\S]*?<\/select>/gi
  ];

  private static readonly PROTOCOL_PATTERNS = [
    /javascript:/gi,
    /data:/gi,
    /vbscript:/gi,
    /livescript:/gi,
    /mocha:/gi,
    /file:/gi
  ];

  private static readonly EVENT_ATTRIBUTES = [
    /on\w+\s*=/gi
  ];

  // Control characters to remove (except allowed whitespace)
  private static readonly CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

  /**
   * Sanitizes a string by removing dangerous content and limiting length
   */
  static sanitizeString(
    input: string, 
    options: SanitizationOptions = {}
  ): string {
    if (typeof input !== 'string') {
      return '';
    }

    const {
      maxLength = 10000,
      preserveNewlines = true,
      allowBasicFormatting = false,
      strictMode = true
    } = options;

    let sanitized = input;

    // Remove null bytes and control characters
    sanitized = sanitized.replace(this.CONTROL_CHARS, '');

    // Remove script tags and dangerous elements
    for (const pattern of this.SCRIPT_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove dangerous protocols
    for (const pattern of this.PROTOCOL_PATTERNS) {
      sanitized = sanitized.replace(pattern, 'removed:');
    }

    // Remove event attributes
    for (const pattern of this.EVENT_ATTRIBUTES) {
      sanitized = sanitized.replace(pattern, '');
    }

    // In strict mode, remove all HTML tags
    if (strictMode) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    } else if (!allowBasicFormatting) {
      // Remove dangerous HTML but allow basic formatting
      sanitized = sanitized.replace(/<(?!\/?(b|i|em|strong|u|br|p)\b)[^>]*>/gi, '');
    }

    // Normalize whitespace
    if (!preserveNewlines) {
      sanitized = sanitized.replace(/\s+/g, ' ');
    } else {
      // Normalize spaces but preserve line breaks
      sanitized = sanitized.replace(/[ \t]+/g, ' ');
      sanitized = sanitized.replace(/\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
    }

    // Trim whitespace
    sanitized = sanitized.trim();

    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = this.truncateWithEllipsis(sanitized, maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitizes an array of strings (used for constraints)
   */
  static sanitizeStringArray(
    input: string[], 
    maxItems: number = 50,
    maxItemLength: number = 500
  ): string[] {
    if (!Array.isArray(input)) {
      return [];
    }

    // Limit array size
    const limited = input.slice(0, maxItems);

    // Sanitize each item
    return limited
      .map(item => this.sanitizeString(item, { 
        maxLength: maxItemLength,
        strictMode: true,
        preserveNewlines: false
      }))
      .filter(item => item.length > 0); // Remove empty strings
  }

  /**
   * Truncates a string and adds ellipsis, trying to preserve word boundaries
   */
  static truncateWithEllipsis(input: string, maxLength: number): string {
    if (input.length <= maxLength) {
      return input;
    }

    // Try to break at word boundary
    const truncated = input.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) { // Only break at word if we don't lose too much
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Validates and sanitizes a provider name
   */
  static sanitizeAIProvider(provider: string): string {
    if (typeof provider !== 'string') {
      return '';
    }

    // Remove all non-alphanumeric characters except hyphens, underscores, and dots
    let sanitized = provider.replace(/[^a-zA-Z0-9\-_.]/g, '');
    
    // Limit length
    sanitized = sanitized.substring(0, 100);
    
    // Trim any trailing/leading special chars
    sanitized = sanitized.replace(/^[\-_.]+|[\-_.]+$/g, '');
    
    return sanitized;
  }

  /**
   * Validates and sanitizes a model name
   */
  static sanitizeAIModel(model: string): string {
    if (typeof model !== 'string') {
      return '';
    }

    // Allow alphanumeric, hyphens, underscores, dots, colons, and slashes for model versions
    let sanitized = model.replace(/[^a-zA-Z0-9\-_.:\/]/g, '');
    
    // Limit length
    sanitized = sanitized.substring(0, 200);
    
    // Trim any trailing/leading special chars
    sanitized = sanitized.replace(/^[\-_.:\/]+|[\-_.:\/]+$/g, '');
    
    return sanitized;
  }

  /**
   * Sanitizes a mode string
   */
  static sanitizeMode(mode: string): string {
    if (typeof mode !== 'string') {
      return '';
    }

    // Allow only alphanumeric, hyphens, and underscores
    let sanitized = mode.replace(/[^a-zA-Z0-9\-_]/g, '');
    
    // Limit length
    sanitized = sanitized.substring(0, 100);
    
    // Convert to lowercase for consistency
    sanitized = sanitized.toLowerCase();
    
    return sanitized;
  }

  /**
   * Validates that a timestamp is reasonable
   */
  static validateTimestamp(timestamp: Date | string | undefined): Date | null {
    if (!timestamp) {
      return null;
    }

    let date: Date;
    
    try {
      if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
    } catch (error) {
      return null;
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60000); // Allow 1 minute clock skew
    const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

    // Reject future dates (with small tolerance) or very old dates
    if (date > oneMinuteFromNow || date < oneYearAgo) {
      return null;
    }

    return date;
  }

  /**
   * Calculates the serialized size of an object for storage limits
   */
  static calculateSerializedSize(obj: any): number {
    try {
      return JSON.stringify(obj).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Deep clones and sanitizes nested objects to prevent prototype pollution
   */
  static sanitizeObject(obj: any, maxDepth: number = 10): any {
    if (maxDepth <= 0) {
      return null;
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, maxDepth - 1));
    }

    // Create new object without prototype chain to prevent pollution
    const sanitized: any = Object.create(null);
    
    for (const key in obj) {
      // Skip prototype properties and dangerous keys
      if (obj.hasOwnProperty(key) && !this.isDangerousKey(key)) {
        sanitized[key] = this.sanitizeObject(obj[key], maxDepth - 1);
      }
    }

    return sanitized;
  }

  /**
   * Checks for dangerous object keys that could cause prototype pollution
   */
  private static isDangerousKey(key: string): boolean {
    const dangerous = [
      '__proto__',
      'constructor',
      'prototype',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__'
    ];
    
    return dangerous.includes(key);
  }

  /**
   * Detects potential security threats in input strings
   */
  static detectSecurityThreats(input: string): string[] {
    const threats: string[] = [];
    
    if (typeof input !== 'string') {
      return threats;
    }

    // Check for script patterns
    for (const pattern of this.SCRIPT_PATTERNS) {
      if (pattern.test(input)) {
        threats.push('script_injection');
        break;
      }
    }

    // Check for dangerous protocols
    for (const pattern of this.PROTOCOL_PATTERNS) {
      if (pattern.test(input)) {
        threats.push('dangerous_protocol');
        break;
      }
    }

    // Check for event handlers
    for (const pattern of this.EVENT_ATTRIBUTES) {
      if (pattern.test(input)) {
        threats.push('event_handler');
        break;
      }
    }

    // Check for control characters
    if (this.CONTROL_CHARS.test(input)) {
      threats.push('control_characters');
    }

    // Check for extremely long strings that could cause DoS
    if (input.length > 100000) {
      threats.push('excessive_length');
    }

    return threats;
  }
}