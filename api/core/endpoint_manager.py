"""
Endpoint Manager - Handles dynamic loading and registration of API endpoints
"""

import importlib
import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse

from .endpoint_registry import EndpointRegistry, EndpointDefinition

logger = logging.getLogger(__name__)

class EndpointManager:
    """Manages the loading and registration of API endpoints"""
    
    def __init__(self, app: FastAPI):
        self.app = app
        self.registry = EndpointRegistry()
        self.loaded_routers: Dict[str, APIRouter] = {}
        self.failed_endpoints: List[str] = []
    
    def load_endpoint(self, endpoint: EndpointDefinition) -> Optional[APIRouter]:
        """Load a single endpoint module"""
        try:
            logger.info(f"Loading endpoint: {endpoint.name}")
            module = importlib.import_module(endpoint.module_path)
            router = getattr(module, endpoint.router_name, None)
            
            if router and isinstance(router, APIRouter):
                self.loaded_routers[endpoint.name] = router
                logger.info(f"✓ Successfully loaded: {endpoint.name}")
                return router
            else:
                logger.error(f"✗ No router found in {endpoint.module_path}")
                self.failed_endpoints.append(endpoint.name)
                return None
                
        except ImportError as e:
            logger.error(f"✗ Failed to import {endpoint.name}: {e}")
            self.failed_endpoints.append(endpoint.name)
            return None
        except Exception as e:
            logger.error(f"✗ Unexpected error loading {endpoint.name}: {e}")
            self.failed_endpoints.append(endpoint.name)
            return None
    
    def register_endpoint(self, endpoint: EndpointDefinition, router: APIRouter) -> bool:
        """Register a loaded router with the FastAPI app"""
        try:
            self.app.include_router(
                router,
                prefix=endpoint.prefix,
                tags=endpoint.tags
            )
            logger.info(f"✓ Registered {endpoint.name} at {endpoint.prefix}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to register {endpoint.name}: {e}")
            return False
    
    def load_all_endpoints(self) -> Dict[str, Any]:
        """Load and register all enabled endpoints"""
        logger.info("=" * 60)
        logger.info("Starting endpoint loading process...")
        logger.info("=" * 60)
        
        enabled_endpoints = self.registry.get_enabled_endpoints()
        total = len(enabled_endpoints)
        successful = 0
        
        for endpoint in enabled_endpoints:
            router = self.load_endpoint(endpoint)
            if router and self.register_endpoint(endpoint, router):
                successful += 1
        
        # Summary
        logger.info("=" * 60)
        logger.info(f"Endpoint loading complete:")
        logger.info(f"  Total endpoints: {total}")
        logger.info(f"  Successfully loaded: {successful}")
        logger.info(f"  Failed: {len(self.failed_endpoints)}")
        
        if self.failed_endpoints:
            logger.warning(f"  Failed endpoints: {', '.join(self.failed_endpoints)}")
        
        logger.info("=" * 60)
        
        return {
            "total": total,
            "successful": successful,
            "failed": len(self.failed_endpoints),
            "failed_endpoints": self.failed_endpoints
        }
    
    def get_endpoint_status(self) -> Dict[str, Any]:
        """Get current status of all endpoints"""
        all_endpoints = self.registry.endpoints
        return {
            "total_defined": len(all_endpoints),
            "enabled": len([e for e in all_endpoints if e.enabled]),
            "loaded": len(self.loaded_routers),
            "failed": len(self.failed_endpoints),
            "endpoints": [
                {
                    "name": ep.name,
                    "prefix": ep.prefix,
                    "enabled": ep.enabled,
                    "loaded": ep.name in self.loaded_routers,
                    "description": ep.description
                }
                for ep in all_endpoints
            ]
        }
    
    def reload_endpoint(self, name: str) -> bool:
        """Reload a specific endpoint"""
        endpoint = self.registry.get_endpoint_by_name(name)
        if not endpoint:
            logger.error(f"Endpoint {name} not found")
            return False
        
        # Remove from failed list if present
        if name in self.failed_endpoints:
            self.failed_endpoints.remove(name)
        
        # Try to load and register
        router = self.load_endpoint(endpoint)
        if router:
            return self.register_endpoint(endpoint, router)
        
        return False
    
    def add_management_endpoints(self):
        """Add endpoint management routes to the API"""
        management_router = APIRouter()
        
        @management_router.get("/status")
        async def get_endpoints_status():
            """Get status of all registered endpoints"""
            return self.get_endpoint_status()
        
        @management_router.post("/reload/{endpoint_name}")
        async def reload_endpoint(endpoint_name: str):
            """Reload a specific endpoint"""
            success = self.reload_endpoint(endpoint_name)
            return {
                "success": success,
                "message": f"Endpoint {endpoint_name} {'reloaded successfully' if success else 'failed to reload'}"
            }
        
        @management_router.put("/enable/{endpoint_name}")
        async def enable_endpoint(endpoint_name: str):
            """Enable an endpoint"""
            success = self.registry.enable_endpoint(endpoint_name)
            if success:
                # Try to load it
                reload_success = self.reload_endpoint(endpoint_name)
                return {
                    "success": reload_success,
                    "message": f"Endpoint {endpoint_name} enabled and {'loaded' if reload_success else 'failed to load'}"
                }
            return {
                "success": False,
                "message": f"Endpoint {endpoint_name} not found"
            }
        
        @management_router.put("/disable/{endpoint_name}")
        async def disable_endpoint(endpoint_name: str):
            """Disable an endpoint"""
            success = self.registry.disable_endpoint(endpoint_name)
            return {
                "success": success,
                "message": f"Endpoint {endpoint_name} {'disabled' if success else 'not found'}"
            }
        
        # Register management router
        self.app.include_router(
            management_router,
            prefix="/api/endpoints",
            tags=["Endpoint Management"]
        )
        logger.info("✓ Added endpoint management routes at /api/endpoints")