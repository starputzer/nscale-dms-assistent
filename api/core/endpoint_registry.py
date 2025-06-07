"""
Endpoint Registry - Central definition of all API endpoints
"""

from dataclasses import dataclass
from typing import List, Optional, Any
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

@dataclass
class EndpointDefinition:
    """Definition for a single endpoint module"""
    name: str
    module_path: str
    router_name: str
    prefix: str
    tags: List[str]
    description: str
    enabled: bool = True

class EndpointRegistry:
    """Registry for all API endpoints"""
    
    def __init__(self):
        self.endpoints = self._define_endpoints()
    
    def _define_endpoints(self) -> List[EndpointDefinition]:
        """Define all available endpoints"""
        return [
            # Core API Endpoints (still in api/ directory)
            EndpointDefinition(
                name="documentation",
                module_path="api.documentation_api",
                router_name="router",
                prefix="/api/documentation",
                tags=["Documentation"],
                description="API documentation endpoints"
            ),
            
            # Note: All other endpoints have been migrated to modules/
            # and are loaded directly by server.py
            # This registry is kept for backward compatibility
            # and will be removed in a future version
        ]
    
    def get_enabled_endpoints(self) -> List[EndpointDefinition]:
        """Get all enabled endpoints"""
        return [ep for ep in self.endpoints if ep.enabled]
    
    def get_endpoint_by_name(self, name: str) -> Optional[EndpointDefinition]:
        """Get endpoint definition by name"""
        for ep in self.endpoints:
            if ep.name == name:
                return ep
        return None
    
    def disable_endpoint(self, name: str) -> bool:
        """Disable an endpoint by name"""
        ep = self.get_endpoint_by_name(name)
        if ep:
            ep.enabled = False
            return True
        return False
    
    def enable_endpoint(self, name: str) -> bool:
        """Enable an endpoint by name"""
        ep = self.get_endpoint_by_name(name)
        if ep:
            ep.enabled = True
            return True
        return False