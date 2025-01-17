import { performanceMonitor } from './performance-monitor';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private pendingRequests: Map<string, Promise<any>>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  private cleanup(): void {
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }

    // Remove oldest entries if cache is too large
    if (this.cache.size > this.maxSize) {
      const entriesToDelete = this.cache.size - this.maxSize;
      const entries = Array.from(this.cache.entries());
      entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, entriesToDelete)
        .forEach(([key]) => this.cache.delete(key));
    }
  }

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cached = this.cache.get(key);
      if (cached && !this.isExpired(cached)) {
        performanceMonitor.measure('cache-hit', startTime);
        return cached.value;
      }

      // Remove expired entry if it exists
      if (cached) {
        this.cache.delete(key);
      }

      // Check for pending request
      const pending = this.pendingRequests.get(key);
      if (pending) {
        performanceMonitor.measure('cache-pending', startTime);
        return pending;
      }

      // Create new request
      const request = fetcher().then(data => {
        this.cache.set(key, {
          value: data,
          timestamp: Date.now(),
          ttl
        });
        this.pendingRequests.delete(key);
        this.cleanup();
        return data;
      });

      this.pendingRequests.set(key, request);
      performanceMonitor.measure('cache-miss', startTime);
      return request;
    } catch (error) {
      performanceMonitor.measure('cache-error', startTime);
      throw error;
    }
  }

  invalidate(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  getStats(): {
    size: number;
    maxSize: number;
    pendingRequests: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      pendingRequests: this.pendingRequests.size
    };
  }
}

// Create singleton instance
export const cacheManager = new CacheManager({
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000 // 5 minutes
});