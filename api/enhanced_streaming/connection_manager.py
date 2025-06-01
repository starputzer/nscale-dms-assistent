"""
Enhanced Streaming Connection Manager
Handles streaming connections with automatic cleanup and monitoring
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Set
from dataclasses import dataclass, field
import uuid
import logging

logger = logging.getLogger(__name__)

@dataclass
class StreamConnection:
    """Represents a single streaming connection"""
    stream_id: str
    user_id: str
    session_id: str
    connected_at: datetime = field(default_factory=datetime.now)
    last_ping: datetime = field(default_factory=datetime.now)
    tokens_sent: int = 0
    reconnect_count: int = 0
    partial_response: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True
    
    def update_ping(self):
        """Update last ping timestamp"""
        self.last_ping = datetime.now()
        
    def increment_tokens(self, count: int = 1):
        """Increment tokens sent counter"""
        self.tokens_sent += count
        
    def append_partial_response(self, content: str):
        """Append to partial response buffer"""
        self.partial_response += content

class StreamingConnectionManager:
    """Manages all active streaming connections"""
    
    def __init__(self, 
                 max_connections_per_user: int = 5,
                 connection_timeout: int = 300,  # 5 minutes
                 cleanup_interval: int = 60):    # 1 minute
        self.connections: Dict[str, StreamConnection] = {}
        self.user_connections: Dict[str, Set[str]] = {}
        self.max_connections_per_user = max_connections_per_user
        self.connection_timeout = connection_timeout
        self.cleanup_interval = cleanup_interval
        self._cleanup_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        
    async def start(self):
        """Start the connection manager"""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("StreamingConnectionManager started")
        
    async def stop(self):
        """Stop the connection manager"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        logger.info("StreamingConnectionManager stopped")
        
    async def connect(self, 
                     user_id: str, 
                     session_id: str,
                     stream_id: Optional[str] = None) -> StreamConnection:
        """Create a new streaming connection"""
        async with self._lock:
            # Generate stream ID if not provided
            if not stream_id:
                stream_id = f"stream_{uuid.uuid4().hex}"
                
            # Check user connection limit
            user_streams = self.user_connections.get(user_id, set())
            if len(user_streams) >= self.max_connections_per_user:
                # Close oldest connection
                oldest_stream = min(
                    user_streams,
                    key=lambda sid: self.connections[sid].connected_at
                )
                await self.disconnect(oldest_stream)
                
            # Create new connection
            connection = StreamConnection(
                stream_id=stream_id,
                user_id=user_id,
                session_id=session_id
            )
            
            # Register connection
            self.connections[stream_id] = connection
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(stream_id)
            
            logger.info(f"New streaming connection: {stream_id} for user {user_id}")
            return connection
            
    async def disconnect(self, stream_id: str) -> Optional[StreamConnection]:
        """Disconnect and cleanup a streaming connection"""
        async with self._lock:
            connection = self.connections.get(stream_id)
            if not connection:
                return None
                
            # Mark as inactive
            connection.is_active = False
            
            # Remove from tracking
            del self.connections[stream_id]
            if connection.user_id in self.user_connections:
                self.user_connections[connection.user_id].discard(stream_id)
                if not self.user_connections[connection.user_id]:
                    del self.user_connections[connection.user_id]
                    
            logger.info(f"Disconnected stream: {stream_id}")
            return connection
            
    async def heartbeat(self, stream_id: str) -> bool:
        """Update connection heartbeat"""
        async with self._lock:
            connection = self.connections.get(stream_id)
            if connection and connection.is_active:
                connection.update_ping()
                return True
            return False
            
    async def get_connection(self, stream_id: str) -> Optional[StreamConnection]:
        """Get a connection by stream ID"""
        return self.connections.get(stream_id)
        
    async def get_user_connections(self, user_id: str) -> list[StreamConnection]:
        """Get all connections for a user"""
        stream_ids = self.user_connections.get(user_id, set())
        return [
            self.connections[sid] 
            for sid in stream_ids 
            if sid in self.connections
        ]
        
    async def update_metrics(self, stream_id: str, metrics: Dict[str, Any]):
        """Update connection metrics"""
        async with self._lock:
            connection = self.connections.get(stream_id)
            if connection:
                if 'tokens' in metrics:
                    connection.increment_tokens(metrics['tokens'])
                if 'partial_response' in metrics:
                    connection.append_partial_response(metrics['partial_response'])
                if 'metadata' in metrics:
                    connection.metadata.update(metrics['metadata'])
                    
    async def _cleanup_loop(self):
        """Periodically cleanup stale connections"""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_stale_connections()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
                
    async def _cleanup_stale_connections(self):
        """Remove connections that have timed out"""
        async with self._lock:
            now = datetime.now()
            timeout_delta = timedelta(seconds=self.connection_timeout)
            
            stale_connections = []
            for stream_id, connection in self.connections.items():
                if now - connection.last_ping > timeout_delta:
                    stale_connections.append(stream_id)
                    
            for stream_id in stale_connections:
                logger.warning(f"Cleaning up stale connection: {stream_id}")
                await self.disconnect(stream_id)
                
    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        total_tokens = sum(conn.tokens_sent for conn in self.connections.values())
        active_connections = sum(1 for conn in self.connections.values() if conn.is_active)
        
        return {
            "total_connections": len(self.connections),
            "active_connections": active_connections,
            "unique_users": len(self.user_connections),
            "total_tokens_sent": total_tokens,
            "connections_by_user": {
                user_id: len(streams) 
                for user_id, streams in self.user_connections.items()
            }
        }

# Global instance
connection_manager = StreamingConnectionManager()