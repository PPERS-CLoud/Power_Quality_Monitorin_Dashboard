/**
 * Simple cache service for power readings data
 */
class CacheService {
    constructor() {
        this.cache = {};
    }
    
    /**
     * Get cache key for node, year, month, day combination
     * @param {string} node - Node ID
     * @param {string} year - Year
     * @param {string} month - Month
     * @param {string} day - Day
     * @returns {string} Cache key
     */
    getCacheKey(node, year, month, day) {
        return `${node}_${year}_${month}_${day}`;
    }
    
    /**
     * Check if data exists in cache
     * @param {string} node - Node ID
     * @param {string} year - Year
     * @param {string} month - Month
     * @param {string} day - Day
     * @returns {Array|null} Cached data or null
     */
    checkCache(node, year, month, day) {
        const key = this.getCacheKey(node, year, month, day);
        return this.cache[key] || null;
    }
    
    /**
     * Add data to cache
     * @param {string} node - Node ID
     * @param {string} year - Year
     * @param {string} month - Month
     * @param {string} day - Day
     * @param {Array} data - Data to cache
     */
    addToCache(node, year, month, day, data) {
        const key = this.getCacheKey(node, year, month, day);
        this.cache[key] = data;
    }
    
    /**
     * Clear cache for a specific node or all cache
     * @param {string} [node] - Optional node ID to clear
     */
    clearCache(node) {
        if (node) {
            // Clear only keys for this node
            Object.keys(this.cache).forEach(key => {
                if (key.startsWith(`${node}_`)) {
                    delete this.cache[key];
                }
            });
        } else {
            // Clear all cache
            this.cache = {};
        }
    }
    
    /**
     * Get all cached nodes
     * @returns {string[]} Array of node IDs with cached data
     */
    getCachedNodes() {
        const nodes = new Set();
        Object.keys(this.cache).forEach(key => {
            const nodePart = key.split('_')[0];
            nodes.add(nodePart);
        });
        return Array.from(nodes);
    }
}

// Create a singleton instance
const cacheService = new CacheService();
export default cacheService;