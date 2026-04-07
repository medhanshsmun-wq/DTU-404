// ============================================================
// CACHE — In-Memory LRU Cache for LLM Responses
// ============================================================
// Prevents redundant Gemini API calls for near-identical inputs.
// Keyed by a hash of the input description/signals.
// TTL: 5 minutes per entry.  Max: 100 entries (LRU eviction).
// ============================================================

const MAX_SIZE = 100;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

class LRUCache {
  constructor(maxSize = MAX_SIZE, ttlMs = DEFAULT_TTL_MS) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map(); // Map preserves insertion order
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate a simple hash key from an object or string.
   */
  static hashKey(input) {
    const str = typeof input === "string" ? input : JSON.stringify(input);
    // Simple djb2 hash — fast, good distribution for short strings
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return hash.toString(36);
  }

  /**
   * Get a cached value. Returns undefined on miss or expiry.
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  /**
   * Set a cached value.
   */
  set(key, value) {
    // Delete first if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Cache stats for debugging.
   */
  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(1) + "%"
        : "N/A",
    };
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// Shared singleton instances
export const llmCache = new LRUCache();
export const cvCache = new LRUCache(50, 2 * 60 * 1000); // smaller, shorter TTL for CV

export { LRUCache };
