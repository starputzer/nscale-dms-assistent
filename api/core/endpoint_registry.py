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
            # Admin Dashboard Endpoints
            EndpointDefinition(
                name="admin_dashboard",
                module_path="api.admin_dashboard_endpoints",
                router_name="router",
                prefix="/api/admin-dashboard",
                tags=["Admin Dashboard"],
                description="Enhanced admin dashboard with comprehensive analytics"
            ),
            EndpointDefinition(
                name="admin_dashboard_standard",
                module_path="api.admin_dashboard_standard_endpoints",
                router_name="router",
                prefix="/api/admin-dashboard-standard",
                tags=["Admin Dashboard"],
                description="Standard admin dashboard endpoints"
            ),
            
            # Admin Management Endpoints
            EndpointDefinition(
                name="admin_users",
                module_path="api.admin_users_endpoints",
                router_name="router",
                prefix="/api/admin/users",
                tags=["Admin Users"],
                description="User management endpoints"
            ),
            EndpointDefinition(
                name="admin_feedback",
                module_path="api.admin_feedback_endpoints",
                router_name="router",
                prefix="/api/admin/feedback",
                tags=["Admin Feedback"],
                description="Feedback management endpoints"
            ),
            EndpointDefinition(
                name="admin_statistics",
                module_path="api.admin_statistics_endpoints",
                router_name="router",
                prefix="/api/admin-statistics",
                tags=["Admin Statistics"],
                description="Statistical analysis endpoints"
            ),
            EndpointDefinition(
                name="admin_system",
                module_path="api.admin_system_endpoints",
                router_name="router",
                prefix="/api/admin/system",
                tags=["Admin System"],
                description="System management endpoints"
            ),
            EndpointDefinition(
                name="admin_system_comprehensive",
                module_path="api.admin_system_comprehensive_endpoints",
                router_name="router",
                prefix="/api/admin-system-comprehensive",
                tags=["Admin System"],
                description="Comprehensive system management"
            ),
            
            # Document Processing Endpoints
            EndpointDefinition(
                name="doc_converter",
                module_path="api.doc_converter_endpoints",
                router_name="router",
                prefix="/api/doc-converter",
                tags=["Document Converter"],
                description="Basic document conversion endpoints"
            ),
            EndpointDefinition(
                name="doc_converter_enhanced",
                module_path="api.doc_converter_enhanced_endpoints",
                router_name="router",
                prefix="/api/doc-converter-enhanced",
                tags=["Document Converter"],
                description="Enhanced document converter with OCR"
            ),
            EndpointDefinition(
                name="advanced_documents",
                module_path="api.advanced_documents_endpoints",
                router_name="router",
                prefix="/api/advanced-documents",
                tags=["Advanced Documents"],
                description="Advanced document processing with AI"
            ),
            EndpointDefinition(
                name="document_upload",
                module_path="api.document_upload_endpoints",
                router_name="router",
                prefix="/api/document-upload",
                tags=["Document Upload"],
                description="Document upload and management"
            ),
            
            # RAG System Endpoints
            EndpointDefinition(
                name="rag",
                module_path="api.rag_endpoints",
                router_name="router",
                prefix="/api/rag",
                tags=["RAG"],
                description="RAG system main endpoints"
            ),
            EndpointDefinition(
                name="rag_settings",
                module_path="api.rag_settings_endpoints",
                router_name="router",
                prefix="/api/rag-settings",
                tags=["RAG Settings"],
                description="RAG configuration and optimization"
            ),
            EndpointDefinition(
                name="rag_health",
                module_path="api.rag_health_check",
                router_name="router",
                prefix="/api/rag",
                tags=["RAG Health"],
                description="RAG system health monitoring"
            ),
            
            # Knowledge Management Endpoints
            EndpointDefinition(
                name="knowledge",
                module_path="api.knowledge_endpoints",
                router_name="router",
                prefix="/api/knowledge",
                tags=["Knowledge Base"],
                description="Knowledge base management"
            ),
            EndpointDefinition(
                name="knowledge_manager",
                module_path="api.knowledge_manager_endpoints",
                router_name="router",
                prefix="/api/knowledge-manager",
                tags=["Knowledge Manager"],
                description="Advanced knowledge management features"
            ),
            
            # System Monitoring Endpoints
            EndpointDefinition(
                name="system_monitor",
                module_path="api.system_monitor_endpoints",
                router_name="router",
                prefix="/api/system-monitor",
                tags=["System Monitor"],
                description="System monitoring and alerts"
            ),
            EndpointDefinition(
                name="performance_monitor",
                module_path="api.performance_monitor_endpoints",
                router_name="router",
                prefix="/api/performance",
                tags=["Performance"],
                description="Performance monitoring and optimization"
            ),
            
            # Background Processing Endpoints
            EndpointDefinition(
                name="background_processing",
                module_path="api.background_processing_endpoints",
                router_name="router",
                prefix="/api/background-processing",
                tags=["Background Processing"],
                description="Background job management"
            ),
            
            # Core API Endpoints
            EndpointDefinition(
                name="documentation",
                module_path="api.documentation_api",
                router_name="router",
                prefix="/api/documentation",
                tags=["Documentation"],
                description="API documentation endpoints"
            ),
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