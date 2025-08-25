/**
 * @fileoverview Compression utilities for efficient data storage
 */

import { CompressionOptions, CompressionResult, CompressionAlgorithm } from './types';

export class CompressionUtils {
  private static readonly DEFAULT_COMPRESSION_LEVEL = 6;
  private static readonly DEFAULT_THRESHOLD = 1024; // 1KB

  /**
   * Compress data using specified algorithm
   */
  static async compress(data: string, options: Partial<CompressionOptions> = {}): Promise<CompressionResult> {
    const startTime = performance.now();
    const originalSize = new TextEncoder().encode(data).length;

    if (originalSize < (options.threshold || this.DEFAULT_THRESHOLD)) {
      return {
        originalSize,
        compressedSize: originalSize,
        ratio: 1.0,
        algorithm: CompressionAlgorithm.GZIP,
        timestamp: Date.now()
      };
    }

    const algorithm = options.algorithm || CompressionAlgorithm.GZIP;
    const level = options.level || this.DEFAULT_COMPRESSION_LEVEL;

    let compressedData: string;
    
    try {
      switch (algorithm) {
        case CompressionAlgorithm.GZIP:
          compressedData = await this.compressGzip(data, level);
          break;
        case CompressionAlgorithm.LZ4:
          compressedData = await this.compressLZ4(data);
          break;
        case CompressionAlgorithm.BROTLI:
          compressedData = await this.compressBrotli(data, level);
          break;
        case CompressionAlgorithm.ZSTD:
          compressedData = await this.compressZstd(data, level);
          break;
        default:
          throw new Error(`Unsupported compression algorithm: ${algorithm}`);
      }

      const compressedSize = new TextEncoder().encode(compressedData).length;
      const ratio = compressedSize / originalSize;

      return {
        originalSize,
        compressedSize,
        ratio,
        algorithm,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Compression failed: ${error.message}`);
    }
  }

  /**
   * Decompress data using specified algorithm
   */
  static async decompress(compressedData: string, algorithm: CompressionAlgorithm): Promise<string> {
    try {
      switch (algorithm) {
        case CompressionAlgorithm.GZIP:
          return await this.decompressGzip(compressedData);
        case CompressionAlgorithm.LZ4:
          return await this.decompressLZ4(compressedData);
        case CompressionAlgorithm.BROTLI:
          return await this.decompressBrotli(compressedData);
        case CompressionAlgorithm.ZSTD:
          return await this.decompressZstd(compressedData);
        default:
          throw new Error(`Unsupported compression algorithm: ${algorithm}`);
      }
    } catch (error) {
      throw new Error(`Decompression failed: ${error.message}`);
    }
  }

  /**
   * Compress large data in chunks
   */
  static async compressChunked(data: string, options: Partial<CompressionOptions> = {}): Promise<{
    chunks: string[];
    metadata: CompressionResult;
  }> {
    const chunkSize = options.chunkSize || 65536; // 64KB chunks
    const chunks: string[] = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const result = await this.compress(chunk, options);
      
      chunks.push(this.encodeChunk(chunk, result));
      totalOriginalSize += result.originalSize;
      totalCompressedSize += result.compressedSize;
    }

    return {
      chunks,
      metadata: {
        originalSize: totalOriginalSize,
        compressedSize: totalCompressedSize,
        ratio: totalCompressedSize / totalOriginalSize,
        algorithm: options.algorithm || CompressionAlgorithm.GZIP,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Decompress chunked data
   */
  static async decompressChunked(chunks: string[], algorithm: CompressionAlgorithm): Promise<string> {
    let result = '';

    for (const chunk of chunks) {
      const decodedChunk = this.decodeChunk(chunk);
      const decompressed = await this.decompress(decodedChunk, algorithm);
      result += decompressed;
    }

    return result;
  }

  /**
   * Calculate compression ratio for data without actually compressing
   */
  static estimateCompressionRatio(data: string, algorithm: CompressionAlgorithm = CompressionAlgorithm.GZIP): number {
    // Estimate based on entropy and patterns
    const entropy = this.calculateEntropy(data);
    const repetitionFactor = this.calculateRepetitionFactor(data);
    
    // Rough estimates for different algorithms
    switch (algorithm) {
      case CompressionAlgorithm.GZIP:
        return Math.max(0.1, entropy - (repetitionFactor * 0.3));
      case CompressionAlgorithm.LZ4:
        return Math.max(0.2, entropy - (repetitionFactor * 0.2));
      case CompressionAlgorithm.BROTLI:
        return Math.max(0.05, entropy - (repetitionFactor * 0.4));
      case CompressionAlgorithm.ZSTD:
        return Math.max(0.08, entropy - (repetitionFactor * 0.35));
      default:
        return 1.0;
    }
  }

  /**
   * Adaptive compression - choose best algorithm for data
   */
  static async adaptiveCompress(data: string, options: Partial<CompressionOptions> = {}): Promise<{
    data: string;
    result: CompressionResult;
  }> {
    const algorithms = [
      CompressionAlgorithm.GZIP,
      CompressionAlgorithm.LZ4,
      CompressionAlgorithm.BROTLI
    ];

    let bestResult: CompressionResult | null = null;
    let bestData: string = '';

    for (const algorithm of algorithms) {
      try {
        const testOptions = { ...options, algorithm };
        const result = await this.compress(data, testOptions);

        if (!bestResult || result.ratio < bestResult.ratio) {
          bestResult = result;
          // In a real implementation, we'd store the compressed data
          bestData = data; // Placeholder
        }
      } catch (error) {
        // Continue with next algorithm if one fails
        continue;
      }
    }

    if (!bestResult) {
      throw new Error('All compression algorithms failed');
    }

    return {
      data: bestData,
      result: bestResult
    };
  }

  // Compression implementations (simplified - real implementations would use actual libraries)

  private static async compressGzip(data: string, level: number): Promise<string> {
    // In a real implementation, this would use pako or similar library
    // For now, we'll simulate compression
    return this.simulateCompression(data, 0.6); // ~60% compression ratio for gzip
  }

  private static async decompressGzip(data: string): Promise<string> {
    // In a real implementation, this would use pako or similar library
    return this.simulateDecompression(data);
  }

  private static async compressLZ4(data: string): Promise<string> {
    // In a real implementation, this would use lz4 library
    return this.simulateCompression(data, 0.75); // ~75% compression ratio for LZ4 (faster but less compression)
  }

  private static async decompressLZ4(data: string): Promise<string> {
    return this.simulateDecompression(data);
  }

  private static async compressBrotli(data: string, level: number): Promise<string> {
    // In a real implementation, this would use brotli library
    return this.simulateCompression(data, 0.5); // ~50% compression ratio for brotli (best compression)
  }

  private static async decompressBrotli(data: string): Promise<string> {
    return this.simulateDecompression(data);
  }

  private static async compressZstd(data: string, level: number): Promise<string> {
    // In a real implementation, this would use zstd library
    return this.simulateCompression(data, 0.55); // ~55% compression ratio for zstd
  }

  private static async decompressZstd(data: string): Promise<string> {
    return this.simulateDecompression(data);
  }

  private static simulateCompression(data: string, ratio: number): string {
    // This is a simulation - in real implementation, data would be actually compressed
    const compressed = btoa(data); // Base64 encoding as placeholder
    return compressed;
  }

  private static simulateDecompression(data: string): string {
    // This is a simulation - in real implementation, data would be actually decompressed
    return atob(data); // Base64 decoding as placeholder
  }

  private static encodeChunk(data: string, result: CompressionResult): string {
    // Encode chunk with metadata
    return JSON.stringify({
      data: btoa(data),
      metadata: result
    });
  }

  private static decodeChunk(chunk: string): string {
    // Decode chunk and extract data
    const parsed = JSON.parse(chunk);
    return atob(parsed.data);
  }

  private static calculateEntropy(data: string): number {
    const frequency = new Map<string, number>();
    
    // Count character frequencies
    for (const char of data) {
      frequency.set(char, (frequency.get(char) || 0) + 1);
    }

    // Calculate entropy
    let entropy = 0;
    const length = data.length;

    for (const count of frequency.values()) {
      const probability = count / length;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy / 8; // Normalize to 0-1 range
  }

  private static calculateRepetitionFactor(data: string): number {
    // Look for repeated substrings
    const substrings = new Map<string, number>();
    const minLength = 3;
    const maxLength = Math.min(20, Math.floor(data.length / 10));

    for (let len = minLength; len <= maxLength; len++) {
      for (let i = 0; i <= data.length - len; i++) {
        const substring = data.substr(i, len);
        substrings.set(substring, (substrings.get(substring) || 0) + 1);
      }
    }

    let totalRepeats = 0;
    let totalChecked = 0;

    for (const [substring, count] of substrings) {
      if (count > 1) {
        totalRepeats += (count - 1) * substring.length;
      }
      totalChecked += substring.length;
    }

    return totalChecked > 0 ? totalRepeats / totalChecked : 0;
  }

  /**
   * Validate compressed data integrity
   */
  static validateIntegrity(originalChecksum: string, decompressedData: string): boolean {
    const decompressedChecksum = this.calculateChecksum(decompressedData);
    return originalChecksum === decompressedChecksum;
  }

  /**
   * Calculate simple checksum for data integrity
   */
  static calculateChecksum(data: string): string {
    let hash = 0;
    if (data.length === 0) return hash.toString();

    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(36);
  }
}