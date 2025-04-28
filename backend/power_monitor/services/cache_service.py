import time
from datetime import datetime, timedelta

class CacheService:
    _instance = None  # Singleton instance
    _cache = {}       # In-memory cache
    _cache_ttl = {}   # Cache expiration times
    
    def __new__(cls):
        """Ensures only one instance of CacheService exists."""
        if cls._instance is None:
            cls._instance = super(CacheService, cls).__new__(cls)
            cls._instance.initialize()
        return cls._instance
    
    def initialize(self):
        """Initialize the cache service."""
        self._cache = {}
        self._cache_ttl = {}
        self._default_ttl = 3600  # Default TTL: 1 hour (in seconds)
    
    def get_cache_key(self, node, year, month, day):
        """Generate consistent cache key."""
        return f"{node}_{year}_{month}_{day}"
    
    def get(self, node, year, month, day):
        """Get data from cache if it exists and hasn't expired."""
        key = self.get_cache_key(node, year, month, day)
        
        # Check if key exists in cache
        if key in self._cache:
            # Check if cache has expired
            if key in self._cache_ttl and self._cache_ttl[key] > time.time():
                print(f"Cache hit for {key}")
                return self._cache[key]
            else:
                # Cache expired, remove it
                print(f"Cache expired for {key}")
                if key in self._cache:
                    del self._cache[key]
                if key in self._cache_ttl:
                    del self._cache_ttl[key]
        
        print(f"Cache miss for {key}")
        return None
    
    def set(self, node, year, month, day, data, ttl=None):
        """Store data in cache with expiration time."""
        key = self.get_cache_key(node, year, month, day)
        
        # Store the data
        self._cache[key] = data
        
        # Set expiration time
        ttl = ttl or self._default_ttl
        self._cache_ttl[key] = time.time() + ttl
        
        print(f"Cached {len(data)} readings for {key}, expires in {ttl} seconds")
        return True
    
    def clear(self, node=None):
        """Clear all cache or just for a specific node."""
        if node:
            # Clear only keys belonging to the specified node
            keys_to_remove = [k for k in self._cache.keys() if k.startswith(f"{node}_")]
            for key in keys_to_remove:
                if key in self._cache:
                    del self._cache[key]
                if key in self._cache_ttl:
                    del self._cache_ttl[key]
            print(f"Cleared cache for node {node}")
        else:
            # Clear all cache
            self._cache = {}
            self._cache_ttl = {}
            print("Cleared all cache")
        
        return True
    
    def get_cached_nodes(self):
        """Get a list of nodes that have cached data."""
        # Extract unique node IDs from cache keys
        nodes = set()
        for key in self._cache.keys():
            parts = key.split('_')
            if len(parts) > 0:
                nodes.add(parts[0])
        
        return list(nodes)
    
    def get_cache_stats(self):
        """Get statistics about the cache."""
        # Count items by node
        node_counts = {}
        for key in self._cache.keys():
            parts = key.split('_')
            if len(parts) > 0:
                node = parts[0]
                if node in node_counts:
                    node_counts[node] += 1
                else:
                    node_counts[node] = 1
        
        total_items = len(self._cache)
        total_nodes = len(node_counts)
        
        # Calculate expiration
        now = time.time()
        active_ttls = [ttl - now for ttl in self._cache_ttl.values() if ttl > now]
        avg_ttl_remaining = sum(active_ttls) / len(active_ttls) if active_ttls else 0
        
        return {
            "total_cached_items": total_items,
            "total_nodes_cached": total_nodes,
            "items_by_node": node_counts,
            "avg_seconds_remaining": int(avg_ttl_remaining)
        }