/**
 * Sequential Text Processor
 * Core implementation for Million Monkeys Typing approach
 * Simulates human typing to enable granular Track Edits detection
 */

import {
  TextChange,
  SequentialOperation,
  TextChunk,
  SequentialTextConfig,
  PerformanceMetrics,
  EditorInterface,
  EditorPosition,
  DiffResult,
  ChunkingOptions,
  HumanTypingSimulation,
  SequentialTextProcessorOptions
} from './sequential-text-types';

export class SequentialTextProcessor {
  private config: Required<SequentialTextConfig>;
  private performanceMetrics: PerformanceMetrics = {
    lastExecutionTime: 0,
    memoryUsage: 0,
    operationCount: 0,
    averageDelayActual: 0
  };

  constructor(options: SequentialTextProcessorOptions = {}) {
    this.validateConfig(options);
    
    this.config = {
      delayMs: options.delayMs ?? 5,
      chunkStrategy: options.chunkStrategy ?? 'word-boundary',
      performanceTarget: options.performanceTarget ?? 100,
      maxOperations: options.maxOperations ?? 1000
    };
  }

  /**
   * Main function to simulate human editing behavior
   * Applies changes sequentially with configurable timing
   */
  async simulateHumanEditing(
    originalText: string,
    targetText: string,
    editor: EditorInterface,
    options?: Partial<SequentialTextConfig>
  ): Promise<HumanTypingSimulation> {
    const startTime = performance.now();
    
    try {
      // Calculate diff and create sequential operations
      const diffResult = this.calculateDiff(originalText, targetText);
      const operations = this.createSequentialOperations(originalText, targetText);
      
      // Performance check
      if (operations.length > this.config.maxOperations) {
        throw new Error(`Too many operations: ${operations.length} exceeds limit of ${this.config.maxOperations}`);
      }
      
      // Apply operations sequentially
      await this.applyOperationsSequentially(operations, editor);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Performance validation
      if (executionTime > this.config.performanceTarget) {
        throw new Error(`Performance target exceeded: ${executionTime}ms > ${this.config.performanceTarget}ms`);
      }
      
      this.updatePerformanceMetrics(executionTime, operations.length);
      
      return {
        originalText,
        targetText,
        operations,
        estimatedDuration: executionTime,
        performanceMetrics: { ...this.performanceMetrics }
      };
      
    } catch (error) {
      const endTime = performance.now();
      this.updatePerformanceMetrics(endTime - startTime, 0);
      throw error;
    }
  }

  /**
   * Calculate diff between original and target text
   */
  calculateDiff(originalText: string, targetText: string): DiffResult {
    const changes: TextChange[] = [];
    
    if (originalText === targetText) {
      return { changes: [], totalChanges: 0, complexity: 0 };
    }
    
    if (originalText === '') {
      changes.push({
        type: 'insert',
        startIndex: 0,
        endIndex: 0,
        originalText: '',
        newText: targetText
      });
    } else if (targetText === '') {
      changes.push({
        type: 'delete',
        startIndex: 0,
        endIndex: originalText.length,
        originalText: originalText,
        newText: ''
      });
    } else {
      // Use Myers diff algorithm implementation
      const diffChanges = this.computeMyersDiff(originalText, targetText);
      changes.push(...diffChanges);
    }
    
    return {
      changes,
      totalChanges: changes.length,
      complexity: this.calculateComplexity(changes)
    };
  }

  /**
   * Create sequential operations from diff results
   */
  createSequentialOperations(originalText: string, targetText: string): SequentialOperation[] {
    const diffResult = this.calculateDiff(originalText, targetText);
    const operations: SequentialOperation[] = [];
    
    if (diffResult.changes.length === 0) {
      return operations;
    }
    
    // Convert changes to operations, adjusting positions for sequential application
    let positionOffset = 0;
    
    for (const change of diffResult.changes) {
      const adjustedPosition = change.startIndex + positionOffset;
      
      switch (change.type) {
        case 'insert':
          operations.push({
            type: 'insert',
            position: adjustedPosition,
            text: change.newText,
            delay: this.config.delayMs
          });
          positionOffset += change.newText.length;
          break;
          
        case 'delete':
          operations.push({
            type: 'delete',
            position: adjustedPosition,
            text: change.originalText,
            delay: this.config.delayMs
          });
          positionOffset -= change.originalText.length;
          break;
          
        case 'replace':
          operations.push({
            type: 'replace',
            position: adjustedPosition,
            text: change.newText,
            delay: this.config.delayMs
          });
          positionOffset += change.newText.length - change.originalText.length;
          break;
      }
    }
    
    return operations;
  }

  /**
   * Create intelligent chunks respecting word boundaries
   */
  createIntelligentChunks(originalText: string, targetText: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const diffResult = this.calculateDiff(originalText, targetText);
    
    for (const change of diffResult.changes) {
      const chunk: TextChunk = {
        type: change.type,
        text: change.newText || change.originalText,
        breaksMidWord: this.checkIfBreaksMidWord(change, originalText),
        respectsPunctuation: this.checkPunctuationBoundary(change, originalText)
      };
      
      chunks.push(chunk);
    }
    
    return chunks;
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  // Private implementation methods
  
  private validateConfig(options: SequentialTextProcessorOptions): void {
    if (options.delayMs !== undefined && options.delayMs < 0) {
      throw new Error('Delay must be non-negative');
    }
    
    if (options.performanceTarget !== undefined && options.performanceTarget <= 0) {
      throw new Error('Performance target must be positive');
    }
  }

  private async applyOperationsSequentially(
    operations: SequentialOperation[],
    editor: EditorInterface
  ): Promise<void> {
    let currentText = editor.getValue();
    
    for (const operation of operations) {
      await this.sleep(operation.delay);
      
      const position = this.indexToPosition(currentText, operation.position);
      
      switch (operation.type) {
        case 'insert':
          editor.replaceRange(operation.text, position);
          currentText = this.insertTextAt(currentText, operation.position, operation.text);
          break;
          
        case 'delete':
          const endPosition = this.indexToPosition(currentText, operation.position + operation.text.length);
          editor.replaceRange('', position, endPosition);
          currentText = this.deleteTextAt(currentText, operation.position, operation.text.length);
          break;
          
        case 'replace':
          const replaceEndPos = this.indexToPosition(currentText, operation.position + operation.text.length);
          editor.replaceRange(operation.text, position, replaceEndPos);
          currentText = this.replaceTextAt(currentText, operation.position, operation.text);
          break;
      }
    }
  }

  private computeMyersDiff(originalText: string, targetText: string): TextChange[] {
    // Simplified Myers diff algorithm implementation
    const changes: TextChange[] = [];
    
    // For now, implement a simple character-by-character comparison
    // In production, this would use a proper Myers algorithm implementation
    let i = 0;
    let j = 0;
    
    while (i < originalText.length || j < targetText.length) {
      if (i >= originalText.length) {
        // Insert remaining characters from target
        changes.push({
          type: 'insert',
          startIndex: i,
          endIndex: i,
          originalText: '',
          newText: targetText.slice(j)
        });
        break;
      } else if (j >= targetText.length) {
        // Delete remaining characters from original
        changes.push({
          type: 'delete',
          startIndex: i,
          endIndex: originalText.length,
          originalText: originalText.slice(i),
          newText: ''
        });
        break;
      } else if (originalText[i] === targetText[j]) {
        // Characters match, continue
        i++;
        j++;
      } else {
        // Characters differ - find the extent of the difference
        const startI = i;
        const startJ = j;
        
        // Simple approach: find next matching character or end of string
        let foundMatch = false;
        let tempI = i;
        let tempJ = j;
        
        // Look ahead to find matching characters
        while (tempI < originalText.length && tempJ < targetText.length && !foundMatch) {
          if (originalText[tempI] === targetText[tempJ]) {
            foundMatch = true;
          } else {
            tempI++;
            tempJ++;
          }
        }
        
        if (foundMatch || (tempI === originalText.length && tempJ === targetText.length)) {
          changes.push({
            type: 'replace',
            startIndex: startI,
            endIndex: tempI,
            originalText: originalText.slice(startI, tempI),
            newText: targetText.slice(startJ, tempJ)
          });
          i = tempI;
          j = tempJ;
        } else {
          // No match found, treat as replacement to end
          changes.push({
            type: 'replace',
            startIndex: startI,
            endIndex: originalText.length,
            originalText: originalText.slice(startI),
            newText: targetText.slice(startJ)
          });
          break;
        }
      }
    }
    
    return changes;
  }

  private calculateComplexity(changes: TextChange[]): number {
    return changes.reduce((complexity, change) => {
      const lengthFactor = Math.max(change.originalText.length, change.newText.length);
      const typeFactor = change.type === 'replace' ? 1.5 : 1.0;
      return complexity + (lengthFactor * typeFactor);
    }, 0);
  }

  private checkIfBreaksMidWord(change: TextChange, originalText: string): boolean {
    const beforeChar = change.startIndex > 0 ? originalText[change.startIndex - 1] : ' ';
    const afterChar = change.endIndex < originalText.length ? originalText[change.endIndex] : ' ';
    
    const isWordChar = (char: string) => /\w/.test(char);
    
    return isWordChar(beforeChar) && isWordChar(afterChar);
  }

  private checkPunctuationBoundary(change: TextChange, originalText: string): boolean {
    const beforeChar = change.startIndex > 0 ? originalText[change.startIndex - 1] : ' ';
    const afterChar = change.endIndex < originalText.length ? originalText[change.endIndex] : ' ';
    
    const isPunctuation = (char: string) => /[.,!?;:]/.test(char);
    
    return !isPunctuation(beforeChar) && !isPunctuation(afterChar);
  }

  private updatePerformanceMetrics(executionTime: number, operationCount: number): void {
    this.performanceMetrics.lastExecutionTime = executionTime;
    this.performanceMetrics.operationCount = operationCount;
    this.performanceMetrics.memoryUsage = this.estimateMemoryUsage();
    this.performanceMetrics.averageDelayActual = operationCount > 0 ? executionTime / operationCount : 0;
  }

  private estimateMemoryUsage(): number {
    // Simple memory usage estimation
    return process.memoryUsage?.()?.heapUsed || 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private indexToPosition(text: string, index: number): EditorPosition {
    const lines = text.slice(0, index).split('\n');
    return {
      line: lines.length - 1,
      ch: lines[lines.length - 1].length
    };
  }

  private insertTextAt(text: string, index: number, insertText: string): string {
    return text.slice(0, index) + insertText + text.slice(index);
  }

  private deleteTextAt(text: string, index: number, length: number): string {
    return text.slice(0, index) + text.slice(index + length);
  }

  private replaceTextAt(text: string, index: number, newText: string): string {
    // For simplicity, assume replacement length equals original length for position tracking
    // In a more sophisticated implementation, this would need to be more precise
    return text.slice(0, index) + newText + text.slice(index + newText.length);
  }
}