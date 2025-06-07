# WebSocket Module for Real-time Features

This module provides WebSocket support for real-time features in the nscale Assist application, enabling:
- Real-time system monitoring
- Background job progress tracking
- Document processing status updates
- User activity monitoring
- Live notifications and alerts

## Features

### 1. **Connection Management**
- JWT-based authentication
- Automatic reconnection handling
- Room/channel support for targeted messaging
- Rate limiting to prevent abuse

### 2. **Real-time Monitoring**
- System metrics (CPU, memory, disk, network)
- Background job progress
- Active user tracking
- Document processing status

### 3. **Broadcast Capabilities**
- Send to specific users
- Broadcast to rooms/channels
- Admin-only broadcasts
- Filtered broadcasts

## Usage

### Server Setup

The WebSocket support is automatically initialized when the server starts:

```python
# In server.py lifespan
from modules.websocket import startup_websocket_tasks
await startup_websocket_tasks()
```

### Client Connection

Connect to the WebSocket endpoint with JWT authentication:

```javascript
// Using query parameter
const ws = new WebSocket(`ws://localhost:8000/ws/connect?token=${jwtToken}`);

// Or send auth message after connection
ws.onopen = () => {
    ws.send(JSON.stringify({
        type: 'auth',
        token: jwtToken
    }));
};
```

### Available Message Types

#### Client to Server:
- `ping` - Keep-alive ping
- `join_room` - Join a specific room
- `leave_room` - Leave a room
- `subscribe_system_metrics` - Subscribe to system metrics
- `unsubscribe_system_metrics` - Unsubscribe from metrics
- `subscribe_job_updates` - Subscribe to job updates
- `subscribe_document_updates` - Subscribe to document updates
- `get_active_jobs` - Get list of active jobs
- `broadcast_admin` - Admin broadcast (admin only)

#### Server to Client:
- `connection` - Connection confirmation
- `system_metrics` - System metrics update
- `job_updates` - Job status updates
- `document_processing_start` - Document processing started
- `document_processing_complete` - Document processing completed
- `system_alert` - System alerts
- `user_activity` - User activity notifications
- `room_event` - Room join/leave events
- `error` - Error messages

### Integration Examples

#### 1. Document Processing Notifications

```python
from modules.websocket import notify_document_processing_start, notify_document_processing_complete

# When starting processing
await notify_document_processing_start(
    user_id="user123",
    document_id="doc456",
    filename="report.pdf"
)

# When complete
await notify_document_processing_complete(
    user_id="user123",
    document_id="doc456",
    filename="report.pdf",
    success=True
)
```

#### 2. Background Job Updates

```python
from modules.websocket import notify_job_status_change

# Update job progress
await notify_job_status_change(
    job_id="job789",
    status="running",
    progress=45.5
)
```

#### 3. System Alerts

```python
from modules.websocket import notify_system_alert

# Send critical alert
await notify_system_alert(
    alert_type="disk_space",
    severity="critical",
    message="Disk usage above 90%",
    details={"usage": 92.5}
)
```

#### 4. Custom Room Messages

```python
from modules.websocket import manager

# Send to specific room
await manager.send_to_room(
    {
        "type": "custom_event",
        "data": {"message": "Hello room!"}
    },
    room="chat_room_123"
)
```

## Security

### Authentication
- JWT tokens are required for connection
- Tokens are validated on connection
- Invalid tokens result in immediate disconnection

### Authorization
- Admin-only features require admin role
- Users can only subscribe to their own document updates
- Room access can be restricted based on user permissions

### Rate Limiting
- Default: 100 messages per minute per user
- Configurable limits
- Automatic cleanup of old rate limit entries

## Architecture

### Components

1. **ConnectionManager**: Manages WebSocket connections and rooms
2. **RateLimiter**: Implements rate limiting for messages
3. **WebSocket Routes**: FastAPI WebSocket endpoints
4. **Integration Functions**: Helper functions for sending notifications

### Rooms

Special rooms:
- `admin` - All admin users
- `system_monitoring` - System metrics subscribers
- `background_jobs` - Job updates subscribers
- `all_document_updates` - All document updates (admin only)
- `document_updates_{user_id}` - User-specific document updates

### Performance Considerations

- Broadcasts are sent in parallel using asyncio
- Dead connections are automatically cleaned up
- Periodic cleanup tasks remove stale data
- System metrics are only calculated when subscribers exist

## Testing

Use the provided demo page to test WebSocket functionality:

1. Open `/websocket-demo.html` in your browser
2. Enter your JWT token
3. Click Connect
4. Test various subscription features

## Error Handling

- Connection errors are logged and connections cleaned up
- Message parsing errors return error messages to client
- Rate limit violations return specific error messages
- All exceptions are caught and logged

## Configuration

Environment variables:
- `WS_MAX_MESSAGES`: Max messages per minute (default: 100)
- `WS_RATE_WINDOW`: Rate limit window in seconds (default: 60)
- `WS_CLEANUP_INTERVAL`: Cleanup interval in seconds (default: 300)

## Future Enhancements

Planned features:
- Message persistence for offline users
- WebSocket clustering for horizontal scaling
- Binary message support for file transfers
- Compression for large messages
- Custom event handlers plugin system