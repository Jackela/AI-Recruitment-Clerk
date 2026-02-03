import { Injectable } from '@angular/core';
import type { Observable} from 'rxjs';
import { of, throwError, from } from 'rxjs';
import { tap, switchMap, catchError, shareReplay } from 'rxjs/operators';

/**
 * Defines the shape of the cache config.
 */
export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  strategy?: 'lru' | 'lfu' | 'fifo'; // Cache eviction strategy
  storage?: 'memory' | 'session' | 'local' | 'indexeddb';
  compress?: boolean;
  encrypt?: boolean;
}

/**
 * Defines the shape of the cache entry.
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt?: number;
  hits?: number;
  size?: number;
  compressed?: boolean;
  encrypted?: boolean;
}

/**
 * Defines the shape of the cache stats.
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  itemCount: number;
  hitRate: number;
}

/**
 * Provides cache functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Observable<unknown>>();
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    itemCount: 0,
    hitRate: 0,
  };

  private readonly defaultConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100 * 1024 * 1024, // 100MB
    strategy: 'lru',
    storage: 'memory',
    compress: false,
    encrypt: false,
  };

  // IndexedDB setup
  private dbName = 'AppCache';
  private storeName = 'cache';
  private db: IDBDatabase | null = null;

  /**
   * Initializes a new instance of the Cache Service.
   */
  constructor() {
    this.initIndexedDB();
    this.startCleanupTimer();
  }

  // Initialize IndexedDB for persistent caching
  private async initIndexedDB(): Promise<void> {
    if (!('indexedDB' in window)) {
      return;
    }

    try {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'key',
          });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
      };

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
      };
    } catch (error) {
      console.error('IndexedDB initialization failed:', error);
    }
  }

  // Main caching method with deduplication
  /**
   * Performs the cache operation.
   * @param key - The key.
   * @param factory - The factory.
   * @param config - The config.
   * @returns The Observable<T>.
   */
  public cache<T>(
    key: string,
    factory: () => Observable<T>,
    config?: CacheConfig,
  ): Observable<T> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Observable<T>;
    }

    // Try to get from cache
    return from(this.get<T>(key, mergedConfig)).pipe(
      switchMap((cached) => {
        if (cached !== null) {
          this.cacheStats.hits++;
          this.updateHitRate();
          return of(cached);
        }

        this.cacheStats.misses++;
        this.updateHitRate();

        // Create new request and cache it
        const request$ = factory().pipe(
          tap((value) => {
            this.set(key, value, mergedConfig);
            this.pendingRequests.delete(key);
          }),
          catchError((error) => {
            this.pendingRequests.delete(key);
            return throwError(() => error);
          }),
          shareReplay(1),
        );

        this.pendingRequests.set(key, request$);
        return request$;
      }),
    );
  }

  // Get value from cache
  /**
   * Retrieves the value.
   * @param key - The key.
   * @param config - The config.
   * @returns A promise that resolves to T | null.
   */
  public async get<T>(key: string, config?: CacheConfig): Promise<T | null> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    switch (mergedConfig.storage) {
      case 'memory':
        return this.getFromMemory<T>(key);
      case 'session':
        return this.getFromSessionStorage<T>(key);
      case 'local':
        return this.getFromLocalStorage<T>(key);
      case 'indexeddb':
        return this.getFromIndexedDB<T>(key);
      default:
        return this.getFromMemory<T>(key);
    }
  }

  // Set value in cache
  /**
   * Sets the value.
   * @param key - The key.
   * @param value - The value.
   * @param config - The config.
   * @returns A promise that resolves when the operation completes.
   */
  public async set<T>(key: string, value: T, config?: CacheConfig): Promise<void> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: mergedConfig.ttl ? Date.now() + mergedConfig.ttl : undefined,
      hits: 0,
      size: this.estimateSize(value),
      compressed: mergedConfig.compress,
      encrypted: mergedConfig.encrypt,
    };

    // Apply eviction strategy if needed
    await this.applyEvictionStrategy(entry.size || 0, mergedConfig);

    switch (mergedConfig.storage) {
      case 'memory':
        this.setInMemory(entry);
        break;
      case 'session':
        this.setInSessionStorage(entry);
        break;
      case 'local':
        this.setInLocalStorage(entry);
        break;
      case 'indexeddb':
        await this.setInIndexedDB(entry);
        break;
      default:
        this.setInMemory(entry);
    }

    this.updateCacheStats();
  }

  // Remove from cache
  /**
   * Removes the entity.
   * @param key - The key.
   * @param config - The config.
   * @returns A promise that resolves when the operation completes.
   */
  public async remove(key: string, config?: CacheConfig): Promise<void> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    switch (mergedConfig.storage) {
      case 'memory':
        this.memoryCache.delete(key);
        break;
      case 'session':
        sessionStorage.removeItem(key);
        break;
      case 'local':
        localStorage.removeItem(key);
        break;
      case 'indexeddb':
        await this.removeFromIndexedDB(key);
        break;
    }

    this.updateCacheStats();
  }

  // Clear cache
  /**
   * Performs the clear operation.
   * @param config - The config.
   * @returns A promise that resolves when the operation completes.
   */
  public async clear(config?: CacheConfig): Promise<void> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    switch (mergedConfig.storage) {
      case 'memory':
        this.memoryCache.clear();
        break;
      case 'session':
        sessionStorage.clear();
        break;
      case 'local':
        localStorage.clear();
        break;
      case 'indexeddb':
        await this.clearIndexedDB();
        break;
      default:
        this.memoryCache.clear();
    }

    this.pendingRequests.clear();
    this.resetCacheStats();
  }

  // Memory cache operations
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update hits for LFU strategy
    entry.hits = (entry.hits || 0) + 1;

    return entry.value as T;
  }

  private setInMemory<T>(entry: CacheEntry<T>): void {
    this.memoryCache.set(entry.key, entry);
  }

  // SessionStorage operations
  private getFromSessionStorage<T>(key: string): T | null {
    try {
      const stored = sessionStorage.getItem(key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        sessionStorage.removeItem(key);
        return null;
      }

      return entry.value;
    } catch {
      return null;
    }
  }

  private setInSessionStorage<T>(entry: CacheEntry<T>): void {
    try {
      sessionStorage.setItem(entry.key, JSON.stringify(entry));
    } catch (error) {
      console.error('SessionStorage set failed:', error);
    }
  }

  // LocalStorage operations
  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.value;
    } catch {
      return null;
    }
  }

  private setInLocalStorage<T>(entry: CacheEntry<T>): void {
    try {
      localStorage.setItem(entry.key, JSON.stringify(entry));
    } catch (error) {
      console.error('LocalStorage set failed:', error);
    }
  }

  // IndexedDB operations
  private async getFromIndexedDB<T>(key: string): Promise<T | null> {
    const db = this.db;
    if (!db) return null;

    return new Promise((resolve) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T>;

        if (!entry) {
          resolve(null);
          return;
        }

        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          this.removeFromIndexedDB(key);
          resolve(null);
          return;
        }

        resolve(entry.value);
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  private async setInIndexedDB<T>(entry: CacheEntry<T>): Promise<void> {
    const db = this.db;
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async removeFromIndexedDB(key: string): Promise<void> {
    const db = this.db;
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    const db = this.db;
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Cache eviction strategies
  private async applyEvictionStrategy(
    newItemSize: number,
    config: CacheConfig,
  ): Promise<void> {
    const currentSize = this.calculateCacheSize();

    if (currentSize + newItemSize <= (config.maxSize || Infinity)) {
      return;
    }

    switch (config.strategy) {
      case 'lru':
        await this.evictLRU(newItemSize, config);
        break;
      case 'lfu':
        await this.evictLFU(newItemSize, config);
        break;
      case 'fifo':
        await this.evictFIFO(newItemSize, config);
        break;
    }
  }

  private async evictLRU(
    targetSize: number,
    config: CacheConfig,
  ): Promise<void> {
    const entries = Array.from(this.memoryCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );

    let freedSize = 0;
    for (const [key, entry] of entries) {
      if (freedSize >= targetSize) break;
      freedSize += entry.size || 0;
      await this.remove(key, config);
    }
  }

  private async evictLFU(
    targetSize: number,
    config: CacheConfig,
  ): Promise<void> {
    const entries = Array.from(this.memoryCache.entries()).sort(
      (a, b) => (a[1].hits || 0) - (b[1].hits || 0),
    );

    let freedSize = 0;
    for (const [key, entry] of entries) {
      if (freedSize >= targetSize) break;
      freedSize += entry.size || 0;
      await this.remove(key, config);
    }
  }

  private async evictFIFO(
    targetSize: number,
    config: CacheConfig,
  ): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());

    let freedSize = 0;
    for (const [key, entry] of entries) {
      if (freedSize >= targetSize) break;
      freedSize += entry.size || 0;
      await this.remove(key, config);
    }
  }

  // Utility methods

  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate in bytes
    } catch {
      return 0;
    }
  }

  private calculateCacheSize(): number {
    let size = 0;
    this.memoryCache.forEach((entry) => {
      size += entry.size || 0;
    });
    return size;
  }

  private updateCacheStats(): void {
    this.cacheStats.itemCount = this.memoryCache.size;
    this.cacheStats.size = this.calculateCacheSize();
  }

  private updateHitRate(): void {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0 ? this.cacheStats.hits / total : 0;
  }

  private resetCacheStats(): void {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0,
      itemCount: 0,
      hitRate: 0,
    };
  }

  // Cleanup expired entries periodically
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Every minute
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();

    this.memoryCache.forEach((entry, key) => {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    });

    this.updateCacheStats();
  }

  // Public API

  /**
   * Retrieves stats.
   * @returns The CacheStats.
   */
  public getStats(): CacheStats {
    return { ...this.cacheStats };
  }

  /**
   * Performs the preload operation.
   * @param keys - The keys.
   * @param factory - The factory.
   * @param config - The config.
   */
  public preload<T>(
    keys: string[],
    factory: (key: string) => Observable<T>,
    config?: CacheConfig,
  ): void {
    keys.forEach((key) => {
      this.cache(key, () => factory(key), config).subscribe();
    });
  }

  /**
   * Performs the invalidate operation.
   * @param pattern - The pattern.
   */
  public invalidate(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    this.memoryCache.forEach((_, key) => {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    });

    this.updateCacheStats();
  }
}
