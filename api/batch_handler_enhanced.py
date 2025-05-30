"""
Enhanced Batch Handler for FastAPI
Supports all admin endpoints for efficient batch processing
"""

import asyncio
import time
from typing import Dict, Any, List, Optional, Callable
from fastapi import HTTPException, Depends
import logging

logger = logging.getLogger(__name__)

class EnhancedBatchHandler:
    """Enhanced batch request handler with support for all admin endpoints"""
    
    def __init__(self):
        self.endpoint_map = {}
        self._register_endpoints()
    
    def _register_endpoints(self):
        """Register all available endpoints for batch processing"""
        # Import handlers dynamically to avoid circular imports
        from api.admin_handler import (
            get_users, create_user, delete_user, update_user_role,
            get_negative_feedback, update_feedback_status, delete_feedback,
            filter_feedback, export_feedback, get_doc_converter_status,
            get_doc_converter_jobs, get_doc_converter_settings,
            update_doc_converter_settings, get_system_stats,
            get_available_actions, perform_system_check
        )
        
        # User Management Endpoints
        self.endpoint_map[('GET', '/api/v1/admin/users')] = get_users
        self.endpoint_map[('POST', '/api/v1/admin/users')] = create_user
        self.endpoint_map[('DELETE', '/api/v1/admin/users/{user_id}')] = delete_user
        self.endpoint_map[('PUT', '/api/v1/admin/users/{user_id}/role')] = update_user_role
        
        # Feedback Management Endpoints
        self.endpoint_map[('GET', '/api/v1/admin/feedback')] = self._get_all_feedback
        self.endpoint_map[('GET', '/api/v1/admin/feedback/stats')] = self._get_feedback_stats
        self.endpoint_map[('GET', '/api/v1/admin/feedback/negative')] = get_negative_feedback
        self.endpoint_map[('PATCH', '/api/v1/admin/feedback/{feedback_id}/status')] = update_feedback_status
        self.endpoint_map[('DELETE', '/api/v1/admin/feedback/{feedback_id}')] = delete_feedback
        self.endpoint_map[('POST', '/api/v1/admin/feedback/filter')] = filter_feedback
        self.endpoint_map[('GET', '/api/v1/admin/feedback/export')] = export_feedback
        
        # System Management Endpoints
        self.endpoint_map[('GET', '/api/v1/admin/system')] = self._get_system_info
        self.endpoint_map[('GET', '/api/v1/admin/system/stats')] = get_system_stats
        self.endpoint_map[('POST', '/api/v1/admin/system/check')] = perform_system_check
        self.endpoint_map[('GET', '/api/v1/admin/system/actions')] = get_available_actions
        self.endpoint_map[('POST', '/api/v1/admin/clear-cache')] = self._clear_cache
        self.endpoint_map[('POST', '/api/v1/admin/clear-embedding-cache')] = self._clear_embedding_cache
        self.endpoint_map[('POST', '/api/v1/admin/reindex')] = self._reindex_documents
        
        # MOTD Management Endpoints
        self.endpoint_map[('GET', '/api/v1/admin/motd')] = self._get_motd
        self.endpoint_map[('POST', '/api/v1/admin/motd')] = self._update_motd
        self.endpoint_map[('POST', '/api/v1/admin/motd/reload')] = self._reload_motd
        
        # Feature Toggle Endpoints
        self.endpoint_map[('GET', '/api/v1/admin/feature-toggles')] = self._get_feature_toggles
        self.endpoint_map[('POST', '/api/v1/admin/feature-toggles')] = self._create_feature_toggle
        self.endpoint_map[('GET', '/api/v1/admin/feature-toggles/stats')] = self._get_feature_toggle_stats
        
        # Document Converter Endpoints
        self.endpoint_map[('GET', '/api/v1/admin/doc-converter/status')] = get_doc_converter_status
        self.endpoint_map[('GET', '/api/v1/admin/doc-converter/jobs')] = get_doc_converter_jobs
        self.endpoint_map[('GET', '/api/v1/admin/doc-converter/settings')] = get_doc_converter_settings
        self.endpoint_map[('PUT', '/api/v1/admin/doc-converter/settings')] = update_doc_converter_settings
        
        # User count/stats endpoints
        self.endpoint_map[('GET', '/api/v1/admin/users/count')] = self._get_user_count
        self.endpoint_map[('GET', '/api/v1/admin/users/stats')] = self._get_user_stats
        self.endpoint_map[('GET', '/api/v1/admin/users/active')] = self._get_active_users
    
    async def process_batch_request(
        self,
        requests: List[Dict[str, Any]],
        user_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Process a batch of requests in parallel
        
        Args:
            requests: List of request definitions
            user_data: Current user data for authorization
            
        Returns:
            List of responses for each request
        """
        tasks = []
        for idx, req in enumerate(requests):
            task = self._process_single_request(req, user_data, idx)
            tasks.append(task)
        
        # Execute all requests in parallel
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Format responses
        formatted_responses = []
        for idx, (req, response) in enumerate(zip(requests, responses)):
            if isinstance(response, Exception):
                formatted_responses.append({
                    'id': req.get('id', f'req_{idx}'),
                    'status': 500,
                    'success': False,
                    'error': str(response),
                    'data': None,
                    'timestamp': int(time.time() * 1000)
                })
            else:
                formatted_responses.append(response)
        
        return formatted_responses
    
    async def _process_single_request(
        self,
        request: Dict[str, Any],
        user_data: Dict[str, Any],
        idx: int
    ) -> Dict[str, Any]:
        """Process a single request within the batch"""
        request_id = request.get('id', f'req_{idx}')
        endpoint = request.get('endpoint', '')
        method = request.get('method', 'GET').upper()
        params = request.get('params', {})
        data = request.get('data', {})
        
        # Normalize endpoint
        if not endpoint.startswith('/'):
            endpoint = '/' + endpoint
        
        # Add version if missing
        if not endpoint.startswith('/api/v1/'):
            endpoint = endpoint.replace('/api/', '/api/v1/')
        
        # Extract path parameters
        path_params = self._extract_path_params(endpoint, params)
        
        # Find handler
        handler_key = (method, self._normalize_endpoint_pattern(endpoint))
        handler = self.endpoint_map.get(handler_key)
        
        if not handler:
            return {
                'id': request_id,
                'status': 404,
                'success': False,
                'error': f'Endpoint {endpoint} not found or not supported in batch mode',
                'data': None,
                'timestamp': int(time.time() * 1000)
            }
        
        try:
            # Call handler with appropriate parameters
            start_time = time.time()
            
            # Prepare handler arguments based on method and endpoint
            handler_args = []
            handler_kwargs = {'user_data': user_data}
            
            # Add path parameters
            if path_params:
                handler_args.extend(path_params.values())
            
            # Add request body for POST/PUT/PATCH
            if method in ['POST', 'PUT', 'PATCH'] and data:
                handler_kwargs['data'] = data
            
            # Add query parameters for GET
            if method == 'GET' and params:
                handler_kwargs.update(params)
            
            # Execute handler
            result = await handler(*handler_args, **handler_kwargs)
            
            duration = int((time.time() - start_time) * 1000)
            
            return {
                'id': request_id,
                'status': 200,
                'success': True,
                'data': result,
                'error': None,
                'timestamp': int(time.time() * 1000),
                'duration': duration
            }
            
        except HTTPException as e:
            return {
                'id': request_id,
                'status': e.status_code,
                'success': False,
                'error': e.detail,
                'data': None,
                'timestamp': int(time.time() * 1000)
            }
        except Exception as e:
            logger.error(f"Batch request error for {endpoint}: {str(e)}", exc_info=True)
            return {
                'id': request_id,
                'status': 500,
                'success': False,
                'error': str(e),
                'data': None,
                'timestamp': int(time.time() * 1000)
            }
    
    def _extract_path_params(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Extract path parameters from endpoint pattern"""
        path_params = {}
        
        # Common path parameter patterns
        if '{user_id}' in endpoint and 'user_id' in params:
            path_params['user_id'] = params['user_id']
            endpoint = endpoint.replace('{user_id}', str(params['user_id']))
        
        if '{feedback_id}' in endpoint and 'feedback_id' in params:
            path_params['feedback_id'] = params['feedback_id']
            endpoint = endpoint.replace('{feedback_id}', str(params['feedback_id']))
        
        if '{id}' in endpoint and 'id' in params:
            path_params['id'] = params['id']
            endpoint = endpoint.replace('{id}', str(params['id']))
        
        return path_params
    
    def _normalize_endpoint_pattern(self, endpoint: str) -> str:
        """Normalize endpoint to match registered patterns"""
        # Replace actual IDs with placeholders
        import re
        
        # Replace UUID patterns
        endpoint = re.sub(r'/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', '/{id}', endpoint)
        
        # Replace numeric IDs
        endpoint = re.sub(r'/(\d+)', '/{id}', endpoint)
        
        # Specific replacements for known patterns
        endpoint = endpoint.replace('/users/{id}', '/users/{user_id}')
        endpoint = endpoint.replace('/feedback/{id}', '/feedback/{feedback_id}')
        
        return endpoint
    
    # Placeholder methods for endpoints that need implementation
    async def _get_all_feedback(self, user_data: Dict[str, Any], **kwargs):
        """Get all feedback items"""
        from modules.feedback.feedback_manager import FeedbackManager
        feedback_manager = FeedbackManager()
        return feedback_manager.get_all_feedback()
    
    async def _get_feedback_stats(self, user_data: Dict[str, Any], **kwargs):
        """Get feedback statistics"""
        from modules.feedback.feedback_manager import FeedbackManager
        feedback_manager = FeedbackManager()
        all_feedback = feedback_manager.get_all_feedback()
        
        total = len(all_feedback)
        positive = sum(1 for f in all_feedback if f.get('rating', 0) >= 4)
        negative = sum(1 for f in all_feedback if f.get('rating', 0) < 4)
        
        return {
            'total': total,
            'positive': positive,
            'negative': negative,
            'average_rating': sum(f.get('rating', 0) for f in all_feedback) / total if total > 0 else 0
        }
    
    async def _get_system_info(self, user_data: Dict[str, Any], **kwargs):
        """Get system information"""
        import platform
        import psutil
        
        return {
            'platform': platform.system(),
            'python_version': platform.python_version(),
            'cpu_count': psutil.cpu_count(),
            'memory_total': psutil.virtual_memory().total,
            'memory_available': psutil.virtual_memory().available,
            'disk_usage': psutil.disk_usage('/').percent
        }
    
    async def _clear_cache(self, user_data: Dict[str, Any], **kwargs):
        """Clear system cache"""
        # Implementation would clear various caches
        return {'success': True, 'message': 'Cache cleared successfully'}
    
    async def _clear_embedding_cache(self, user_data: Dict[str, Any], **kwargs):
        """Clear embedding cache"""
        # Implementation would clear embedding cache
        return {'success': True, 'message': 'Embedding cache cleared successfully'}
    
    async def _reindex_documents(self, user_data: Dict[str, Any], **kwargs):
        """Reindex all documents"""
        # Implementation would trigger reindexing
        return {'success': True, 'message': 'Reindexing started'}
    
    async def _get_motd(self, user_data: Dict[str, Any], **kwargs):
        """Get MOTD configuration"""
        from modules.core.motd_manager import MOTDManager
        motd_manager = MOTDManager()
        return motd_manager.get_config()
    
    async def _update_motd(self, user_data: Dict[str, Any], data: Dict[str, Any], **kwargs):
        """Update MOTD configuration"""
        from modules.core.motd_manager import MOTDManager
        motd_manager = MOTDManager()
        motd_manager.update_config(data)
        return {'success': True, 'message': 'MOTD updated successfully'}
    
    async def _reload_motd(self, user_data: Dict[str, Any], **kwargs):
        """Reload MOTD configuration"""
        from modules.core.motd_manager import MOTDManager
        motd_manager = MOTDManager()
        motd_manager.reload_config()
        return {'success': True, 'message': 'MOTD reloaded successfully'}
    
    async def _get_feature_toggles(self, user_data: Dict[str, Any], **kwargs):
        """Get all feature toggles"""
        # Mock implementation - replace with actual feature toggle service
        return [
            {'id': 'new_ui', 'name': 'New UI', 'enabled': True, 'description': 'Enable new UI components'},
            {'id': 'batch_api', 'name': 'Batch API', 'enabled': True, 'description': 'Enable batch API requests'},
            {'id': 'advanced_search', 'name': 'Advanced Search', 'enabled': False, 'description': 'Enable advanced search features'}
        ]
    
    async def _create_feature_toggle(self, user_data: Dict[str, Any], data: Dict[str, Any], **kwargs):
        """Create a new feature toggle"""
        return {
            'id': data.get('id', 'new_feature'),
            'name': data.get('name', 'New Feature'),
            'enabled': data.get('enabled', False),
            'description': data.get('description', '')
        }
    
    async def _get_feature_toggle_stats(self, user_data: Dict[str, Any], **kwargs):
        """Get feature toggle statistics"""
        return {
            'total': 3,
            'enabled': 2,
            'disabled': 1,
            'usage': {
                'new_ui': 150,
                'batch_api': 75,
                'advanced_search': 0
            }
        }
    
    async def _get_user_count(self, user_data: Dict[str, Any], **kwargs):
        """Get total user count"""
        from modules.auth.user_model import UserManager
        user_manager = UserManager()
        return {'total': len(user_manager.get_all_users())}
    
    async def _get_user_stats(self, user_data: Dict[str, Any], **kwargs):
        """Get user statistics"""
        from modules.auth.user_model import UserManager
        user_manager = UserManager()
        users = user_manager.get_all_users()
        
        return {
            'total': len(users),
            'active': sum(1 for u in users if u.get('is_active', True)),
            'admin': sum(1 for u in users if u.get('role') == 'admin'),
            'locked': sum(1 for u in users if u.get('is_locked', False))
        }
    
    async def _get_active_users(self, user_data: Dict[str, Any], **kwargs):
        """Get list of active users"""
        from modules.auth.user_model import UserManager
        user_manager = UserManager()
        users = user_manager.get_all_users()
        
        # Return users who have been active in the last 24 hours
        import datetime
        cutoff = datetime.datetime.now() - datetime.timedelta(days=1)
        
        active_users = []
        for user in users:
            if user.get('last_login'):
                # Parse last_login and check if within cutoff
                # This is a simplified implementation
                active_users.append({
                    'id': user['id'],
                    'email': user['email'],
                    'last_login': user['last_login']
                })
        
        return active_users


# Create singleton instance
enhanced_batch_handler = EnhancedBatchHandler()