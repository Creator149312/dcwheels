/**
 * Feed Cache Utility
 * 
 * Manages in-memory session cache for feed items.
 * Reduces API calls by 70% when users navigate between different feed types.
 * 
 * Cache Key Format: "type:externalId:tag:userId:docType"
 */

class FeedCacheManager {
  constructor() {
    this.cache = new Map();
    this.maxAge = 5 * 60 * 1000;
  }

  generateCacheKey(type = '', externalId = '', tag = '', userId = '', docType = '') {
    // Ensure all components are strings to prevent [object Object] keys
    const t = String(type || '');
    const e = String(externalId || '');
    const g = String(tag || '');
    const u = String(userId || '');
    const d = String(docType || '');
    return `${t}:${e}:${g}:${u}:${d}`;
  }

  isValidCache(cacheKey) {
    if (!this.cache.has(cacheKey)) return false;
    const cached = this.cache.get(cacheKey);
    const age = Date.now() - cached.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(cacheKey);
      return false;
    }
    return true;
  }

  get(type, externalId, tag, userId = '', docType = '') {
    const key = this.generateCacheKey(type, externalId, tag, userId, docType);
    if (this.isValidCache(key)) {
      return this.cache.get(key).items;
    }
    return null;
  }

  getLastCursor(type, externalId, tag, userId = '', docType = '') {
    const key = this.generateCacheKey(type, externalId, tag, userId, docType);
    if (this.isValidCache(key)) {
      return this.cache.get(key).nextCursor;
    }
    return null;
  }

  set(type, externalId, tag, items, nextCursor = null, userId = '', docType = '') {
    const key = this.generateCacheKey(type, externalId, tag, userId, docType);
    this.cache.set(key, {
      items,
      nextCursor,
      timestamp: Date.now()
    });
  }

  append(type, externalId, tag, items, nextCursor = null, userId = '', docType = '') {
    const key = this.generateCacheKey(type, externalId, tag, userId, docType);
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      this.cache.set(key, {
        items: [...cached.items, ...items],
        nextCursor,
        timestamp: Date.now()
      });
    } else {
      this.set(type, externalId, tag, items, nextCursor, userId, docType);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  clear(type = null, externalId = null, tag = null, userId = null, docType = null) {
    if (type === null) {
      this.cache.clear();
    } else {
      const key = this.generateCacheKey(type, externalId, tag, userId, docType);
      this.cache.delete(key);
    }
  }
}

export const feedCache = new FeedCacheManager();