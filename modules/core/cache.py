"""
Cache Manager
Simple in-memory cache implementation
"""

from typing import Dict, Any, Optional
import time

class CacheManager:
    """Simple cache manager"""
    
    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key in self.cache:
            entry = self.cache[key]
            if entry['expires'] > time.time():
                return entry['value']
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: int = 3600):
        """Set value in cache with TTL"""
        self.cache[key] = {
            'value': value,
            'expires': time.time() + ttl
        }
    
    def clear_all(self):
        """Clear all cache entries"""
        self.cache.clear()
    
    def clear_expired(self):
        """Clear expired entries"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self.cache.items()
            if entry['expires'] <= current_time
        ]
        for key in expired_keys:
            del self.cache[key]

# Global cache instance
cache_manager = CacheManager()