"""
WebSocket Manager for real-time features
Handles connection management, authentication, and broadcasting
"""
import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any, List
from datetime import datetime
import uuid
from fastapi import WebSocket, WebSocketDisconnect, HTTPException, Depends
from starlette.websockets import WebSocketState
import jwt
from jwt.exceptions import InvalidTokenError

from modules.core.config import get_settings
from modules.core.auth_dependency import get_current_user_ws

logger = logging.getLogger(__name__)
settings = get_settings()


class ConnectionManager:
    """Manages WebSocket connections with room/channel support"""
    
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, WebSocket] = {}
        # Store room memberships: room_name -> set of user_ids
        self.rooms: Dict[str, Set[str]] = {}
        # Store user rooms: user_id -> set of room_names
        self.user_rooms: Dict[str, Set[str]] = {}
        # Connection metadata
        self.connection_info: Dict[str, Dict[str, Any]] = {}
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
        
    async def connect(self, websocket: WebSocket, user_id: str, metadata: Optional[Dict] = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        async with self._lock:
            # Close existing connection if any
            if user_id in self.active_connections:
                try:
                    await self.active_connections[user_id].close()
                except Exception:
                    pass
                    
            self.active_connections[user_id] = websocket
            self.user_rooms[user_id] = set()
            self.connection_info[user_id] = {
                "connected_at": datetime.utcnow().isoformat(),
                "metadata": metadata or {},
                "last_activity": datetime.utcnow().isoformat()
            }
            
        logger.info(f"WebSocket connected: user_id={user_id}")
        
        # Send connection confirmation
        await self.send_personal_message(
            {
                "type": "connection",
                "status": "connected",
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            user_id
        )
        
    async def disconnect(self, user_id: str):
        """Disconnect a WebSocket connection"""
        async with self._lock:
            if user_id in self.active_connections:
                # Leave all rooms
                if user_id in self.user_rooms:
                    for room in list(self.user_rooms[user_id]):
                        await self._leave_room_internal(user_id, room)
                        
                # Remove connection
                del self.active_connections[user_id]
                
                if user_id in self.user_rooms:
                    del self.user_rooms[user_id]
                    
                if user_id in self.connection_info:
                    del self.connection_info[user_id]
                    
        logger.info(f"WebSocket disconnected: user_id={user_id}")
        
    async def join_room(self, user_id: str, room: str):
        """Add a user to a room"""
        async with self._lock:
            if user_id not in self.active_connections:
                raise ValueError(f"User {user_id} is not connected")
                
            if room not in self.rooms:
                self.rooms[room] = set()
                
            self.rooms[room].add(user_id)
            self.user_rooms[user_id].add(room)
            
        logger.info(f"User {user_id} joined room {room}")
        
        # Notify room members
        await self.send_to_room(
            {
                "type": "room_event",
                "event": "user_joined",
                "room": room,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            room
        )
        
    async def leave_room(self, user_id: str, room: str):
        """Remove a user from a room"""
        async with self._lock:
            await self._leave_room_internal(user_id, room)
            
    async def _leave_room_internal(self, user_id: str, room: str):
        """Internal method to leave room (must be called within lock)"""
        if room in self.rooms and user_id in self.rooms[room]:
            self.rooms[room].discard(user_id)
            if not self.rooms[room]:
                del self.rooms[room]
                
        if user_id in self.user_rooms:
            self.user_rooms[user_id].discard(room)
            
        logger.info(f"User {user_id} left room {room}")
        
        # Notify remaining room members
        if room in self.rooms:
            await self.send_to_room(
                {
                    "type": "room_event",
                    "event": "user_left",
                    "room": room,
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat()
                },
                room,
                exclude_users={user_id}
            )
            
    async def send_personal_message(self, message: Dict[str, Any], user_id: str):
        """Send a message to a specific user"""
        async with self._lock:
            if user_id in self.active_connections:
                websocket = self.active_connections[user_id]
                try:
                    if websocket.application_state == WebSocketState.CONNECTED:
                        await websocket.send_json(message)
                        # Update last activity
                        if user_id in self.connection_info:
                            self.connection_info[user_id]["last_activity"] = datetime.utcnow().isoformat()
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    # Remove dead connection
                    await self.disconnect(user_id)
                    
    async def send_to_room(self, message: Dict[str, Any], room: str, exclude_users: Optional[Set[str]] = None):
        """Send a message to all users in a room"""
        if exclude_users is None:
            exclude_users = set()
            
        async with self._lock:
            if room in self.rooms:
                # Create tasks for parallel sending
                tasks = []
                for user_id in self.rooms[room]:
                    if user_id not in exclude_users and user_id in self.active_connections:
                        tasks.append(self._send_message_safe(user_id, message))
                        
                # Execute all sends in parallel
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
                    
    async def _send_message_safe(self, user_id: str, message: Dict[str, Any]):
        """Safely send a message to a user (internal use)"""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                if websocket.application_state == WebSocketState.CONNECTED:
                    await websocket.send_json(message)
                    # Update last activity
                    if user_id in self.connection_info:
                        self.connection_info[user_id]["last_activity"] = datetime.utcnow().isoformat()
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                
    async def broadcast(self, message: Dict[str, Any], exclude_users: Optional[Set[str]] = None):
        """Broadcast a message to all connected users"""
        if exclude_users is None:
            exclude_users = set()
            
        async with self._lock:
            tasks = []
            for user_id in self.active_connections:
                if user_id not in exclude_users:
                    tasks.append(self._send_message_safe(user_id, message))
                    
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
                
    async def get_room_users(self, room: str) -> List[str]:
        """Get all users in a room"""
        async with self._lock:
            return list(self.rooms.get(room, set()))
            
    async def get_user_rooms(self, user_id: str) -> List[str]:
        """Get all rooms a user is in"""
        async with self._lock:
            return list(self.user_rooms.get(user_id, set()))
            
    async def get_connection_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get connection information for a user"""
        async with self._lock:
            return self.connection_info.get(user_id)
            
    async def get_all_connections(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all active connections"""
        async with self._lock:
            return {
                user_id: {
                    "info": self.connection_info.get(user_id, {}),
                    "rooms": list(self.user_rooms.get(user_id, set()))
                }
                for user_id in self.active_connections
            }
            
    async def is_connected(self, user_id: str) -> bool:
        """Check if a user is connected"""
        async with self._lock:
            return user_id in self.active_connections
            
    async def get_room_count(self, room: str) -> int:
        """Get the number of users in a room"""
        async with self._lock:
            return len(self.rooms.get(room, set()))
            
    async def get_total_connections(self) -> int:
        """Get the total number of active connections"""
        async with self._lock:
            return len(self.active_connections)


# Global connection manager instance
manager = ConnectionManager()


class RateLimiter:
    """Simple rate limiter for WebSocket messages"""
    
    def __init__(self, max_messages: int = 100, window_seconds: int = 60):
        self.max_messages = max_messages
        self.window_seconds = window_seconds
        self.message_times: Dict[str, List[float]] = {}
        self._lock = asyncio.Lock()
        
    async def check_rate_limit(self, user_id: str) -> bool:
        """Check if user is within rate limit"""
        async with self._lock:
            now = asyncio.get_event_loop().time()
            
            if user_id not in self.message_times:
                self.message_times[user_id] = []
                
            # Remove old messages outside window
            cutoff = now - self.window_seconds
            self.message_times[user_id] = [
                t for t in self.message_times[user_id] if t > cutoff
            ]
            
            # Check if under limit
            if len(self.message_times[user_id]) >= self.max_messages:
                return False
                
            # Add current message time
            self.message_times[user_id].append(now)
            return True
            
    async def cleanup_old_entries(self):
        """Cleanup old entries periodically"""
        async with self._lock:
            now = asyncio.get_event_loop().time()
            cutoff = now - self.window_seconds
            
            empty_users = []
            for user_id, times in self.message_times.items():
                self.message_times[user_id] = [t for t in times if t > cutoff]
                if not self.message_times[user_id]:
                    empty_users.append(user_id)
                    
            for user_id in empty_users:
                del self.message_times[user_id]


# Global rate limiter instance
rate_limiter = RateLimiter()


async def authenticate_websocket(websocket: WebSocket) -> Optional[Dict[str, Any]]:
    """Authenticate WebSocket connection"""
    # Try to get token from query params
    token = websocket.query_params.get("token")
    
    if not token:
        # Try to get from first message
        try:
            auth_message = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
            if auth_message.get("type") == "auth" and "token" in auth_message:
                token = auth_message["token"]
        except asyncio.TimeoutError:
            logger.error("WebSocket authentication timeout")
            return None
        except Exception as e:
            logger.error(f"WebSocket authentication error: {e}")
            return None
            
    if not token:
        return None
        
    try:
        # Decode and verify token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            return None
            
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role", "user")
        }
    except InvalidTokenError as e:
        logger.error(f"Invalid token: {e}")
        return None
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return None


# Periodic cleanup task
async def periodic_cleanup():
    """Run periodic cleanup tasks"""
    while True:
        try:
            await asyncio.sleep(300)  # Every 5 minutes
            await rate_limiter.cleanup_old_entries()
            
            # Log connection stats
            total_connections = await manager.get_total_connections()
            logger.info(f"Active WebSocket connections: {total_connections}")
            
        except Exception as e:
            logger.error(f"Periodic cleanup error: {e}")