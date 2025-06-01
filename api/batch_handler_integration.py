"""
Batch Handler Integration Module

This module provides a safe integration path for batch_handler_fix.py
to be used in the main server.py without breaking existing functionality.
"""

from typing import Dict, List, Any
from batch_handler_fix import handle_batch_request
import logging

logger = logging.getLogger(__name__)

def create_batch_endpoint_with_real_data(app, user_manager, chat_history):
    """
    Creates a new batch endpoint that uses real chat_history data
    instead of mock implementations.
    
    This function can be imported and called from server.py to upgrade
    the batch endpoint safely.
    """
    
    from fastapi import Request, HTTPException, Depends
    from typing import Dict, Any
    import time
    
    # Import the dependency from server
    from server import get_current_user
    
    @app.post("/api/v1/batch/real")
    async def handle_batch_real(
        request: Request, 
        user_data: Dict[str, Any] = Depends(get_current_user)
    ):
        """
        Real batch API implementation using chat_history.
        
        This endpoint can be tested alongside the existing mock implementation
        before fully replacing it.
        """
        try:
            data = await request.json()
            
            if not isinstance(data, dict) or 'requests' not in data:
                raise HTTPException(
                    status_code=400, 
                    detail="Invalid request format, missing 'requests' array"
                )
            
            requests_list = data.get('requests', [])
            
            if not isinstance(requests_list, list):
                raise HTTPException(
                    status_code=400, 
                    detail="Requests must be an array"
                )
            
            # Use the real batch handler
            result = handle_batch_request(
                requests=requests_list,
                user_data=user_data,
                chat_history=chat_history
            )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in real batch handler: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )
    
    logger.info("Real batch endpoint registered at /api/v1/batch/real")
    return handle_batch_real

def upgrade_existing_batch_endpoint(app, chat_history):
    """
    Upgrades the existing batch endpoint to use real data.
    
    This function modifies the existing endpoint handlers to use
    the real batch_handler_fix implementation.
    """
    # Find and replace the existing handlers
    for route in app.routes:
        if hasattr(route, 'path') and route.path in ['/api/batch', '/api/v1/batch']:
            if hasattr(route, 'endpoint'):
                logger.info(f"Found existing batch endpoint at {route.path}")
                # Store original for rollback if needed
                original_endpoint = route.endpoint
                
                # Create new endpoint function
                async def new_batch_endpoint(request: Request, user_data: Dict[str, Any]):
                    try:
                        data = await request.json()
                        requests_list = data.get('requests', [])
                        
                        # Use real handler
                        return handle_batch_request(
                            requests=requests_list,
                            user_data=user_data,
                            chat_history=chat_history
                        )
                    except Exception as e:
                        logger.error(f"Error in upgraded batch handler: {e}")
                        # Could fall back to original_endpoint here if needed
                        raise
                
                # Replace endpoint
                route.endpoint = new_batch_endpoint
                logger.info(f"Upgraded batch endpoint at {route.path}")
    
    return True