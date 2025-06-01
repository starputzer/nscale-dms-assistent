"""FastAPI Batch Handler for parallel API request processing"""

import json
import time
import traceback
import asyncio
import httpx
from typing import Dict, List, Any, Optional, Union
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)

# Pydantic models for request/response validation
class BatchRequest(BaseModel):
    id: str = Field(..., description="Unique request identifier")
    endpoint: str = Field(..., description="API endpoint to call")
    method: str = Field(default="GET", description="HTTP method")
    params: Optional[Dict[str, Any]] = Field(default={}, description="Query parameters")
    data: Optional[Dict[str, Any]] = Field(default={}, description="Request body data")
    headers: Optional[Dict[str, str]] = Field(default={}, description="Additional headers")
    timeout: Optional[int] = Field(default=30, description="Request timeout in seconds")

class BatchRequestContainer(BaseModel):
    requests: List[BatchRequest] = Field(..., description="List of batch requests")

class BatchResponse(BaseModel):
    id: str
    status: int
    success: bool
    error: Optional[str]
    data: Optional[Any]
    timestamp: int
    duration: int
    request: BatchRequest

class BatchResponseContainer(BaseModel):
    success: bool
    responses: List[BatchResponse]
    count: int
    timestamp: int

# Create router
router = APIRouter(prefix="/api/batch", tags=["batch"])

class BatchProcessor:
    """Processor for parallel API requests"""
    
    def __init__(self, max_concurrent_requests: int = 10):
        self.max_concurrent_requests = max_concurrent_requests
        self.request_semaphore = asyncio.Semaphore(max_concurrent_requests)
        self.client: Optional[httpx.AsyncClient] = None
    
    async def initialize(self):
        """Initialize the httpx client"""
        if self.client is None:
            self.client = httpx.AsyncClient(
                timeout=httpx.Timeout(60.0, connect=10.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=20)
            )
    
    async def close(self):
        """Close the httpx client"""
        if self.client:
            await self.client.aclose()
            self.client = None
    
    async def process_batch(self, requests: List[BatchRequest], base_url: str) -> List[BatchResponse]:
        """Process a batch of API requests in parallel"""
        await self.initialize()
        
        # Create tasks for all requests
        tasks = [
            self.process_request(req, base_url)
            for req in requests
        ]
        
        # Execute all requests in parallel
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to error responses
        final_responses = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                final_responses.append(BatchResponse(
                    id=requests[i].id,
                    status=500,
                    success=False,
                    error=str(response),
                    data=None,
                    timestamp=int(time.time() * 1000),
                    duration=0,
                    request=requests[i]
                ))
            else:
                final_responses.append(response)
        
        return final_responses
    
    async def process_request(self, request_data: BatchRequest, base_url: str) -> BatchResponse:
        """Process a single API request"""
        start_time = time.time()
        
        # Build full URL
        if request_data.endpoint.startswith('/'):
            url = f"{base_url}{request_data.endpoint}"
        else:
            url = request_data.endpoint
        
        response = BatchResponse(
            id=request_data.id,
            status=500,
            success=False,
            error="Unknown error",
            data=None,
            timestamp=int(time.time() * 1000),
            duration=0,
            request=request_data
        )
        
        try:
            async with self.request_semaphore:
                # Build request parameters
                request_kwargs = {
                    "method": request_data.method.upper(),
                    "url": url,
                    "params": request_data.params,
                    "headers": request_data.headers or {},
                    "timeout": request_data.timeout
                }
                
                # Add body data for appropriate methods
                if request_data.method.upper() in ["POST", "PUT", "PATCH"]:
                    request_kwargs["json"] = request_data.data
                
                # Execute request
                resp = await self.client.request(**request_kwargs)
                
                # Parse response
                try:
                    resp_data = resp.json()
                except:
                    resp_data = resp.text
                
                # Update response
                response.status = resp.status_code
                response.success = 200 <= resp.status_code < 300
                response.data = resp_data
                response.error = None if response.success else f"HTTP error {resp.status_code}"
        
        except httpx.TimeoutException:
            response.status = 0
            response.success = False
            response.error = "Request timeout"
            response.data = None
        
        except httpx.NetworkError as e:
            response.status = 0
            response.success = False
            response.error = f"Network error: {str(e)}"
            response.data = None
        
        except Exception as e:
            response.status = 500
            response.success = False
            response.error = f"Internal error: {str(e)}"
            response.data = None
            logger.error(f"Batch request error: {traceback.format_exc()}")
        
        finally:
            # Calculate duration
            duration = int((time.time() - start_time) * 1000)
            response.duration = duration
        
        return response

# Global processor instance
processor = BatchProcessor(max_concurrent_requests=10)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for cleanup"""
    yield
    # Cleanup on shutdown
    await processor.close()

@router.post("", response_model=BatchResponseContainer)
async def handle_batch(
    batch_request: BatchRequestContainer,
    request: Request
) -> BatchResponseContainer:
    """
    Process multiple API requests in parallel.
    
    This endpoint accepts a batch of API requests and executes them
    concurrently, returning all responses once complete.
    """
    # Get base URL from request
    base_url = str(request.base_url).rstrip('/')
    
    # Validate batch size
    max_batch_size = 20  # Configurable
    if len(batch_request.requests) > max_batch_size:
        raise HTTPException(
            status_code=400,
            detail=f"Batch size exceeds maximum of {max_batch_size} requests"
        )
    
    # Handle empty batch
    if not batch_request.requests:
        return BatchResponseContainer(
            success=True,
            responses=[],
            count=0,
            timestamp=int(time.time() * 1000)
        )
    
    try:
        # Process batch
        responses = await processor.process_batch(batch_request.requests, base_url)
        
        return BatchResponseContainer(
            success=True,
            responses=responses,
            count=len(responses),
            timestamp=int(time.time() * 1000)
        )
    
    except Exception as e:
        logger.error(f"Batch processing error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/health")
async def batch_health_check():
    """Health check endpoint for batch processor"""
    return {
        "status": "healthy",
        "processor": {
            "max_concurrent_requests": processor.max_concurrent_requests,
            "client_active": processor.client is not None
        },
        "timestamp": int(time.time() * 1000)
    }