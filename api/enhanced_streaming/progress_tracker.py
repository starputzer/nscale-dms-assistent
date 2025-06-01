"""
Streaming Progress Tracker
Provides real-time progress estimation for streaming responses
"""

import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from collections import deque
import statistics
import math

@dataclass
class ProgressSnapshot:
    """A snapshot of progress at a point in time"""
    timestamp: float
    tokens_count: int
    elapsed_time: float
    tokens_per_second: float

class StreamingProgressTracker:
    """
    Tracks streaming progress and provides estimates for completion time.
    Uses adaptive estimation based on historical performance.
    """
    
    def __init__(self,
                 estimated_tokens: int = 500,
                 history_window: int = 30,
                 update_interval: float = 0.5):
        """
        Initialize progress tracker.
        
        Args:
            estimated_tokens: Initial estimate of total tokens
            history_window: Number of snapshots to keep for rate calculation
            update_interval: Minimum interval between progress updates (seconds)
        """
        self.estimated_tokens = estimated_tokens
        self.history_window = history_window
        self.update_interval = update_interval
        
        self.start_time = time.time()
        self.tokens_sent = 0
        self.last_update_time = 0
        self.is_complete = False
        
        # Performance history
        self.history: deque[ProgressSnapshot] = deque(maxlen=history_window)
        self.token_rates: deque[float] = deque(maxlen=history_window)
        
        # Adaptive estimation
        self.completion_estimates: deque[float] = deque(maxlen=10)
        self.actual_totals: List[int] = []  # Historical total tokens
        
    def update(self, tokens_count: int = 1) -> Optional[Dict[str, Any]]:
        """
        Update progress with new tokens.
        
        Args:
            tokens_count: Number of tokens to add
            
        Returns:
            Progress info if update interval reached, None otherwise
        """
        self.tokens_sent += tokens_count
        current_time = time.time()
        
        # Check if we should emit an update
        if current_time - self.last_update_time < self.update_interval:
            return None
            
        self.last_update_time = current_time
        
        # Calculate current metrics
        elapsed = current_time - self.start_time
        current_rate = self.tokens_sent / elapsed if elapsed > 0 else 0
        
        # Add to history
        snapshot = ProgressSnapshot(
            timestamp=current_time,
            tokens_count=self.tokens_sent,
            elapsed_time=elapsed,
            tokens_per_second=current_rate
        )
        self.history.append(snapshot)
        self.token_rates.append(current_rate)
        
        # Update estimate
        self._update_estimate()
        
        return self.get_progress()
        
    def _update_estimate(self):
        """Update the estimated total tokens based on current progress"""
        if self.tokens_sent < 50:  # Not enough data
            return
            
        # Use historical data if available
        if self.actual_totals:
            # Weighted average of historical totals
            avg_total = statistics.mean(self.actual_totals)
            # Adjust current estimate towards historical average
            self.estimated_tokens = int(
                0.7 * self.estimated_tokens + 0.3 * avg_total
            )
            
        # Adjust based on current progress patterns
        if len(self.token_rates) >= 5:
            recent_rates = list(self.token_rates)[-5:]
            rate_trend = recent_rates[-1] - recent_rates[0]
            
            # If rate is decreasing significantly, we might be near the end
            if rate_trend < -2:  # tokens/sec decrease
                # Estimate we're 80-90% complete
                estimated_remaining_ratio = 0.15
                self.estimated_tokens = int(
                    self.tokens_sent / (1 - estimated_remaining_ratio)
                )
                
    def get_progress(self) -> Dict[str, Any]:
        """Get current progress information"""
        elapsed = time.time() - self.start_time
        
        # Calculate rate metrics
        current_rate = self._calculate_current_rate()
        smoothed_rate = self._calculate_smoothed_rate()
        
        # Calculate progress percentage
        progress_pct = min(100, (self.tokens_sent / self.estimated_tokens) * 100)
        
        # Estimate remaining time
        remaining_tokens = max(0, self.estimated_tokens - self.tokens_sent)
        if smoothed_rate > 0:
            estimated_remaining = remaining_tokens / smoothed_rate
        else:
            estimated_remaining = float('inf')
            
        # Calculate confidence in estimate
        confidence = self._calculate_confidence()
        
        return {
            "tokens_sent": self.tokens_sent,
            "estimated_total": self.estimated_tokens,
            "progress_percentage": round(progress_pct, 1),
            "elapsed_time": round(elapsed, 1),
            "estimated_time_remaining": round(estimated_remaining, 1) if estimated_remaining != float('inf') else None,
            "current_rate": round(current_rate, 1),
            "smoothed_rate": round(smoothed_rate, 1),
            "confidence": confidence,
            "is_slowing_down": self._is_rate_decreasing(),
            "metadata": {
                "update_count": len(self.history),
                "rate_trend": self._calculate_rate_trend()
            }
        }
        
    def _calculate_current_rate(self) -> float:
        """Calculate instantaneous token rate"""
        if len(self.history) < 2:
            return 0
            
        recent = list(self.history)[-2:]
        time_diff = recent[1].timestamp - recent[0].timestamp
        token_diff = recent[1].tokens_count - recent[0].tokens_count
        
        return token_diff / time_diff if time_diff > 0 else 0
        
    def _calculate_smoothed_rate(self) -> float:
        """Calculate smoothed token rate using recent history"""
        if not self.token_rates:
            return 0
            
        # Use exponential moving average
        if len(self.token_rates) == 1:
            return self.token_rates[0]
            
        weights = [0.5 ** i for i in range(len(self.token_rates))]
        weights.reverse()
        
        weighted_sum = sum(rate * weight for rate, weight in zip(self.token_rates, weights))
        weight_sum = sum(weights)
        
        return weighted_sum / weight_sum if weight_sum > 0 else 0
        
    def _calculate_confidence(self) -> str:
        """Calculate confidence level in the estimate"""
        if self.tokens_sent < 20:
            return "low"
        elif self.tokens_sent < 100:
            return "medium"
        elif self.progress_percentage > 80:
            return "high"
        else:
            # Check rate stability
            if len(self.token_rates) >= 10:
                rate_variance = statistics.variance(list(self.token_rates)[-10:])
                if rate_variance < 5:
                    return "high"
            return "medium"
            
    def _is_rate_decreasing(self) -> bool:
        """Check if token rate is decreasing (indicating near completion)"""
        if len(self.token_rates) < 5:
            return False
            
        recent_rates = list(self.token_rates)[-5:]
        # Linear regression simplified
        avg_early = statistics.mean(recent_rates[:2])
        avg_late = statistics.mean(recent_rates[-2:])
        
        return avg_late < avg_early * 0.8  # 20% decrease threshold
        
    def _calculate_rate_trend(self) -> str:
        """Calculate the trend in token rate"""
        if len(self.token_rates) < 3:
            return "stable"
            
        recent_rates = list(self.token_rates)[-5:]
        avg_rate = statistics.mean(recent_rates)
        
        if recent_rates[-1] > avg_rate * 1.2:
            return "increasing"
        elif recent_rates[-1] < avg_rate * 0.8:
            return "decreasing"
        else:
            return "stable"
            
    def complete(self):
        """Mark streaming as complete and record actual total"""
        self.is_complete = True
        self.actual_totals.append(self.tokens_sent)
        
        # Keep only recent history
        if len(self.actual_totals) > 20:
            self.actual_totals = self.actual_totals[-20:]
            
    @property
    def progress_percentage(self) -> float:
        """Get current progress percentage"""
        return min(100, (self.tokens_sent / self.estimated_tokens) * 100)

class ModelSpecificProgressTracker(StreamingProgressTracker):
    """
    Progress tracker with model-specific estimation.
    Different models have different response patterns.
    """
    
    # Model-specific parameters
    MODEL_PROFILES = {
        "llama3": {
            "avg_tokens": 450,
            "variance": 150,
            "rate_profile": "steady"
        },
        "mistral": {
            "avg_tokens": 380,
            "variance": 100,
            "rate_profile": "burst"
        },
        "gpt": {
            "avg_tokens": 500,
            "variance": 200,
            "rate_profile": "gradual"
        }
    }
    
    def __init__(self, model_name: str = "llama3", **kwargs):
        # Get model profile
        profile = self.MODEL_PROFILES.get(model_name, self.MODEL_PROFILES["llama3"])
        
        # Initialize with model-specific estimate
        estimated_tokens = profile["avg_tokens"]
        super().__init__(estimated_tokens=estimated_tokens, **kwargs)
        
        self.model_name = model_name
        self.model_profile = profile
        
    def _update_estimate(self):
        """Update estimate using model-specific patterns"""
        super()._update_estimate()
        
        # Apply model-specific adjustments
        if self.model_profile["rate_profile"] == "burst":
            # Burst models tend to output quickly then slow down
            if self.tokens_sent < 100 and self._calculate_current_rate() > 50:
                # Likely to be a shorter response
                self.estimated_tokens = min(
                    self.estimated_tokens,
                    self.model_profile["avg_tokens"] - self.model_profile["variance"]
                )
        elif self.model_profile["rate_profile"] == "gradual":
            # Gradual models maintain steady rate
            if len(self.token_rates) > 10:
                rate_stability = statistics.stdev(list(self.token_rates)[-10:])
                if rate_stability < 2:
                    # Very stable rate, use linear projection
                    current_rate = self._calculate_smoothed_rate()
                    if current_rate > 0:
                        # Estimate based on typical duration
                        typical_duration = 10  # seconds
                        self.estimated_tokens = int(current_rate * typical_duration)