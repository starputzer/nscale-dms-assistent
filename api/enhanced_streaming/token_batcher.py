"""
Token Batcher for Optimized Streaming
Groups tokens into batches for more efficient transmission
"""

import asyncio
import time
from typing import List, Optional, Callable, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class TokenBatch:
    """Represents a batch of tokens"""
    tokens: List[str]
    timestamp: float
    batch_number: int
    
    @property
    def size(self) -> int:
        return len(self.tokens)
        
    @property
    def content(self) -> str:
        return ''.join(self.tokens)

class TokenBatcher:
    """
    Batches tokens for efficient streaming transmission.
    Reduces overhead by grouping multiple tokens together.
    """
    
    def __init__(self,
                 batch_size: int = 5,
                 batch_timeout_ms: int = 100,
                 max_buffer_size: int = 1000):
        """
        Initialize the token batcher.
        
        Args:
            batch_size: Maximum tokens per batch
            batch_timeout_ms: Maximum time to wait before flushing (milliseconds)
            max_buffer_size: Maximum buffer size before forced flush
        """
        self.batch_size = batch_size
        self.batch_timeout_ms = batch_timeout_ms
        self.max_buffer_size = max_buffer_size
        
        self.buffer: List[str] = []
        self.last_flush_time = time.time()
        self.batch_count = 0
        self.total_tokens = 0
        
        self._flush_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        
    async def add_token(self, token: str) -> Optional[TokenBatch]:
        """
        Add a token to the buffer and return a batch if ready.
        
        Args:
            token: The token to add
            
        Returns:
            TokenBatch if batch is ready, None otherwise
        """
        async with self._lock:
            self.buffer.append(token)
            self.total_tokens += 1
            
            # Check if we should flush immediately
            if self._should_flush_immediate():
                return await self._flush()
                
            # Schedule delayed flush if not already scheduled
            if not self._flush_task or self._flush_task.done():
                self._flush_task = asyncio.create_task(self._delayed_flush())
                
            return None
            
    async def flush(self) -> Optional[TokenBatch]:
        """Force flush the current buffer"""
        async with self._lock:
            return await self._flush()
            
    async def _flush(self) -> Optional[TokenBatch]:
        """Internal flush method (must be called with lock held)"""
        if not self.buffer:
            return None
            
        # Create batch
        batch = TokenBatch(
            tokens=self.buffer.copy(),
            timestamp=time.time(),
            batch_number=self.batch_count
        )
        
        # Reset buffer
        self.buffer.clear()
        self.last_flush_time = time.time()
        self.batch_count += 1
        
        # Cancel any pending flush task
        if self._flush_task and not self._flush_task.done():
            self._flush_task.cancel()
            
        logger.debug(f"Flushed batch {batch.batch_number} with {batch.size} tokens")
        return batch
        
    def _should_flush_immediate(self) -> bool:
        """Check if buffer should be flushed immediately"""
        # Flush if buffer is full
        if len(self.buffer) >= self.batch_size:
            return True
            
        # Flush if buffer exceeds max size
        if len(self.buffer) >= self.max_buffer_size:
            logger.warning(f"Buffer exceeded max size ({self.max_buffer_size})")
            return True
            
        return False
        
    async def _delayed_flush(self):
        """Delayed flush after timeout"""
        try:
            await asyncio.sleep(self.batch_timeout_ms / 1000.0)
            async with self._lock:
                await self._flush()
        except asyncio.CancelledError:
            pass
            
    def get_stats(self) -> dict:
        """Get batcher statistics"""
        return {
            "total_tokens": self.total_tokens,
            "total_batches": self.batch_count,
            "average_batch_size": self.total_tokens / self.batch_count if self.batch_count > 0 else 0,
            "current_buffer_size": len(self.buffer),
            "batch_size_setting": self.batch_size,
            "timeout_ms": self.batch_timeout_ms
        }

class AdaptiveTokenBatcher(TokenBatcher):
    """
    Advanced token batcher that adapts batch size based on streaming performance.
    """
    
    def __init__(self,
                 initial_batch_size: int = 5,
                 min_batch_size: int = 1,
                 max_batch_size: int = 20,
                 batch_timeout_ms: int = 100,
                 adaptation_interval: int = 10):  # batches
        super().__init__(initial_batch_size, batch_timeout_ms)
        
        self.min_batch_size = min_batch_size
        self.max_batch_size = max_batch_size
        self.adaptation_interval = adaptation_interval
        
        # Performance tracking
        self.batch_latencies: List[float] = []
        self.batch_throughputs: List[float] = []
        self.last_adaptation_batch = 0
        
    async def _flush(self) -> Optional[TokenBatch]:
        """Enhanced flush with performance tracking"""
        start_time = time.time()
        batch = await super()._flush()
        
        if batch:
            # Track performance
            latency = time.time() - start_time
            throughput = batch.size / latency if latency > 0 else 0
            
            self.batch_latencies.append(latency)
            self.batch_throughputs.append(throughput)
            
            # Adapt batch size if needed
            if self.batch_count - self.last_adaptation_batch >= self.adaptation_interval:
                self._adapt_batch_size()
                
        return batch
        
    def _adapt_batch_size(self):
        """Adapt batch size based on performance metrics"""
        if not self.batch_latencies or not self.batch_throughputs:
            return
            
        # Calculate recent performance
        recent_latencies = self.batch_latencies[-self.adaptation_interval:]
        recent_throughputs = self.batch_throughputs[-self.adaptation_interval:]
        
        avg_latency = sum(recent_latencies) / len(recent_latencies)
        avg_throughput = sum(recent_throughputs) / len(recent_throughputs)
        
        # Adapt batch size
        old_size = self.batch_size
        
        # If latency is high, reduce batch size
        if avg_latency > 0.1:  # 100ms threshold
            self.batch_size = max(self.min_batch_size, self.batch_size - 1)
        # If throughput is good and latency is low, increase batch size
        elif avg_latency < 0.05 and avg_throughput > 100:
            self.batch_size = min(self.max_batch_size, self.batch_size + 1)
            
        if self.batch_size != old_size:
            logger.info(f"Adapted batch size from {old_size} to {self.batch_size} "
                       f"(latency: {avg_latency:.3f}s, throughput: {avg_throughput:.1f} tokens/s)")
            
        self.last_adaptation_batch = self.batch_count
        
    def get_performance_stats(self) -> dict:
        """Get detailed performance statistics"""
        stats = self.get_stats()
        
        if self.batch_latencies and self.batch_throughputs:
            recent_latencies = self.batch_latencies[-10:]
            recent_throughputs = self.batch_throughputs[-10:]
            
            stats.update({
                "avg_latency_ms": sum(recent_latencies) / len(recent_latencies) * 1000,
                "avg_throughput_tokens_per_sec": sum(recent_throughputs) / len(recent_throughputs),
                "current_batch_size": self.batch_size,
                "adaptations_count": self.batch_count // self.adaptation_interval
            })
            
        return stats