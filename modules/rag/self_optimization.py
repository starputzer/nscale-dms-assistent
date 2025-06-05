"""
Self-Optimization System for RAG
Automatically adjusts parameters based on performance metrics
"""

import json
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import threading
import time

from ..core.logging import LogManager
from ..core.config import Config
from .performance_monitor import PerformanceMonitor, get_performance_monitor

logger = LogManager.setup_logging(__name__)


class OptimizationStrategy:
    """Base class for optimization strategies"""
    
    def __init__(self, name: str):
        self.name = name
        self.history: List[Dict[str, Any]] = []
        
    def evaluate(self, metrics: Dict[str, Any]) -> float:
        """Evaluate current performance (0-1, higher is better)"""
        raise NotImplementedError
        
    def suggest_changes(self, 
                       current_params: Dict[str, Any],
                       metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest parameter changes based on metrics"""
        raise NotImplementedError
        
    def record_result(self, params: Dict[str, Any], score: float):
        """Record optimization result"""
        self.history.append({
            'timestamp': datetime.now().isoformat(),
            'params': params,
            'score': score
        })


class QueryPerformanceStrategy(OptimizationStrategy):
    """Optimize for query performance"""
    
    def __init__(self):
        super().__init__("query_performance")
        self.target_response_time = 500  # ms
        
    def evaluate(self, metrics: Dict[str, Any]) -> float:
        """Evaluate based on response time and accuracy"""
        avg_time = metrics.get('performance', {}).get('avg_query_time_ms', 1000)
        cache_hit_rate = metrics.get('performance', {}).get('cache_hit_rate', 0)
        error_rate = metrics.get('performance', {}).get('error_rate', 0.1)
        
        # Score components (weighted)
        time_score = max(0, 1 - (avg_time / self.target_response_time))
        cache_score = cache_hit_rate
        error_score = 1 - error_rate
        
        # Weighted average
        score = (0.5 * time_score + 0.3 * cache_score + 0.2 * error_score)
        return max(0, min(1, score))
        
    def suggest_changes(self, 
                       current_params: Dict[str, Any],
                       metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest parameter adjustments"""
        suggestions = {}
        
        avg_time = metrics.get('performance', {}).get('avg_query_time_ms', 1000)
        cache_hit_rate = metrics.get('performance', {}).get('cache_hit_rate', 0)
        
        # Adjust retrieval parameters
        if avg_time > self.target_response_time:
            # Reduce computational load
            current_top_k = current_params.get('retrieval', {}).get('top_k', 10)
            if current_top_k > 5:
                suggestions.setdefault('retrieval', {})['top_k'] = current_top_k - 1
                
            # Increase similarity threshold to reduce results
            current_threshold = current_params.get('retrieval', {}).get('similarity_threshold', 0.7)
            if current_threshold < 0.85:
                suggestions.setdefault('retrieval', {})['similarity_threshold'] = min(0.85, current_threshold + 0.05)
                
        # Improve cache performance
        if cache_hit_rate < 0.6:
            current_cache_ttl = current_params.get('cache', {}).get('ttl_minutes', 60)
            suggestions.setdefault('cache', {})['ttl_minutes'] = min(1440, current_cache_ttl * 2)
            
        return suggestions


class ResourceEfficiencyStrategy(OptimizationStrategy):
    """Optimize for resource efficiency"""
    
    def __init__(self):
        super().__init__("resource_efficiency")
        self.cpu_target = 60  # %
        self.memory_target = 70  # %
        
    def evaluate(self, metrics: Dict[str, Any]) -> float:
        """Evaluate based on resource usage"""
        cpu_usage = metrics.get('system', {}).get('cpu_percent', 100)
        memory_usage = metrics.get('system', {}).get('memory_percent', 100)
        
        # Penalize both under and over utilization
        cpu_score = 1 - abs(cpu_usage - self.cpu_target) / 100
        memory_score = 1 - abs(memory_usage - self.memory_target) / 100
        
        # Also consider throughput
        qps = metrics.get('performance', {}).get('queries_per_second', 0)
        throughput_score = min(1, qps / 10)  # Target 10 QPS
        
        score = (0.3 * cpu_score + 0.3 * memory_score + 0.4 * throughput_score)
        return max(0, min(1, score))
        
    def suggest_changes(self, 
                       current_params: Dict[str, Any],
                       metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest resource optimization changes"""
        suggestions = {}
        
        cpu_usage = metrics.get('system', {}).get('cpu_percent', 0)
        memory_usage = metrics.get('system', {}).get('memory_percent', 0)
        
        # CPU optimization
        if cpu_usage > 80:
            # Reduce batch size
            current_batch = current_params.get('processing', {}).get('batch_size', 10)
            if current_batch > 5:
                suggestions.setdefault('processing', {})['batch_size'] = current_batch - 2
                
            # Reduce concurrency
            current_workers = current_params.get('processing', {}).get('max_workers', 4)
            if current_workers > 2:
                suggestions.setdefault('processing', {})['max_workers'] = current_workers - 1
                
        elif cpu_usage < 40:
            # Increase throughput
            current_batch = current_params.get('processing', {}).get('batch_size', 10)
            suggestions.setdefault('processing', {})['batch_size'] = min(20, current_batch + 2)
            
        # Memory optimization
        if memory_usage > 85:
            # Reduce cache size
            current_cache_size = current_params.get('cache', {}).get('max_size', 1000)
            if current_cache_size > 500:
                suggestions.setdefault('cache', {})['max_size'] = int(current_cache_size * 0.8)
                
            # Reduce chunk size
            current_chunk_size = current_params.get('chunking', {}).get('chunk_size', 1000)
            if current_chunk_size > 500:
                suggestions.setdefault('chunking', {})['chunk_size'] = int(current_chunk_size * 0.9)
                
        return suggestions


class SelfOptimizer:
    """Main self-optimization system"""
    
    def __init__(self, 
                 rag_engine,
                 optimization_interval: int = 300):  # 5 minutes
        self.rag_engine = rag_engine
        self.optimization_interval = optimization_interval
        self.performance_monitor = get_performance_monitor()
        
        # Optimization strategies
        self.strategies = {
            'query_performance': QueryPerformanceStrategy(),
            'resource_efficiency': ResourceEfficiencyStrategy()
        }
        
        # Current optimization mode
        self.mode = 'balanced'  # 'performance', 'efficiency', 'balanced'
        
        # Parameter bounds
        self.param_bounds = {
            'retrieval.top_k': (3, 20),
            'retrieval.similarity_threshold': (0.5, 0.95),
            'cache.ttl_minutes': (10, 1440),
            'cache.max_size': (100, 10000),
            'processing.batch_size': (1, 50),
            'processing.max_workers': (1, 8),
            'chunking.chunk_size': (100, 2000),
            'chunking.chunk_overlap': (0, 500)
        }
        
        # Optimization history
        self.optimization_history: List[Dict[str, Any]] = []
        
        # Thread control
        self.is_optimizing = False
        self.optimization_thread: Optional[threading.Thread] = None
        
        # Best known configuration
        self.best_config: Optional[Dict[str, Any]] = None
        self.best_score = 0.0
        
    def start(self):
        """Start self-optimization"""
        if self.is_optimizing:
            logger.warning("Self-optimizer is already running")
            return
            
        self.is_optimizing = True
        self.optimization_thread = threading.Thread(
            target=self._optimization_loop, 
            daemon=True
        )
        self.optimization_thread.start()
        logger.info("Self-optimizer started")
        
    def stop(self):
        """Stop self-optimization"""
        self.is_optimizing = False
        if self.optimization_thread:
            self.optimization_thread.join(timeout=10)
            self.optimization_thread = None
        logger.info("Self-optimizer stopped")
        
    def set_mode(self, mode: str):
        """Set optimization mode"""
        if mode in ['performance', 'efficiency', 'balanced']:
            self.mode = mode
            logger.info(f"Optimization mode set to: {mode}")
        else:
            logger.warning(f"Invalid optimization mode: {mode}")
            
    def _optimization_loop(self):
        """Main optimization loop"""
        while self.is_optimizing:
            try:
                # Wait for metrics to accumulate
                time.sleep(self.optimization_interval)
                
                # Get performance metrics
                metrics = self.performance_monitor.get_performance_report()
                
                if 'error' not in metrics:
                    # Run optimization
                    self._optimize(metrics)
                    
            except Exception as e:
                logger.error(f"Error in optimization loop: {str(e)}")
                
    def _optimize(self, metrics: Dict[str, Any]):
        """Run optimization cycle"""
        try:
            # Get current configuration
            current_config = self._get_current_config()
            
            # Evaluate current performance
            scores = self._evaluate_performance(metrics)
            overall_score = self._calculate_overall_score(scores)
            
            # Record history
            self.optimization_history.append({
                'timestamp': datetime.now().isoformat(),
                'config': current_config,
                'metrics': metrics,
                'scores': scores,
                'overall_score': overall_score
            })
            
            # Update best configuration
            if overall_score > self.best_score:
                self.best_config = current_config.copy()
                self.best_score = overall_score
                logger.info(f"New best configuration found (score: {overall_score:.3f})")
            
            # Check if optimization needed
            if overall_score < 0.8:  # Below target performance
                # Get suggestions from strategies
                all_suggestions = self._collect_suggestions(current_config, metrics)
                
                # Merge and validate suggestions
                new_config = self._merge_suggestions(current_config, all_suggestions)
                
                # Apply configuration
                if new_config != current_config:
                    self._apply_config(new_config)
                    logger.info(f"Applied optimization (expected improvement: "
                              f"{self._estimate_improvement(scores):.1%})")
                    
        except Exception as e:
            logger.error(f"Error during optimization: {str(e)}")
            
    def _get_current_config(self) -> Dict[str, Any]:
        """Get current RAG configuration"""
        # This would interface with the actual RAG engine
        # For now, return a representative config
        return {
            'retrieval': {
                'top_k': 10,
                'similarity_threshold': 0.7,
                'use_hybrid': True,
                'hybrid_alpha': 0.7
            },
            'cache': {
                'enabled': True,
                'ttl_minutes': 60,
                'max_size': 1000
            },
            'processing': {
                'batch_size': 10,
                'max_workers': 4
            },
            'chunking': {
                'chunk_size': 1000,
                'chunk_overlap': 200,
                'strategy': 'semantic'
            }
        }
        
    def _evaluate_performance(self, metrics: Dict[str, Any]) -> Dict[str, float]:
        """Evaluate performance using all strategies"""
        scores = {}
        
        for name, strategy in self.strategies.items():
            try:
                score = strategy.evaluate(metrics)
                scores[name] = score
            except Exception as e:
                logger.error(f"Error evaluating {name}: {str(e)}")
                scores[name] = 0.0
                
        return scores
        
    def _calculate_overall_score(self, scores: Dict[str, float]) -> float:
        """Calculate weighted overall score based on mode"""
        if self.mode == 'performance':
            weights = {
                'query_performance': 0.8,
                'resource_efficiency': 0.2
            }
        elif self.mode == 'efficiency':
            weights = {
                'query_performance': 0.3,
                'resource_efficiency': 0.7
            }
        else:  # balanced
            weights = {
                'query_performance': 0.5,
                'resource_efficiency': 0.5
            }
            
        total_score = sum(
            scores.get(name, 0) * weight 
            for name, weight in weights.items()
        )
        
        return total_score
        
    def _collect_suggestions(self, 
                           current_config: Dict[str, Any],
                           metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Collect suggestions from all strategies"""
        suggestions = []
        
        for name, strategy in self.strategies.items():
            try:
                suggestion = strategy.suggest_changes(current_config, metrics)
                if suggestion:
                    suggestions.append(suggestion)
            except Exception as e:
                logger.error(f"Error getting suggestions from {name}: {str(e)}")
                
        return suggestions
        
    def _merge_suggestions(self, 
                         current_config: Dict[str, Any],
                         suggestions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Merge and validate suggestions"""
        new_config = json.loads(json.dumps(current_config))  # Deep copy
        
        for suggestion in suggestions:
            for category, params in suggestion.items():
                if category not in new_config:
                    new_config[category] = {}
                    
                for param, value in params.items():
                    # Check bounds
                    bound_key = f"{category}.{param}"
                    if bound_key in self.param_bounds:
                        min_val, max_val = self.param_bounds[bound_key]
                        value = max(min_val, min(max_val, value))
                        
                    new_config[category][param] = value
                    
        return new_config
        
    def _apply_config(self, config: Dict[str, Any]):
        """Apply configuration to RAG engine"""
        # This would interface with the actual RAG engine
        # For now, just log the changes
        logger.info(f"Applying configuration: {json.dumps(config, indent=2)}")
        
    def _estimate_improvement(self, current_scores: Dict[str, float]) -> float:
        """Estimate potential improvement"""
        # Simple heuristic: room for improvement
        current_overall = self._calculate_overall_score(current_scores)
        potential_improvement = (1.0 - current_overall) * 0.3  # Conservative estimate
        return potential_improvement
        
    def get_optimization_report(self) -> Dict[str, Any]:
        """Get optimization status and recommendations"""
        recent_history = self.optimization_history[-10:] if self.optimization_history else []
        
        report = {
            'status': 'active' if self.is_optimizing else 'stopped',
            'mode': self.mode,
            'current_performance': {
                'best_score': self.best_score,
                'best_config': self.best_config
            },
            'recent_optimizations': recent_history,
            'recommendations': self._generate_recommendations()
        }
        
        return report
        
    def _generate_recommendations(self) -> List[str]:
        """Generate human-readable recommendations"""
        recommendations = []
        
        if not self.optimization_history:
            recommendations.append("Insufficient data for recommendations. Allow system to run longer.")
            return recommendations
            
        # Analyze recent trends
        recent_scores = [h['overall_score'] for h in self.optimization_history[-5:]]
        
        if all(s > 0.9 for s in recent_scores):
            recommendations.append("System is performing optimally. No changes recommended.")
        elif all(s < 0.5 for s in recent_scores):
            recommendations.append("System performance is poor. Consider manual intervention.")
            recommendations.append("Check resource allocation and system load.")
        else:
            # Specific recommendations based on scores
            last_scores = self.optimization_history[-1]['scores']
            
            if last_scores.get('query_performance', 0) < 0.7:
                recommendations.append("Query performance is below target. Consider:")
                recommendations.append("- Increasing cache size and TTL")
                recommendations.append("- Optimizing embedding model")
                recommendations.append("- Reducing retrieval scope")
                
            if last_scores.get('resource_efficiency', 0) < 0.7:
                recommendations.append("Resource efficiency is low. Consider:")
                recommendations.append("- Adjusting batch sizes")
                recommendations.append("- Optimizing worker pool size")
                recommendations.append("- Implementing request throttling")
                
        return recommendations
        
    def export_optimization_history(self, filepath: str):
        """Export optimization history"""
        try:
            data = {
                'export_time': datetime.now().isoformat(),
                'mode': self.mode,
                'best_config': self.best_config,
                'best_score': self.best_score,
                'history': self.optimization_history
            }
            
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
                
            logger.info(f"Exported optimization history to {filepath}")
            
        except Exception as e:
            logger.error(f"Error exporting optimization history: {str(e)}")