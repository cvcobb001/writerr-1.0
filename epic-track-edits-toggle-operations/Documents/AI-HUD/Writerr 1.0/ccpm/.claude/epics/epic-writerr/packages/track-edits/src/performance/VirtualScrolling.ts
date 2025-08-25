/**
 * Virtual Scrolling System for Track Edits
 * Handles large lists of changes efficiently by only rendering visible items
 * Optimized for 100K+ word documents with thousands of changes
 */

import { Change, ChangeCluster, FilterOptions } from '../types';
import { globalEventBus } from '@writerr/shared';

export interface VirtualScrollConfig {
  itemHeight: number;           // Fixed height per item in pixels
  containerHeight: number;      // Visible container height
  bufferSize: number;          // Number of items to render outside visible area
  scrollThreshold: number;     // Pixels before triggering scroll update
  enableDynamicHeight?: boolean; // Support variable item heights
  enableHorizontalScroll?: boolean; // Support horizontal scrolling
  batchRenderSize: number;     // Number of items to render in one batch
}

export interface VirtualScrollState {
  scrollTop: number;
  startIndex: number;
  endIndex: number;
  visibleItems: VirtualItem[];
  totalHeight: number;
  isScrolling: boolean;
  renderOffset: number;
}

export interface VirtualItem<T = any> {
  id: string;
  data: T;
  height: number;
  top: number;
  index: number;
  isVisible: boolean;
  element?: HTMLElement;
}

export interface ScrollMetrics {
  totalItems: number;
  visibleItems: number;
  renderedItems: number;
  scrollPercentage: number;
  renderTime: number;
  memoryUsage: number;
  fps: number;
}

/**
 * Virtual scrolling implementation optimized for change lists
 */
export class VirtualScrollingEngine<T = Change | ChangeCluster> {
  private config: VirtualScrollConfig;
  private state: VirtualScrollState;
  private items: T[] = [];
  private filteredItems: T[] = [];
  private container: HTMLElement | null = null;
  private viewport: HTMLElement | null = null;
  private itemCache: Map<string, VirtualItem<T>> = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private scrollTimeout: number | null = null;
  private renderFrameId: number | null = null;
  private metrics: ScrollMetrics = {
    totalItems: 0,
    visibleItems: 0,
    renderedItems: 0,
    scrollPercentage: 0,
    renderTime: 0,
    memoryUsage: 0,
    fps: 0,
  };
  private frameCounter = 0;
  private lastFrameTime = 0;

  constructor(config: Partial<VirtualScrollConfig> = {}) {
    this.config = {
      itemHeight: 80,
      containerHeight: 400,
      bufferSize: 5,
      scrollThreshold: 10,
      enableDynamicHeight: false,
      enableHorizontalScroll: false,
      batchRenderSize: 20,
      ...config,
    };

    this.state = {
      scrollTop: 0,
      startIndex: 0,
      endIndex: 0,
      visibleItems: [],
      totalHeight: 0,
      isScrolling: false,
      renderOffset: 0,
    };

    this.initializePerformanceMonitoring();
  }

  /**
   * Initialize virtual scrolling with data and container
   */
  initialize(items: T[], container: HTMLElement): void {
    this.items = items;
    this.filteredItems = [...items];
    this.container = container;
    this.setupContainer();
    this.calculateMetrics();
    this.updateState();
    this.render();
  }

  /**
   * Update the data items
   */
  updateItems(items: T[]): void {
    this.items = items;
    this.applyCurrentFilter();
    this.calculateMetrics();
    this.updateState();
    this.scheduleRender();
  }

  /**
   * Apply filters to the item list
   */
  applyFilter(filter: FilterOptions | ((item: T) => boolean)): void {
    if (typeof filter === 'function') {
      this.filteredItems = this.items.filter(filter);
    } else {
      // Apply Change-specific filters
      this.filteredItems = this.items.filter(item => {
        if (!this.isChange(item)) return true;
        
        const change = item as unknown as Change;
        
        if (filter.sources?.length && !filter.sources.includes(change.source)) return false;
        if (filter.categories?.length && !filter.categories.includes(change.category)) return false;
        if (filter.statuses?.length && !filter.statuses.includes(change.status)) return false;
        if (filter.confidenceRange) {
          const [min, max] = filter.confidenceRange;
          if (change.confidence < min || change.confidence > max) return false;
        }
        if (filter.timeRange) {
          const [startTime, endTime] = filter.timeRange;
          if (change.timestamp < startTime || change.timestamp > endTime) return false;
        }
        if (filter.searchText) {
          const searchLower = filter.searchText.toLowerCase();
          const searchableText = [
            change.content.before,
            change.content.after,
            change.metadata?.reason || '',
          ].join(' ').toLowerCase();
          if (!searchableText.includes(searchLower)) return false;
        }
        
        return true;
      });
    }

    this.calculateMetrics();
    this.updateState();
    this.scheduleRender();
  }

  /**
   * Clear all filters
   */
  clearFilter(): void {
    this.filteredItems = [...this.items];
    this.calculateMetrics();
    this.updateState();
    this.scheduleRender();
  }

  /**
   * Scroll to a specific item
   */
  scrollToItem(itemId: string, behavior: ScrollBehavior = 'smooth'): void {
    const itemIndex = this.filteredItems.findIndex(item => 
      this.getItemId(item) === itemId
    );

    if (itemIndex === -1) return;

    const targetScrollTop = itemIndex * this.config.itemHeight;
    this.scrollTo(targetScrollTop, behavior);
  }

  /**
   * Scroll to a specific index
   */
  scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth'): void {
    const clampedIndex = Math.max(0, Math.min(index, this.filteredItems.length - 1));
    const targetScrollTop = clampedIndex * this.config.itemHeight;
    this.scrollTo(targetScrollTop, behavior);
  }

  /**
   * Scroll to a specific position
   */
  scrollTo(scrollTop: number, behavior: ScrollBehavior = 'smooth'): void {
    if (!this.viewport) return;

    const maxScrollTop = Math.max(0, this.state.totalHeight - this.config.containerHeight);
    const clampedScrollTop = Math.max(0, Math.min(scrollTop, maxScrollTop));

    this.viewport.scrollTo({
      top: clampedScrollTop,
      behavior,
    });
  }

  /**
   * Get current scroll metrics
   */
  getMetrics(): ScrollMetrics {
    return { ...this.metrics };
  }

  /**
   * Get visible items
   */
  getVisibleItems(): VirtualItem<T>[] {
    return [...this.state.visibleItems];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VirtualScrollConfig>): void {
    this.config = { ...this.config, ...config };
    this.calculateMetrics();
    this.updateState();
    this.scheduleRender();
  }

  /**
   * Dispose of the virtual scrolling instance
   */
  dispose(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.renderFrameId) {
      cancelAnimationFrame(this.renderFrameId);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.itemCache.clear();
  }

  // Private methods

  private setupContainer(): void {
    if (!this.container) return;

    // Create viewport for scrolling
    this.viewport = document.createElement('div');
    this.viewport.style.cssText = `
      height: ${this.config.containerHeight}px;
      overflow-y: auto;
      overflow-x: ${this.config.enableHorizontalScroll ? 'auto' : 'hidden'};
      position: relative;
    `;

    // Create inner container for total height
    const innerContainer = document.createElement('div');
    innerContainer.style.cssText = `
      height: ${this.state.totalHeight}px;
      position: relative;
    `;

    this.viewport.appendChild(innerContainer);
    this.container.appendChild(this.viewport);

    // Setup scroll listener
    this.viewport.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });

    // Setup resize observer
    this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
    this.resizeObserver.observe(this.viewport);
  }

  private calculateMetrics(): void {
    this.state.totalHeight = this.filteredItems.length * this.config.itemHeight;
    this.metrics.totalItems = this.filteredItems.length;
    this.metrics.visibleItems = Math.ceil(this.config.containerHeight / this.config.itemHeight);
  }

  private updateState(): void {
    const maxScrollTop = Math.max(0, this.state.totalHeight - this.config.containerHeight);
    this.state.scrollTop = Math.min(this.state.scrollTop, maxScrollTop);

    this.state.startIndex = Math.floor(this.state.scrollTop / this.config.itemHeight);
    this.state.startIndex = Math.max(0, this.state.startIndex - this.config.bufferSize);

    const visibleCount = Math.ceil(this.config.containerHeight / this.config.itemHeight);
    this.state.endIndex = this.state.startIndex + visibleCount + (this.config.bufferSize * 2);
    this.state.endIndex = Math.min(this.state.endIndex, this.filteredItems.length);

    this.state.renderOffset = this.state.startIndex * this.config.itemHeight;
    
    this.metrics.scrollPercentage = maxScrollTop > 0 ? (this.state.scrollTop / maxScrollTop) * 100 : 0;
    this.metrics.renderedItems = this.state.endIndex - this.state.startIndex;
  }

  private scheduleRender(): void {
    if (this.renderFrameId) {
      cancelAnimationFrame(this.renderFrameId);
    }

    this.renderFrameId = requestAnimationFrame(() => {
      this.render();
      this.renderFrameId = null;
    });
  }

  private render(): void {
    const startTime = performance.now();

    // Update visible items
    this.state.visibleItems = [];

    for (let i = this.state.startIndex; i < this.state.endIndex; i++) {
      const item = this.filteredItems[i];
      if (!item) continue;

      const virtualItem: VirtualItem<T> = {
        id: this.getItemId(item),
        data: item,
        height: this.config.itemHeight,
        top: i * this.config.itemHeight - this.state.renderOffset,
        index: i,
        isVisible: true,
      };

      this.state.visibleItems.push(virtualItem);
      this.itemCache.set(virtualItem.id, virtualItem);
    }

    // Update DOM if container exists
    if (this.container && this.viewport) {
      this.updateDOM();
    }

    // Update performance metrics
    this.metrics.renderTime = performance.now() - startTime;
    this.updateFPS();

    // Emit render event
    globalEventBus.emit('virtual-scroll-rendered', {
      startIndex: this.state.startIndex,
      endIndex: this.state.endIndex,
      visibleItems: this.state.visibleItems.length,
      renderTime: this.metrics.renderTime,
    });
  }

  private updateDOM(): void {
    if (!this.viewport) return;

    const innerContainer = this.viewport.firstChild as HTMLElement;
    if (!innerContainer) return;

    // Update total height
    innerContainer.style.height = `${this.state.totalHeight}px`;

    // Clear existing items
    const existingItems = innerContainer.querySelectorAll('.virtual-item');
    existingItems.forEach(item => item.remove());

    // Render visible items
    this.state.visibleItems.forEach(virtualItem => {
      const element = this.createItemElement(virtualItem);
      innerContainer.appendChild(element);
    });
  }

  private createItemElement(virtualItem: VirtualItem<T>): HTMLElement {
    const element = document.createElement('div');
    element.className = 'virtual-item';
    element.style.cssText = `
      position: absolute;
      top: ${virtualItem.top}px;
      left: 0;
      right: 0;
      height: ${virtualItem.height}px;
      box-sizing: border-box;
    `;

    // Add content based on item type
    if (this.isChange(virtualItem.data)) {
      element.innerHTML = this.renderChangeItem(virtualItem.data as unknown as Change);
    } else {
      element.innerHTML = this.renderClusterItem(virtualItem.data as unknown as ChangeCluster);
    }

    virtualItem.element = element;
    return element;
  }

  private renderChangeItem(change: Change): string {
    return `
      <div class="change-item" data-change-id="${change.id}">
        <div class="change-header">
          <span class="change-type">${change.type}</span>
          <span class="change-source">${change.source}</span>
          <span class="change-confidence">${Math.round(change.confidence * 100)}%</span>
        </div>
        <div class="change-content">
          <div class="change-before">${this.escapeHtml(change.content.before)}</div>
          <div class="change-after">${this.escapeHtml(change.content.after)}</div>
        </div>
      </div>
    `;
  }

  private renderClusterItem(cluster: ChangeCluster): string {
    return `
      <div class="cluster-item" data-cluster-id="${cluster.id}">
        <div class="cluster-header">
          <span class="cluster-title">${cluster.title}</span>
          <span class="cluster-count">${cluster.changes.length} changes</span>
          <span class="cluster-confidence">${Math.round(cluster.confidence * 100)}%</span>
        </div>
        <div class="cluster-description">${cluster.description || ''}</div>
      </div>
    `;
  }

  private handleScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.state.scrollTop = target.scrollTop;
    this.state.isScrolling = true;

    // Throttle scroll updates
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.state.isScrolling = false;
      globalEventBus.emit('virtual-scroll-end', {
        scrollTop: this.state.scrollTop,
        scrollPercentage: this.metrics.scrollPercentage,
      });
    }, 150) as any;

    this.updateState();
    this.scheduleRender();

    globalEventBus.emit('virtual-scroll', {
      scrollTop: this.state.scrollTop,
      scrollPercentage: this.metrics.scrollPercentage,
      visibleItems: this.state.visibleItems.length,
    });
  }

  private handleResize(entries: ResizeObserverEntry[]): void {
    const entry = entries[0];
    if (entry) {
      this.config.containerHeight = entry.contentRect.height;
      this.calculateMetrics();
      this.updateState();
      this.scheduleRender();
    }
  }

  private applyCurrentFilter(): void {
    // Re-apply any existing filter
    // This would be enhanced to remember and re-apply filters
    this.filteredItems = [...this.items];
  }

  private getItemId(item: T): string {
    if (this.isChange(item)) {
      return (item as unknown as Change).id;
    }
    if (this.isCluster(item)) {
      return (item as unknown as ChangeCluster).id;
    }
    return String(item);
  }

  private isChange(item: any): item is Change {
    return item && typeof item.id === 'string' && item.content && item.position;
  }

  private isCluster(item: any): item is ChangeCluster {
    return item && typeof item.id === 'string' && Array.isArray(item.changes);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private initializePerformanceMonitoring(): void {
    setInterval(() => {
      this.updateMemoryUsage();
    }, 1000);
  }

  private updateFPS(): void {
    const now = performance.now();
    this.frameCounter++;

    if (now - this.lastFrameTime >= 1000) {
      this.metrics.fps = this.frameCounter;
      this.frameCounter = 0;
      this.lastFrameTime = now;
    }
  }

  private updateMemoryUsage(): void {
    // Estimate memory usage based on cache size and DOM elements
    const cacheSize = this.itemCache.size * 1000; // Rough estimate
    const domSize = this.state.visibleItems.length * 500; // Rough estimate
    this.metrics.memoryUsage = cacheSize + domSize;
  }
}

/**
 * Factory function for creating optimized virtual scroll instances
 */
export function createVirtualScroller<T = Change>(
  config?: Partial<VirtualScrollConfig>
): VirtualScrollingEngine<T> {
  return new VirtualScrollingEngine<T>(config);
}

/**
 * Hook for React components (if needed)
 */
export function useVirtualScrolling<T = Change>(
  items: T[],
  containerRef: React.RefObject<HTMLElement>,
  config?: Partial<VirtualScrollConfig>
) {
  // This would be implemented as a React hook if using React
  // For now, return basic interface
  return {
    virtualScroller: new VirtualScrollingEngine<T>(config),
    metrics: {} as ScrollMetrics,
    scrollTo: (index: number) => {},
    applyFilter: (filter: any) => {},
  };
}