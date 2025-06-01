import asyncio
import json
import time
import uuid
from typing import Dict, List, Optional, Any, AsyncGenerator
from dataclasses import dataclass, asdict
from collections import defaultdict
from fastapi import Request
from fastapi.responses import StreamingResponse
import logging

logger = logging.getLogger(__name__)

@dataclass
class StreamingConnection:
    """Represents a streaming connection"""
    connection_id: str
    user_id: str
    session_id: str
    started_at: float
    last_heartbeat: float
    tokens_sent: int = 0
    errors: int = 0
    reconnects: int = 0

@dataclass
class StreamingMetadata:
    """Metadata about the streaming response"""
    model: str
    temperature: float
    max_tokens: int
    tools: List[str]
    estimated_duration: int  # milliseconds
    token_count: int = 0

class ConnectionManager:
    """Manages streaming connections"""
    
    def __init__(self, max_connections_per_user: int = 5):
        self.connections: Dict[str, StreamingConnection] = {}
        self.user_connections: Dict[str, List[str]] = defaultdict(list)
        self.max_connections_per_user = max_connections_per_user
        self._cleanup_task = None
        
    async def start(self):
        """Start the connection manager"""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        
    async def stop(self):
        """Stop the connection manager"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            
    async def _cleanup_loop(self):
        """Periodically clean up stale connections"""
        while True:
            try:
                await asyncio.sleep(60)  # Every minute
                await self.cleanup_stale_connections()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
                
    async def cleanup_stale_connections(self, timeout: int = 300):
        """Remove connections that haven't sent heartbeat in timeout seconds"""
        now = time.time()
        stale_connections = []
        
        for conn_id, conn in self.connections.items():
            if now - conn.last_heartbeat > timeout:
                stale_connections.append(conn_id)
                
        for conn_id in stale_connections:
            await self.remove_connection(conn_id)
            logger.info(f"Cleaned up stale connection: {conn_id}")
            
    async def add_connection(
        self,
        user_id: str,
        session_id: str
    ) -> StreamingConnection:
        """Add a new streaming connection"""
        # Check user connection limit
        user_conns = self.user_connections[user_id]
        if len(user_conns) >= self.max_connections_per_user:
            # Remove oldest connection
            oldest = user_conns[0]
            await self.remove_connection(oldest)
            
        # Create new connection
        connection = StreamingConnection(
            connection_id=str(uuid.uuid4()),
            user_id=user_id,
            session_id=session_id,
            started_at=time.time(),
            last_heartbeat=time.time()
        )
        
        self.connections[connection.connection_id] = connection
        self.user_connections[user_id].append(connection.connection_id)
        
        logger.info(f"Added streaming connection: {connection.connection_id}")
        return connection
        
    async def remove_connection(self, connection_id: str):
        """Remove a streaming connection"""
        conn = self.connections.pop(connection_id, None)
        if conn:
            self.user_connections[conn.user_id].remove(connection_id)
            logger.info(f"Removed streaming connection: {connection_id}")
            
    async def update_heartbeat(self, connection_id: str):
        """Update connection heartbeat"""
        if connection_id in self.connections:
            self.connections[connection_id].last_heartbeat = time.time()
            
    async def increment_tokens(self, connection_id: str, count: int = 1):
        """Increment token count for connection"""
        if connection_id in self.connections:
            self.connections[connection_id].tokens_sent += count
            
    async def increment_errors(self, connection_id: str):
        """Increment error count for connection"""
        if connection_id in self.connections:
            self.connections[connection_id].errors += 1
            
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_connections": len(self.connections),
            "connections_by_user": {
                user: len(conns) 
                for user, conns in self.user_connections.items()
            },
            "total_tokens_sent": sum(
                conn.tokens_sent for conn in self.connections.values()
            ),
            "total_errors": sum(
                conn.errors for conn in self.connections.values()
            )
        }

class TokenBatcher:
    """Batches tokens for efficient streaming"""
    
    def __init__(
        self,
        batch_size: int = 5,
        flush_interval: float = 0.1,
        adaptive: bool = True
    ):
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.adaptive = adaptive
        self.buffer: List[str] = []
        self.last_flush = time.time()
        self.performance_history: List[float] = []
        
    def add_token(self, token: str) -> Optional[str]:
        """Add token to buffer, return batch if ready"""
        self.buffer.append(token)
        
        # Check if we should flush
        should_flush = (
            len(self.buffer) >= self.batch_size or
            (time.time() - self.last_flush) >= self.flush_interval
        )
        
        if should_flush:
            return self.flush()
            
        return None
        
    def flush(self) -> Optional[str]:
        """Flush the buffer"""
        if not self.buffer:
            return None
            
        batch = "".join(self.buffer)
        self.buffer = []
        self.last_flush = time.time()
        
        # Track performance for adaptive batching
        if self.adaptive and len(self.performance_history) > 0:
            self._adapt_batch_size()
            
        return batch
        
    def _adapt_batch_size(self):
        """Adapt batch size based on performance"""
        # Simple adaptation: increase batch size if performance is good
        avg_time = sum(self.performance_history[-10:]) / min(10, len(self.performance_history))
        
        if avg_time < self.flush_interval * 0.5:
            self.batch_size = min(self.batch_size + 1, 20)
        elif avg_time > self.flush_interval * 1.5:
            self.batch_size = max(self.batch_size - 1, 1)

class ProgressTracker:
    """Tracks streaming progress"""
    
    def __init__(self, estimated_tokens: int = 100):
        self.estimated_tokens = estimated_tokens
        self.tokens_sent = 0
        self.start_time = time.time()
        self.token_times: List[float] = []
        
    def add_token(self):
        """Record a token was sent"""
        self.tokens_sent += 1
        self.token_times.append(time.time())
        
    def get_progress(self) -> Dict[str, Any]:
        """Get current progress"""
        if self.tokens_sent == 0:
            return {
                "progress": 0,
                "estimated_time_remaining": self.estimated_tokens * 100,  # ms
                "tokens_per_second": 0
            }
            
        # Calculate tokens per second
        elapsed = time.time() - self.start_time
        tokens_per_second = self.tokens_sent / elapsed if elapsed > 0 else 0
        
        # Estimate remaining time
        remaining_tokens = max(0, self.estimated_tokens - self.tokens_sent)
        estimated_time_remaining = (
            (remaining_tokens / tokens_per_second * 1000) 
            if tokens_per_second > 0 else 0
        )
        
        # Calculate progress percentage
        progress = min(100, (self.tokens_sent / self.estimated_tokens) * 100)
        
        return {
            "progress": progress,
            "estimated_time_remaining": int(estimated_time_remaining),
            "tokens_per_second": round(tokens_per_second, 2),
            "tokens_sent": self.tokens_sent,
            "estimated_total": self.estimated_tokens
        }

async def create_enhanced_sse_response(
    request: Request,
    generator: AsyncGenerator[str, None],
    connection: StreamingConnection,
    metadata: StreamingMetadata,
    connection_manager: ConnectionManager,
    enable_heartbeat: bool = True,
    heartbeat_interval: int = 30
) -> StreamingResponse:
    """Create an enhanced SSE response with all features"""
    
    async def enhanced_generator():
        batcher = TokenBatcher()
        progress_tracker = ProgressTracker(metadata.estimated_duration // 100)
        last_heartbeat = time.time()
        
        try:
            # Send initial metadata
            yield f"event: metadata\ndata: {json.dumps(asdict(metadata))}\n\n"
            
            # Stream tokens
            async for token in generator:
                # Update progress
                progress_tracker.add_token()
                await connection_manager.increment_tokens(connection.connection_id)
                
                # Batch tokens
                batch = batcher.add_token(token)
                if batch:
                    yield f"event: token\ndata: {json.dumps({'content': batch})}\n\n"
                    
                # Send progress update every 10 tokens
                if progress_tracker.tokens_sent % 10 == 0:
                    progress = progress_tracker.get_progress()
                    yield f"event: progress\ndata: {json.dumps(progress)}\n\n"
                    
                # Send heartbeat if needed
                if enable_heartbeat and (time.time() - last_heartbeat) > heartbeat_interval:
                    yield f"event: heartbeat\ndata: {json.dumps({'timestamp': int(time.time())})}\n\n"
                    await connection_manager.update_heartbeat(connection.connection_id)
                    last_heartbeat = time.time()
                    
            # Flush remaining tokens
            final_batch = batcher.flush()
            if final_batch:
                yield f"event: token\ndata: {json.dumps({'content': final_batch})}\n\n"
                
            # Send completion event
            final_progress = progress_tracker.get_progress()
            yield f"event: done\ndata: {json.dumps({'progress': final_progress, 'tokens_total': progress_tracker.tokens_sent})}\n\n"
            
        except asyncio.CancelledError:
            # Handle client disconnect
            logger.info(f"Client disconnected: {connection.connection_id}")
            raise
            
        except Exception as e:
            # Send error event
            logger.error(f"Streaming error: {e}")
            await connection_manager.increment_errors(connection.connection_id)
            yield f"event: error\ndata: {json.dumps({'message': str(e), 'code': 'STREAMING_ERROR'})}\n\n"
            
        finally:
            # Clean up connection
            await connection_manager.remove_connection(connection.connection_id)
    
    return StreamingResponse(
        enhanced_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
            "X-Connection-Id": connection.connection_id
        }
    )

# Example usage in FastAPI endpoint
async def enhanced_streaming_endpoint(
    request: Request,
    session_id: str,
    message: str,
    connection_manager: ConnectionManager
):
    """Enhanced streaming endpoint with all features"""
    
    # Get user from auth
    user_id = request.state.user_id  # Assuming auth middleware sets this
    
    # Create connection
    connection = await connection_manager.add_connection(user_id, session_id)
    
    # Create metadata
    metadata = StreamingMetadata(
        model="gpt-4",
        temperature=0.7,
        max_tokens=1000,
        tools=["search", "calculator"],
        estimated_duration=5000  # 5 seconds
    )
    
    # Your LLM generator function
    async def generate_response():
        # This would be your actual LLM integration
        response = "This is a test response that will be streamed token by token."
        for token in response.split():
            yield token + " "
            await asyncio.sleep(0.1)  # Simulate processing time
    
    # Create enhanced SSE response
    return await create_enhanced_sse_response(
        request=request,
        generator=generate_response(),
        connection=connection,
        metadata=metadata,
        connection_manager=connection_manager
    )