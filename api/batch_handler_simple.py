"""
Simplified Batch Handler for FastAPI
Temporary replacement until enhanced version is fixed
"""

from typing import Dict, Any, List
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

async def handle_batch_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simple batch request handler that just returns a mock response
    This is a placeholder until the enhanced version is properly converted to FastAPI
    """
    logger.warning("Using simplified batch handler - enhanced version needs FastAPI conversion")
    
    # Validate request
    if 'requests' not in request_data:
        raise HTTPException(status_code=400, detail="Missing requests array")
    
    requests = request_data.get('requests', [])
    if not isinstance(requests, list):
        raise HTTPException(status_code=400, detail="Requests must be an array")
    
    # Return mock response
    return {
        'success': True,
        'data': {
            'responses': [
                {
                    'id': req.get('id', 'unknown'),
                    'status': 200,
                    'success': True,
                    'data': {'message': 'Mock response - batch handler not fully implemented'},
                    'error': None
                }
                for req in requests
            ],
            'count': len(requests),
            'timestamp': '2025-05-30T12:00:00Z'
        }
    }