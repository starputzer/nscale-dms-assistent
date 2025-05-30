# Enhanced Streaming Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to enhance the streaming capabilities of the nscale-assist application. The current implementation uses Server-Sent Events (SSE) with basic token streaming. This plan proposes advanced features including automatic reconnection, intelligent token batching, streaming progress indicators, metadata support, enhanced error recovery, and streaming analytics.

## Current State Analysis

### Current Architecture

1. **Backend (Python/FastAPI)**:
   - Uses `EventSourceResponse` from `sse_starlette`
   - Streams tokens from Ollama LLM
   - Basic error handling and session management
   - Simple SSE format with JSON data

2. **Frontend (JavaScript/Vue)**:
   - Legacy implementation using `EventSource` API wrapper
   - Manual SSE parsing in some components
   - Basic token accumulation and display
   - Limited error recovery

3. **Limitations**:
   - No automatic reconnection on connection loss
   - No progress indicators during streaming
   - Limited metadata support (no thinking indicators, tool usage)
   - Basic error handling without recovery strategies
   - No streaming analytics or monitoring
   - Inefficient token processing (one at a time)
   - No support for partial response recovery

## Proposed Enhanced Features

### 1. Improved SSE Handling with Automatic Reconnection

#### Backend Enhancements
```python
# Enhanced streaming endpoint with connection management
class StreamingConnectionManager:
    def __init__(self):
        self.active_connections = {}
        self.connection_metadata = {}
        
    async def connect(self, stream_id: str, user_id: str):
        self.active_connections[stream_id] = {
            "user_id": user_id,
            "connected_at": datetime.now(),
            "last_ping": datetime.now(),
            "tokens_sent": 0,
            "reconnect_count": 0
        }
        
    async def disconnect(self, stream_id: str):
        if stream_id in self.active_connections:
            del self.active_connections[stream_id]
            
    async def heartbeat(self, stream_id: str):
        if stream_id in self.active_connections:
            self.active_connections[stream_id]["last_ping"] = datetime.now()
```

#### Frontend Enhancements
```typescript
// Enhanced EventSource with automatic reconnection
class EnhancedEventSource {
    private eventSource: EventSource | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private streamId: string;
    private lastEventId: string | null = null;
    
    constructor(private url: string, private options: EnhancedEventSourceOptions) {
        this.streamId = generateStreamId();
        this.connect();
    }
    
    private connect() {
        const urlWithParams = new URL(this.url);
        if (this.lastEventId) {
            urlWithParams.searchParams.set('last-event-id', this.lastEventId);
        }
        
        this.eventSource = new EventSource(urlWithParams.toString());
        
        this.eventSource.onopen = () => {
            console.log(`Stream ${this.streamId} connected`);
            this.reconnectAttempts = 0;
            this.options.onConnect?.();
        };
        
        this.eventSource.onerror = (error) => {
            console.error(`Stream ${this.streamId} error:`, error);
            this.handleReconnection();
        };
        
        this.eventSource.onmessage = (event) => {
            this.lastEventId = event.lastEventId;
            this.options.onMessage(event);
        };
    }
    
    private handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.options.onMaxReconnectReached?.();
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Reconnecting stream ${this.streamId} in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }
}
```

### 2. Better Token Batching and Processing

#### Intelligent Token Batching
```python
class TokenBatcher:
    def __init__(self, batch_size=5, batch_timeout=100):
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self.buffer = []
        self.last_flush = time.time()
        
    async def add_token(self, token: str) -> Optional[List[str]]:
        self.buffer.append(token)
        
        # Flush if batch is full or timeout reached
        if len(self.buffer) >= self.batch_size or \
           (time.time() - self.last_flush) * 1000 > self.batch_timeout:
            return await self.flush()
        
        return None
        
    async def flush(self) -> List[str]:
        if not self.buffer:
            return []
            
        batch = self.buffer.copy()
        self.buffer.clear()
        self.last_flush = time.time()
        return batch
```

#### Frontend Token Processing
```typescript
// Optimized token processing with batching
class TokenProcessor {
    private tokenBuffer: string[] = [];
    private batchTimer: number | null = null;
    private readonly BATCH_SIZE = 5;
    private readonly BATCH_DELAY = 50; // ms
    
    constructor(private onTokenBatch: (tokens: string[]) => void) {}
    
    addToken(token: string) {
        this.tokenBuffer.push(token);
        
        if (this.tokenBuffer.length >= this.BATCH_SIZE) {
            this.flushTokens();
        } else if (!this.batchTimer) {
            this.batchTimer = window.setTimeout(() => {
                this.flushTokens();
            }, this.BATCH_DELAY);
        }
    }
    
    private flushTokens() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        
        if (this.tokenBuffer.length > 0) {
            const batch = [...this.tokenBuffer];
            this.tokenBuffer = [];
            this.onTokenBatch(batch);
        }
    }
}
```

### 3. Streaming Progress Indicators

#### Backend Progress Tracking
```python
class StreamingProgress:
    def __init__(self, estimated_tokens: int = 500):
        self.estimated_tokens = estimated_tokens
        self.tokens_sent = 0
        self.start_time = time.time()
        
    def update(self, tokens_count: int = 1):
        self.tokens_sent += tokens_count
        
    def get_progress(self) -> Dict[str, Any]:
        elapsed = time.time() - self.start_time
        tokens_per_second = self.tokens_sent / elapsed if elapsed > 0 else 0
        estimated_remaining = (self.estimated_tokens - self.tokens_sent) / tokens_per_second if tokens_per_second > 0 else 0
        
        return {
            "tokens_sent": self.tokens_sent,
            "estimated_total": self.estimated_tokens,
            "progress_percentage": min(100, (self.tokens_sent / self.estimated_tokens) * 100),
            "tokens_per_second": round(tokens_per_second, 2),
            "estimated_time_remaining": round(estimated_remaining, 1),
            "elapsed_time": round(elapsed, 1)
        }
```

#### Frontend Progress Display
```vue
<template>
  <div class="streaming-progress" v-if="isStreaming">
    <div class="progress-bar">
      <div 
        class="progress-fill" 
        :style="{ width: `${progress.percentage}%` }"
      />
    </div>
    <div class="progress-stats">
      <span>{{ progress.tokensPerSecond }} tokens/s</span>
      <span>{{ formatTime(progress.estimatedTimeRemaining) }} remaining</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface StreamingProgress {
  percentage: number;
  tokensPerSecond: number;
  estimatedTimeRemaining: number;
}

const progress = ref<StreamingProgress>({
  percentage: 0,
  tokensPerSecond: 0,
  estimatedTimeRemaining: 0
});
</script>
```

### 4. Support for Streaming Metadata

#### Enhanced SSE Message Types
```python
# Define different message types for streaming
class StreamMessageType(Enum):
    TOKEN = "token"
    PROGRESS = "progress"
    THINKING = "thinking"
    TOOL_USE = "tool_use"
    ERROR = "error"
    WARNING = "warning"
    DONE = "done"
    
async def enhanced_stream_generator():
    # Send thinking indicator
    yield create_sse_message(StreamMessageType.THINKING, {
        "message": "Analysiere Ihre Anfrage..."
    })
    
    # Send tool usage information
    yield create_sse_message(StreamMessageType.TOOL_USE, {
        "tool": "document_search",
        "status": "searching",
        "query": question
    })
    
    # Stream tokens with progress
    async for token in generate_tokens():
        yield create_sse_message(StreamMessageType.TOKEN, {
            "content": token,
            "index": token_index
        })
        
        # Send progress update every 10 tokens
        if token_index % 10 == 0:
            yield create_sse_message(StreamMessageType.PROGRESS, 
                progress_tracker.get_progress()
            )
```

#### Frontend Metadata Handling
```typescript
// Handle different types of streaming messages
class StreamingMetadataHandler {
    private thinkingIndicator: boolean = false;
    private toolUsage: Map<string, ToolUsageInfo> = new Map();
    
    handleMessage(type: StreamMessageType, data: any) {
        switch (type) {
            case StreamMessageType.THINKING:
                this.showThinkingIndicator(data.message);
                break;
                
            case StreamMessageType.TOOL_USE:
                this.updateToolUsage(data);
                break;
                
            case StreamMessageType.PROGRESS:
                this.updateProgress(data);
                break;
                
            case StreamMessageType.TOKEN:
                this.appendToken(data.content);
                break;
                
            case StreamMessageType.ERROR:
                this.handleError(data);
                break;
        }
    }
}
```

### 5. Enhanced Error Recovery

#### Streaming Error Types and Recovery Strategies
```python
class StreamingErrorHandler:
    def __init__(self):
        self.error_strategies = {
            "network_timeout": self.handle_network_timeout,
            "model_overload": self.handle_model_overload,
            "token_limit": self.handle_token_limit,
            "rate_limit": self.handle_rate_limit
        }
        
    async def handle_network_timeout(self, context):
        # Save partial response
        await self.save_partial_response(context)
        
        # Return resumable state
        return {
            "error_type": "network_timeout",
            "resumable": True,
            "partial_response": context.get("partial_response"),
            "resume_token": generate_resume_token(context)
        }
        
    async def handle_model_overload(self, context):
        # Queue request for retry
        await self.queue_for_retry(context)
        
        return {
            "error_type": "model_overload",
            "retry_after": 30,
            "message": "Das Modell ist momentan überlastet. Ihre Anfrage wurde in die Warteschlange gestellt."
        }
```

#### Frontend Error Recovery
```typescript
// Intelligent error recovery with fallback strategies
class StreamingErrorRecovery {
    private partialResponses: Map<string, PartialResponse> = new Map();
    
    async handleStreamingError(error: StreamingError, streamId: string) {
        const recovery = this.getRecoveryStrategy(error.type);
        
        if (recovery.resumable && this.partialResponses.has(streamId)) {
            // Attempt to resume from partial response
            const partial = this.partialResponses.get(streamId)!;
            return await this.resumeStreaming(partial, error.resumeToken);
        }
        
        if (recovery.retryable) {
            // Implement exponential backoff
            const delay = this.calculateBackoff(error.retryCount);
            return await this.retryWithDelay(streamId, delay);
        }
        
        // Fallback to non-streaming API
        return await this.fallbackToStandardAPI(streamId);
    }
}
```

### 6. Streaming Analytics and Monitoring

#### Backend Analytics Collection
```python
class StreamingAnalytics:
    def __init__(self):
        self.metrics = {
            "total_streams": 0,
            "active_streams": 0,
            "average_duration": 0,
            "average_tokens_per_stream": 0,
            "error_rate": 0,
            "reconnection_rate": 0
        }
        
    async def track_stream_event(self, event_type: str, data: Dict[str, Any]):
        # Track different streaming events
        if event_type == "stream_start":
            self.metrics["total_streams"] += 1
            self.metrics["active_streams"] += 1
            
        elif event_type == "stream_end":
            self.metrics["active_streams"] -= 1
            await self.update_averages(data)
            
        elif event_type == "stream_error":
            await self.update_error_rate(data)
            
        # Send to monitoring service
        await self.send_to_monitoring(event_type, data)
```

#### Frontend Performance Monitoring
```typescript
// Client-side streaming performance monitoring
class StreamingPerformanceMonitor {
    private metrics: StreamingMetrics = {
        firstTokenLatency: 0,
        tokensPerSecond: [],
        totalTokens: 0,
        streamDuration: 0,
        reconnections: 0,
        errors: []
    };
    
    private startTime: number = 0;
    private firstTokenTime: number = 0;
    
    startMonitoring() {
        this.startTime = performance.now();
        this.metrics = this.createEmptyMetrics();
    }
    
    recordFirstToken() {
        if (!this.firstTokenTime) {
            this.firstTokenTime = performance.now();
            this.metrics.firstTokenLatency = this.firstTokenTime - this.startTime;
        }
    }
    
    recordTokenBatch(count: number) {
        const now = performance.now();
        const elapsed = (now - this.startTime) / 1000; // seconds
        
        this.metrics.totalTokens += count;
        this.metrics.tokensPerSecond.push({
            timestamp: elapsed,
            rate: this.metrics.totalTokens / elapsed
        });
    }
    
    getReport(): StreamingPerformanceReport {
        return {
            ...this.metrics,
            averageTokenRate: this.calculateAverageRate(),
            p95Latency: this.calculateP95Latency()
        };
    }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Implement `EnhancedEventSource` with automatic reconnection
2. Add connection management to backend
3. Implement basic token batching
4. Add streaming progress tracking

### Phase 2: Advanced Features (Week 3-4)
1. Implement streaming metadata support
2. Add thinking indicators and tool usage display
3. Implement error recovery strategies
4. Add partial response handling

### Phase 3: Monitoring & Optimization (Week 5-6)
1. Implement streaming analytics
2. Add performance monitoring
3. Create streaming dashboard
4. Optimize token processing pipeline

### Phase 4: Testing & Refinement (Week 7-8)
1. Comprehensive testing of all streaming scenarios
2. Load testing with concurrent streams
3. Error recovery testing
4. Performance optimization based on metrics

## Technical Requirements

### Backend Requirements
- FastAPI 0.104+ with SSE support
- Redis for streaming state management
- Prometheus for metrics collection
- AsyncIO for concurrent stream handling

### Frontend Requirements
- Vue 3.3+ with Composition API
- TypeScript 5.0+
- Web Workers for token processing (optional)
- Performance API for monitoring

### Infrastructure Requirements
- WebSocket-compatible reverse proxy
- Redis for session state
- Monitoring stack (Prometheus/Grafana)
- CDN with streaming support

## Success Metrics

1. **Performance Metrics**:
   - First token latency < 500ms
   - Token streaming rate > 50 tokens/second
   - Successful reconnection rate > 95%
   - Error recovery success rate > 90%

2. **User Experience Metrics**:
   - Perceived responsiveness improvement > 40%
   - Streaming interruption rate < 2%
   - User satisfaction score > 4.5/5

3. **Technical Metrics**:
   - Memory usage per stream < 10MB
   - CPU usage per stream < 5%
   - Concurrent streams support > 100

## Risk Mitigation

1. **Network Instability**:
   - Implement robust reconnection logic
   - Cache partial responses
   - Provide offline mode fallback

2. **Server Overload**:
   - Implement rate limiting
   - Queue management for requests
   - Automatic load balancing

3. **Browser Compatibility**:
   - Fallback to polling for older browsers
   - Progressive enhancement approach
   - Feature detection and graceful degradation

## Conclusion

This enhanced streaming implementation will significantly improve the user experience by providing:
- More reliable streaming with automatic recovery
- Better performance through intelligent batching
- Rich metadata for improved UX
- Comprehensive monitoring and analytics
- Robust error handling and recovery

The phased approach ensures incremental delivery of value while maintaining system stability.