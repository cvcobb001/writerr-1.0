/**
 * Lazy Loading System for Track Edits
 * Efficiently loads change history and large datasets on demand
 * Minimizes initial load times and memory usage
 */

import { Change, ChangeCluster, TrackingSession, FilterOptions, TimelineEntry } from '../types';
import { globalEventBus } from '@writerr/shared';
import { memoryOptimizer } from './MemoryOptimizer';

export interface LazyLoadConfig {
  pageSize: number;              // Number of items per page
  preloadPages: number;          // Number of pages to preload
  maxCachedPages: number;        // Maximum pages to keep in cache
  loadingTimeout: number;        // Timeout for loading operations
  enablePredictiveLoading: boolean; // Predict and preload next items
  compressionThreshold: number;   // Compress pages larger than this
  retryAttempts: number;         // Number of retry attempts
  debounceDelay: number;         // Debounce delay for load requests
}

export interface LazyLoadPage<T = any> {
  id: string;
  pageNumber: number;
  items: T[];
  totalItems: number;
  isLoaded: boolean;
  isLoading: boolean;
  lastAccessed: number;
  loadTime: number;
  error?: Error;
  compressed: boolean;
}

export interface LoadRequest<T = any> {
  id: string;
  type: LoadType;
  pageNumber: number;
  filter?: FilterOptions;
  callback?: (data: T[], error?: Error) => void;
  priority: LoadPriority;
  timestamp: number;
}

export enum LoadType {
  CHANGES = 'changes',
  CLUSTERS = 'clusters',
  SESSIONS = 'sessions',
  TIMELINE = 'timeline',
  SEARCH_RESULTS = 'search-results'
}

export enum LoadPriority {
  IMMEDIATE = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4
}

export interface LazyLoadStats {
  totalPages: number;
  loadedPages: number;
  cachedPages: number;
  averageLoadTime: number;
  cacheHitRate: number;
  totalRequests: number;
  failedRequests: number;
  compressionSavings: number;
}

/**
 * Main lazy loading engine
 */
export class LazyLoader<T = any> {
  private config: LazyLoadConfig;
  private pages: Map<string, LazyLoadPage<T>> = new Map();
  private loadQueue: LoadRequest<T>[] = [];
  private activeLoads: Map<string, Promise<LazyLoadPage<T>>> = new Map();
  private stats: LazyLoadStats = {
    totalPages: 0,
    loadedPages: 0,
    cachedPages: 0,
    averageLoadTime: 0,
    cacheHitRate: 0,
    totalRequests: 0,
    failedRequests: 0,
    compressionSavings: 0,
  };
  private loadTimeout: number | null = null;
  private dataProvider: DataProvider<T> | null = null;

  constructor(config?: Partial<LazyLoadConfig>) {
    this.config = {
      pageSize: 50,
      preloadPages: 2,
      maxCachedPages: 10,
      loadingTimeout: 5000,
      enablePredictiveLoading: true,
      compressionThreshold: 10000, // 10KB
      retryAttempts: 3,
      debounceDelay: 100,
      ...config,
    };
  }

  /**
   * Set data provider for loading data
   */
  setDataProvider(provider: DataProvider<T>): void {
    this.dataProvider = provider;
  }

  /**
   * Load a specific page of data
   */
  async loadPage(
    type: LoadType,
    pageNumber: number,
    filter?: FilterOptions
  ): Promise<T[]> {
    const pageId = this.generatePageId(type, pageNumber, filter);
    
    // Check if page is already loaded
    const existingPage = this.pages.get(pageId);
    if (existingPage && existingPage.isLoaded && !existingPage.error) {
      existingPage.lastAccessed = Date.now();
      this.updateCacheHitRate(true);
      return existingPage.items;
    }

    // Check if page is currently loading
    const activeLoad = this.activeLoads.get(pageId);
    if (activeLoad) {
      const page = await activeLoad;
      return page.items;
    }

    // Start loading the page
    const loadPromise = this.loadPageInternal(type, pageNumber, filter);
    this.activeLoads.set(pageId, loadPromise);

    try {
      const page = await loadPromise;
      this.activeLoads.delete(pageId);
      this.updateCacheHitRate(false);
      return page.items;
    } catch (error) {
      this.activeLoads.delete(pageId);
      this.stats.failedRequests++;
      throw error;
    }
  }

  /**
   * Load multiple pages with callback
   */
  loadPageWithCallback(
    type: LoadType,
    pageNumber: number,
    callback: (data: T[], error?: Error) => void,
    priority: LoadPriority = LoadPriority.NORMAL,
    filter?: FilterOptions
  ): void {
    const request: LoadRequest<T> = {
      id: this.generateRequestId(),
      type,
      pageNumber,
      filter,
      callback,
      priority,
      timestamp: Date.now(),
    };

    this.loadQueue.push(request);
    this.processLoadQueue();
  }

  /**
   * Preload pages around a specific page
   */
  async preloadAround(
    type: LoadType,
    centerPage: number,
    filter?: FilterOptions
  ): Promise<void> {
    const preloadPromises: Promise<any>[] = [];

    // Preload pages before and after the center page
    for (let i = 1; i <= this.config.preloadPages; i++) {
      const prevPage = centerPage - i;
      const nextPage = centerPage + i;

      if (prevPage >= 0) {
        preloadPromises.push(
          this.loadPageSilently(type, prevPage, filter)
        );
      }

      preloadPromises.push(
        this.loadPageSilently(type, nextPage, filter)
      );
    }

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Load data with infinite scroll support
   */
  async loadInfiniteScroll(
    type: LoadType,
    startPage: number = 0,
    filter?: FilterOptions
  ): AsyncIterableIterator<T[]> {
    let currentPage = startPage;
    let hasMore = true;

    while (hasMore) {
      try {
        const items = await this.loadPage(type, currentPage, filter);
        
        if (items.length === 0 || items.length < this.config.pageSize) {
          hasMore = false;
        }

        yield items;
        currentPage++;

        // Preload next page if predictive loading is enabled
        if (this.config.enablePredictiveLoading && hasMore) {
          this.loadPageSilently(type, currentPage, filter);
        }

      } catch (error) {
        console.error('Error in infinite scroll:', error);
        hasMore = false;
      }
    }
  }

  /**
   * Search data with lazy loading
   */
  async search(
    query: string,
    type: LoadType,
    filter?: FilterOptions
  ): Promise<AsyncIterableIterator<T[]>> {
    const searchFilter = {
      ...filter,
      searchText: query,
    };

    return this.loadInfiniteScroll(type, 0, searchFilter);
  }

  /**
   * Clear specific pages from cache
   */
  clearCache(type?: LoadType, pagePattern?: string): void {
    const toDelete: string[] = [];

    for (const [pageId, page] of this.pages) {
      if (type && !pageId.includes(type)) {
        continue;
      }
      
      if (pagePattern && !pageId.includes(pagePattern)) {
        continue;
      }

      toDelete.push(pageId);
    }

    toDelete.forEach(pageId => {
      this.pages.delete(pageId);
      this.stats.cachedPages--;
    });

    globalEventBus.emit('lazy-cache-cleared', {
      type,
      clearedPages: toDelete.length,
    });
  }

  /**
   * Get loading statistics
   */
  getStats(): LazyLoadStats {
    return { ...this.stats };
  }

  /**
   * Configure lazy loader
   */
  configure(config: Partial<LazyLoadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Prefetch data based on usage patterns
   */
  async prefetchBasedOnPatterns(): Promise<void> {
    // Analyze access patterns and prefetch likely-to-be-accessed data
    const accessPatterns = this.analyzeAccessPatterns();
    
    const prefetchPromises = accessPatterns.map(pattern => 
      this.loadPageSilently(pattern.type, pattern.pageNumber, pattern.filter)
    );

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Get cached page count
   */
  getCachedPageCount(): number {
    return this.pages.size;
  }

  /**
   * Dispose of lazy loader
   */
  dispose(): void {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
    
    this.pages.clear();
    this.loadQueue.length = 0;
    this.activeLoads.clear();
  }

  // Private methods

  private async loadPageInternal(
    type: LoadType,
    pageNumber: number,
    filter?: FilterOptions
  ): Promise<LazyLoadPage<T>> {
    const startTime = Date.now();
    const pageId = this.generatePageId(type, pageNumber, filter);

    try {
      if (!this.dataProvider) {
        throw new Error('No data provider set');
      }

      // Load data from provider
      const data = await this.dataProvider.loadPage(type, pageNumber, this.config.pageSize, filter);
      
      const loadTime = Date.now() - startTime;
      const page: LazyLoadPage<T> = {
        id: pageId,
        pageNumber,
        items: data.items,
        totalItems: data.totalItems,
        isLoaded: true,
        isLoading: false,
        lastAccessed: Date.now(),
        loadTime,
        compressed: false,
      };

      // Compress page if it's large
      const pageSize = this.estimatePageSize(page);
      if (pageSize > this.config.compressionThreshold) {
        await this.compressPage(page);
      }

      this.pages.set(pageId, page);
      this.updateStats(loadTime);

      // Manage cache size
      await this.manageCacheSize();

      globalEventBus.emit('lazy-page-loaded', {
        type,
        pageNumber,
        itemCount: data.items.length,
        loadTime,
      });

      return page;

    } catch (error) {
      const loadTime = Date.now() - startTime;
      const page: LazyLoadPage<T> = {
        id: pageId,
        pageNumber,
        items: [],
        totalItems: 0,
        isLoaded: false,
        isLoading: false,
        lastAccessed: Date.now(),
        loadTime,
        error: error as Error,
        compressed: false,
      };

      this.pages.set(pageId, page);
      this.stats.failedRequests++;

      throw error;
    }
  }

  private async loadPageSilently(
    type: LoadType,
    pageNumber: number,
    filter?: FilterOptions
  ): Promise<void> {
    try {
      await this.loadPage(type, pageNumber, filter);
    } catch (error) {
      // Silent failure for preloading
      console.debug('Silent preload failed:', error);
    }
  }

  private processLoadQueue(): void {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }

    this.loadTimeout = setTimeout(async () => {
      // Sort queue by priority
      this.loadQueue.sort((a, b) => a.priority - b.priority);

      const toProcess = this.loadQueue.splice(0, 5); // Process up to 5 at once
      
      for (const request of toProcess) {
        try {
          const items = await this.loadPage(request.type, request.pageNumber, request.filter);
          if (request.callback) {
            request.callback(items);
          }
        } catch (error) {
          if (request.callback) {
            request.callback([], error as Error);
          }
        }
      }

      // Continue processing if more requests exist
      if (this.loadQueue.length > 0) {
        this.processLoadQueue();
      }

      this.loadTimeout = null;
    }, this.config.debounceDelay) as any;
  }

  private async compressPage(page: LazyLoadPage<T>): Promise<void> {
    try {
      const originalSize = this.estimatePageSize(page);
      await memoryOptimizer.cacheData(page.id, page.items, 2);
      
      // Mark as compressed and remove items from memory
      page.compressed = true;
      const compressedSize = originalSize * 0.6; // Estimate
      this.stats.compressionSavings += originalSize - compressedSize;
      
      // Keep a reference to items but they're now compressed in memory optimizer
      page.items = [] as T[];

    } catch (error) {
      console.error('Page compression failed:', error);
    }
  }

  private async decompressPage(page: LazyLoadPage<T>): Promise<T[]> {
    if (!page.compressed) {
      return page.items;
    }

    try {
      const cachedItems = await memoryOptimizer.getCachedData<T[]>(page.id);
      if (cachedItems) {
        return cachedItems;
      }
      
      // If not in cache, reload from data provider
      if (this.dataProvider) {
        const data = await this.dataProvider.loadPage(
          LoadType.CHANGES, // Default, would need to store original type
          page.pageNumber,
          this.config.pageSize
        );
        return data.items;
      }

      return [];
    } catch (error) {
      console.error('Page decompression failed:', error);
      return [];
    }
  }

  private async manageCacheSize(): Promise<void> {
    if (this.pages.size <= this.config.maxCachedPages) {
      return;
    }

    // Sort pages by last accessed time
    const sortedPages = Array.from(this.pages.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest pages
    const toRemove = sortedPages.slice(0, this.pages.size - this.config.maxCachedPages);
    
    for (const [pageId] of toRemove) {
      this.pages.delete(pageId);
      memoryOptimizer.removeCachedData(pageId);
    }

    this.stats.cachedPages = this.pages.size;
  }

  private updateStats(loadTime: number): void {
    this.stats.totalRequests++;
    this.stats.loadedPages++;
    this.stats.cachedPages = this.pages.size;
    
    // Update average load time
    if (this.stats.loadedPages === 1) {
      this.stats.averageLoadTime = loadTime;
    } else {
      this.stats.averageLoadTime = 
        (this.stats.averageLoadTime * (this.stats.loadedPages - 1) + loadTime) / 
        this.stats.loadedPages;
    }
  }

  private updateCacheHitRate(isHit: boolean): void {
    const totalRequests = this.stats.totalRequests;
    const currentHitRate = this.stats.cacheHitRate;
    
    if (isHit) {
      this.stats.cacheHitRate = (currentHitRate * totalRequests + 1) / (totalRequests + 1);
    } else {
      this.stats.cacheHitRate = (currentHitRate * totalRequests) / (totalRequests + 1);
    }
  }

  private analyzeAccessPatterns(): Array<{
    type: LoadType;
    pageNumber: number;
    filter?: FilterOptions;
  }> {
    // Simple pattern analysis - could be enhanced with ML
    const patterns: Array<{
      type: LoadType;
      pageNumber: number;
      filter?: FilterOptions;
    }> = [];

    const recentPages = Array.from(this.pages.values())
      .filter(page => Date.now() - page.lastAccessed < 300000) // Last 5 minutes
      .sort((a, b) => b.lastAccessed - a.lastAccessed);

    // Predict next likely pages
    for (const page of recentPages.slice(0, 3)) {
      patterns.push({
        type: LoadType.CHANGES, // Would need to store original type
        pageNumber: page.pageNumber + 1,
      });
    }

    return patterns;
  }

  private generatePageId(type: LoadType, pageNumber: number, filter?: FilterOptions): string {
    const filterHash = filter ? this.hashFilter(filter) : '';
    return `${type}_page_${pageNumber}_${filterHash}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashFilter(filter: FilterOptions): string {
    return btoa(JSON.stringify(filter)).substr(0, 8);
  }

  private estimatePageSize(page: LazyLoadPage<T>): number {
    try {
      return JSON.stringify(page.items).length * 2; // UTF-16
    } catch {
      return page.items.length * 1000; // Fallback estimate
    }
  }
}

/**
 * Data provider interface for lazy loading
 */
export interface DataProvider<T = any> {
  loadPage(
    type: LoadType,
    pageNumber: number,
    pageSize: number,
    filter?: FilterOptions
  ): Promise<{
    items: T[];
    totalItems: number;
    hasMore: boolean;
  }>;
}

/**
 * Default data provider for Track Edits data
 */
export class TrackEditsDataProvider implements DataProvider<Change | ChangeCluster | TrackingSession> {
  private changes: Change[] = [];
  private clusters: ChangeCluster[] = [];
  private sessions: TrackingSession[] = [];

  setData(
    changes: Change[], 
    clusters: ChangeCluster[] = [], 
    sessions: TrackingSession[] = []
  ): void {
    this.changes = changes;
    this.clusters = clusters;
    this.sessions = sessions;
  }

  async loadPage(
    type: LoadType,
    pageNumber: number,
    pageSize: number,
    filter?: FilterOptions
  ): Promise<{
    items: any[];
    totalItems: number;
    hasMore: boolean;
  }> {
    let sourceData: any[];

    switch (type) {
      case LoadType.CHANGES:
        sourceData = this.filterChanges(this.changes, filter);
        break;
      case LoadType.CLUSTERS:
        sourceData = this.clusters;
        break;
      case LoadType.SESSIONS:
        sourceData = this.sessions;
        break;
      default:
        sourceData = [];
    }

    const startIndex = pageNumber * pageSize;
    const endIndex = startIndex + pageSize;
    const items = sourceData.slice(startIndex, endIndex);

    return {
      items,
      totalItems: sourceData.length,
      hasMore: endIndex < sourceData.length,
    };
  }

  private filterChanges(changes: Change[], filter?: FilterOptions): Change[] {
    if (!filter) return changes;

    return changes.filter(change => {
      if (filter.sources?.length && !filter.sources.includes(change.source)) return false;
      if (filter.categories?.length && !filter.categories.includes(change.category)) return false;
      if (filter.statuses?.length && !filter.statuses.includes(change.status)) return false;
      if (filter.confidenceRange) {
        const [min, max] = filter.confidenceRange;
        if (change.confidence < min || change.confidence > max) return false;
      }
      if (filter.searchText) {
        const searchText = filter.searchText.toLowerCase();
        const searchableContent = [
          change.content.before,
          change.content.after,
          change.metadata?.reason || '',
        ].join(' ').toLowerCase();
        if (!searchableContent.includes(searchText)) return false;
      }

      return true;
    });
  }
}

// Factory functions
export function createLazyLoader<T = any>(config?: Partial<LazyLoadConfig>): LazyLoader<T> {
  return new LazyLoader<T>(config);
}

export function createTrackEditsDataProvider(): TrackEditsDataProvider {
  return new TrackEditsDataProvider();
}

// Export default instances
export const defaultLazyLoader = createLazyLoader();
export const defaultDataProvider = createTrackEditsDataProvider();