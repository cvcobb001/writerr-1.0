/**
 * Document Optimizer
 * Optimizes handling of large documents (100K+ words) through chunking, virtual scrolling, and background processing
 */

import { globalEventBus } from '../event-bus';
import { performanceProfiler, PerformanceCategory } from './PerformanceProfiler';
import { crossPluginCache } from './CrossPluginCache';
import { DocumentOptimizationConfig } from './types';

export interface DocumentChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  processed: boolean;
  metadata?: Record<string, any>;
}

export interface DocumentStats {
  totalSize: number;
  chunkCount: number;
  processedChunks: number;
  virtualizedRanges: number;
  cacheHitRate: number;
  processingTime: number;
  memoryUsage: number;
}

export interface VirtualRange {
  start: number;
  end: number;
  visible: boolean;
  rendered: boolean;
}

/**
 * Optimizes document processing for large files through intelligent chunking and virtualization
 */
export class DocumentOptimizer {
  private static instance: DocumentOptimizer;
  private config: DocumentOptimizationConfig;
  private documentChunks: Map<string, DocumentChunk[]> = new Map();
  private virtualRanges: Map<string, VirtualRange[]> = new Map();
  private processingQueue: Array<{ documentId: string; chunkId: string; priority: number }> = [];
  private backgroundProcessor?: Worker;
  private processingInterval?: number;

  private constructor() {
    this.config = {
      chunkSize: 5000,           // 5K characters per chunk
      virtualScrollThreshold: 50000, // Enable virtual scrolling for 50K+ chars
      lazyLoadThreshold: 100000,  // Lazy load for 100K+ chars
      compressionThreshold: 10000, // Compress chunks over 10K chars
      maxConcurrentOps: 3         // Max concurrent chunk operations
    };

    this.initializeBackgroundProcessor();
    this.startProcessingLoop();
    this.setupEventListeners();
  }

  public static getInstance(): DocumentOptimizer {
    if (!DocumentOptimizer.instance) {
      DocumentOptimizer.instance = new DocumentOptimizer();
    }
    return DocumentOptimizer.instance;
  }

  /**
   * Process a large document with optimization
   */
  async processDocument(
    documentId: string,
    content: string,
    options?: {
      priority?: number;
      enableVirtualization?: boolean;
      enableCaching?: boolean;
      enableCompression?: boolean;
    }
  ): Promise<DocumentChunk[]> {
    const contentSize = content.length;

    return performanceProfiler.measureAsync(
      'document-process-large',
      PerformanceCategory.DOCUMENT,
      async () => {
        // Check if document is already cached
        if (options?.enableCaching !== false) {
          const cached = await crossPluginCache.get<DocumentChunk[]>(`doc-chunks-${documentId}`);
          if (cached) {
            console.log(`[DocumentOptimizer] Using cached chunks for document ${documentId}`);
            this.documentChunks.set(documentId, cached);
            return cached;
          }
        }

        // Create chunks
        const chunks = await this.createChunks(documentId, content, options);
        this.documentChunks.set(documentId, chunks);

        // Set up virtual ranges if needed
        if (contentSize >= this.config.virtualScrollThreshold && options?.enableVirtualization !== false) {
          await this.setupVirtualization(documentId, chunks);
        }

        // Cache chunks if enabled
        if (options?.enableCaching !== false) {
          await crossPluginCache.set(
            `doc-chunks-${documentId}`,
            chunks,
            {
              category: 'document-chunks',
              ttl: 30 * 60 * 1000, // 30 minutes
              compress: true
            }
          );
        }

        // Queue background processing if document is very large
        if (contentSize >= this.config.lazyLoadThreshold) {
          this.queueBackgroundProcessing(documentId, chunks, options?.priority || 1);
        }

        globalEventBus.emit('document-processed', {
          documentId,
          chunkCount: chunks.length,
          totalSize: contentSize,
          virtualized: contentSize >= this.config.virtualScrollThreshold
        });

        return chunks;
      },
      {
        documentId,
        contentSize,
        chunkCount: Math.ceil(contentSize / this.config.chunkSize)
      }
    );
  }

  /**
   * Get visible chunks for virtual scrolling
   */
  getVisibleChunks(
    documentId: string,
    viewportStart: number,
    viewportEnd: number
  ): DocumentChunk[] {
    const chunks = this.documentChunks.get(documentId);
    if (!chunks) return [];

    return chunks.filter(chunk =>
      (chunk.startIndex <= viewportEnd && chunk.endIndex >= viewportStart)
    );
  }

  /**
   * Process specific chunk with priority
   */
  async processChunk(
    documentId: string,
    chunkId: string,
    processor: (chunk: DocumentChunk) => Promise<DocumentChunk>
  ): Promise<DocumentChunk> {
    return performanceProfiler.measureAsync(
      'document-chunk-process',
      PerformanceCategory.DATA_PROCESSING,
      async () => {
        const chunks = this.documentChunks.get(documentId);
        if (!chunks) {
          throw new Error(`Document ${documentId} not found`);
        }

        const chunk = chunks.find(c => c.id === chunkId);
        if (!chunk) {
          throw new Error(`Chunk ${chunkId} not found in document ${documentId}`);
        }

        const processedChunk = await processor(chunk);
        processedChunk.processed = true;

        // Update chunk in collection
        const chunkIndex = chunks.findIndex(c => c.id === chunkId);
        chunks[chunkIndex] = processedChunk;

        // Update cache
        await crossPluginCache.set(
          `doc-chunks-${documentId}`,
          chunks,
          { category: 'document-chunks', compress: true }
        );

        return processedChunk;
      },
      { documentId, chunkId }
    );
  }

  /**
   * Update virtual scroll position
   */
  updateVirtualPosition(
    documentId: string,
    scrollTop: number,
    viewportHeight: number
  ): VirtualRange[] {
    const ranges = this.virtualRanges.get(documentId) || [];
    const buffer = viewportHeight * 2; // 2x viewport buffer

    const visibleStart = Math.max(0, scrollTop - buffer);
    const visibleEnd = scrollTop + viewportHeight + buffer;

    // Update visibility of ranges
    ranges.forEach(range => {
      const wasVisible = range.visible;
      range.visible = (range.start <= visibleEnd && range.end >= visibleStart);
      
      // Trigger loading for newly visible ranges
      if (range.visible && !wasVisible && !range.rendered) {
        this.loadVirtualRange(documentId, range);
      }
    });

    this.virtualRanges.set(documentId, ranges);
    return ranges.filter(r => r.visible);
  }

  /**
   * Get document statistics
   */
  getDocumentStats(documentId: string): DocumentStats | null {
    const chunks = this.documentChunks.get(documentId);
    if (!chunks) return null;

    const processedChunks = chunks.filter(c => c.processed).length;
    const totalSize = chunks.reduce((sum, c) => sum + c.content.length, 0);
    const virtualRanges = this.virtualRanges.get(documentId)?.length || 0;

    return {
      totalSize,
      chunkCount: chunks.length,
      processedChunks,
      virtualizedRanges: virtualRanges,
      cacheHitRate: 0, // Would be calculated from cache stats
      processingTime: 0, // Would be tracked over time
      memoryUsage: this.estimateMemoryUsage(chunks)
    };
  }

  /**
   * Configure document optimization
   */
  configure(config: Partial<DocumentOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear document data to free memory
   */
  clearDocument(documentId: string): void {
    this.documentChunks.delete(documentId);
    this.virtualRanges.delete(documentId);
    
    // Remove from cache
    crossPluginCache.delete(`doc-chunks-${documentId}`);
    
    // Remove from processing queue
    this.processingQueue = this.processingQueue.filter(
      item => item.documentId !== documentId
    );

    globalEventBus.emit('document-cleared', { documentId });
  }

  /**
   * Get processing queue status
   */
  getQueueStatus(): { pending: number; processing: number } {
    return {
      pending: this.processingQueue.length,
      processing: 0 // Would track active processing
    };
  }

  /**
   * Force process all queued items
   */
  async flushProcessingQueue(): Promise<void> {
    const queue = [...this.processingQueue];
    this.processingQueue = [];

    const promises = queue.map(item =>
      this.processQueuedItem(item).catch(error => {
        console.error(`[DocumentOptimizer] Failed to process queued item:`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Shutdown document optimizer
   */
  shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    if (this.backgroundProcessor) {
      this.backgroundProcessor.terminate();
    }

    this.documentChunks.clear();
    this.virtualRanges.clear();
    this.processingQueue = [];
  }

  // Private methods

  private async createChunks(
    documentId: string,
    content: string,
    options?: { enableCompression?: boolean }
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const chunkSize = this.config.chunkSize;

    for (let i = 0; i < content.length; i += chunkSize) {
      const endIndex = Math.min(i + chunkSize, content.length);
      const chunkContent = content.slice(i, endIndex);
      
      const chunk: DocumentChunk = {
        id: `${documentId}-chunk-${chunks.length}`,
        content: chunkContent,
        startIndex: i,
        endIndex: endIndex - 1,
        processed: false,
        metadata: {
          documentId,
          chunkIndex: chunks.length,
          shouldCompress: options?.enableCompression && chunkContent.length > this.config.compressionThreshold
        }
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  private async setupVirtualization(
    documentId: string,
    chunks: DocumentChunk[]
  ): Promise<void> {
    const ranges: VirtualRange[] = [];
    const rangeSize = Math.ceil(chunks.length / 10); // 10 virtual ranges

    for (let i = 0; i < chunks.length; i += rangeSize) {
      const endIndex = Math.min(i + rangeSize - 1, chunks.length - 1);
      
      ranges.push({
        start: chunks[i].startIndex,
        end: chunks[endIndex].endIndex,
        visible: false,
        rendered: false
      });
    }

    this.virtualRanges.set(documentId, ranges);
  }

  private queueBackgroundProcessing(
    documentId: string,
    chunks: DocumentChunk[],
    priority: number
  ): void {
    chunks.forEach(chunk => {
      this.processingQueue.push({
        documentId,
        chunkId: chunk.id,
        priority
      });
    });

    // Sort by priority
    this.processingQueue.sort((a, b) => b.priority - a.priority);
  }

  private initializeBackgroundProcessor(): void {
    if (typeof Worker === 'undefined') return;

    try {
      const workerCode = `
        self.onmessage = function(e) {
          const { id, action, data } = e.data;
          
          try {
            let result;
            
            switch (action) {
              case 'compress-chunk':
                // Simulate compression
                result = {
                  compressed: btoa(data.content),
                  originalSize: data.content.length,
                  compressedSize: Math.floor(data.content.length * 0.6)
                };
                break;
                
              case 'analyze-chunk':
                // Simulate text analysis
                result = {
                  wordCount: data.content.split(/\\s+/).length,
                  characterCount: data.content.length,
                  complexity: Math.random() * 100
                };
                break;
                
              default:
                throw new Error('Unknown action: ' + action);
            }
            
            self.postMessage({ id, success: true, result });
          } catch (error) {
            self.postMessage({ id, success: false, error: error.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.backgroundProcessor = new Worker(workerUrl);

    } catch (error) {
      console.warn('[DocumentOptimizer] Background processor initialization failed:', error);
    }
  }

  private startProcessingLoop(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 100) as any; // Process every 100ms
  }

  private setupEventListeners(): void {
    globalEventBus.on('memory-pressure-high', () => {
      // Clear non-essential document data
      this.documentChunks.forEach((chunks, documentId) => {
        const processed = chunks.filter(c => c.processed);
        if (processed.length < chunks.length * 0.5) {
          // If less than 50% processed, clear unprocessed chunks
          const essential = chunks.filter(c => c.processed);
          this.documentChunks.set(documentId, essential);
        }
      });
    });

    globalEventBus.on('document-scroll', (event) => {
      const { documentId, scrollTop, viewportHeight } = event.payload;
      this.updateVirtualPosition(documentId, scrollTop, viewportHeight);
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue.length === 0) return;

    const maxConcurrent = this.config.maxConcurrentOps;
    const toProcess = this.processingQueue.splice(0, maxConcurrent);

    const promises = toProcess.map(item => this.processQueuedItem(item));
    await Promise.allSettled(promises);
  }

  private async processQueuedItem(item: { documentId: string; chunkId: string; priority: number }): Promise<void> {
    try {
      const chunks = this.documentChunks.get(item.documentId);
      if (!chunks) return;

      const chunk = chunks.find(c => c.id === item.chunkId);
      if (!chunk || chunk.processed) return;

      // Background processing simulation
      if (this.backgroundProcessor) {
        await this.processChunkInBackground(chunk);
      }

      chunk.processed = true;

      globalEventBus.emit('chunk-processed', {
        documentId: item.documentId,
        chunkId: item.chunkId
      });

    } catch (error) {
      console.error(`[DocumentOptimizer] Background processing failed:`, error);
    }
  }

  private async processChunkInBackground(chunk: DocumentChunk): Promise<void> {
    if (!this.backgroundProcessor) return;

    return new Promise((resolve, reject) => {
      const id = `process_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const messageHandler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.backgroundProcessor!.removeEventListener('message', messageHandler);
          
          if (e.data.success) {
            // Update chunk with processing results
            chunk.metadata = { ...chunk.metadata, ...e.data.result };
            resolve();
          } else {
            reject(new Error(e.data.error));
          }
        }
      };

      this.backgroundProcessor.addEventListener('message', messageHandler);
      
      // Choose processing type based on chunk characteristics
      const action = chunk.metadata?.shouldCompress ? 'compress-chunk' : 'analyze-chunk';
      
      this.backgroundProcessor.postMessage({
        id,
        action,
        data: chunk
      });
    });
  }

  private async loadVirtualRange(documentId: string, range: VirtualRange): Promise<void> {
    return performanceProfiler.measureAsync(
      'virtual-range-load',
      PerformanceCategory.RENDER,
      async () => {
        // Simulate loading virtual range content
        await new Promise(resolve => setTimeout(resolve, 10));
        range.rendered = true;

        globalEventBus.emit('virtual-range-loaded', {
          documentId,
          range: { start: range.start, end: range.end }
        });
      },
      { documentId, rangeSize: range.end - range.start }
    );
  }

  private estimateMemoryUsage(chunks: DocumentChunk[]): number {
    return chunks.reduce((total, chunk) => {
      let size = chunk.content.length * 2; // UTF-16 approximation
      size += JSON.stringify(chunk.metadata || {}).length * 2;
      return total + size;
    }, 0);
  }
}

// Export singleton instance
export const documentOptimizer = DocumentOptimizer.getInstance();

// Convenience functions
export async function processLargeDocument(
  documentId: string,
  content: string,
  options?: {
    priority?: number;
    enableVirtualization?: boolean;
    enableCaching?: boolean;
    enableCompression?: boolean;
  }
): Promise<DocumentChunk[]> {
  return documentOptimizer.processDocument(documentId, content, options);
}

export function getDocumentVisibleChunks(
  documentId: string,
  viewportStart: number,
  viewportEnd: number
): DocumentChunk[] {
  return documentOptimizer.getVisibleChunks(documentId, viewportStart, viewportEnd);
}

export function updateDocumentVirtualPosition(
  documentId: string,
  scrollTop: number,
  viewportHeight: number
): VirtualRange[] {
  return documentOptimizer.updateVirtualPosition(documentId, scrollTop, viewportHeight);
}

export function getDocumentStats(documentId: string): DocumentStats | null {
  return documentOptimizer.getDocumentStats(documentId);
}

export function clearDocumentOptimization(documentId: string): void {
  documentOptimizer.clearDocument(documentId);
}