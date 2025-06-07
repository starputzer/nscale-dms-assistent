"""
Model Health Check System

Comprehensive health monitoring for all AI models in the system:
- Embedding models (BAAI/bge-m3, paraphrase-MiniLM-L3-v2)
- Reranker model (cross-encoder/ms-marco-MiniLM-L-6-v2)
- LLM (Ollama models)

Provides real-time health status, performance metrics, and automatic recovery.
"""

import time
import asyncio
import psutil
import torch
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import json
import httpx
from sentence_transformers import SentenceTransformer, CrossEncoder
import logging
from cachetools import TTLCache
import threading
import gc
import os

from modules.core.config import Config
from modules.core.logging import LogManager

logger = LogManager.setup_logging(__name__)


class ModelHealthChecker:
    """Comprehensive model health monitoring and management"""
    
    def __init__(self):
        self._health_cache = TTLCache(maxsize=100, ttl=60)  # 1-minute cache
        self._lock = threading.RLock()
        self._model_registry = {}
        self._last_check_times = {}
        self._check_interval = 300  # 5 minutes between detailed checks
        
        # Model configurations
        self.model_configs = {
            "embedding_primary": {
                "name": "BAAI/bge-m3",
                "type": "embedding",
                "expected_dim": 1024,
                "min_memory_mb": 1500,
                "test_texts": ["Test embedding", "Zweiter Test für Embeddings"]
            },
            "embedding_fallback": {
                "name": "paraphrase-MiniLM-L3-v2",
                "type": "embedding",
                "expected_dim": 384,
                "min_memory_mb": 500,
                "test_texts": ["Fallback test", "Alternative embedding"]
            },
            "reranker": {
                "name": "cross-encoder/ms-marco-MiniLM-L-6-v2",
                "type": "cross-encoder",
                "min_memory_mb": 800,
                "test_pairs": [
                    ["Wie kann ich ein Dokument hochladen?", "Um ein Dokument hochzuladen, klicken Sie auf den Upload-Button."],
                    ["Was ist nscale?", "nscale ist ein Enterprise Content Management System."]
                ]
            },
            "llm": {
                "name": Config.MODEL_NAME,
                "type": "ollama",
                "url": Config.OLLAMA_URL,
                "min_memory_mb": 4000,
                "test_prompt": "Antworte kurz: Was ist 2+2?"
            }
        }
        
        # Initialize device
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
        
    async def check_all_models(self, force: bool = False) -> Dict[str, Any]:
        """Check health of all models with caching"""
        cache_key = "all_models_health"
        
        if not force and cache_key in self._health_cache:
            logger.debug("Returning cached health status")
            return self._health_cache[cache_key]
        
        logger.info("Starting comprehensive model health check...")
        start_time = time.time()
        
        health_status = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "healthy",
            "models": {},
            "system": await self._get_system_metrics(),
            "issues": [],
            "recommendations": []
        }
        
        # Check each model
        for model_id, config in self.model_configs.items():
            try:
                if config["type"] == "ollama":
                    model_health = await self._check_ollama_health(model_id, config)
                else:
                    model_health = await self._check_transformer_health(model_id, config)
                
                health_status["models"][model_id] = model_health
                
                # Update overall status
                if model_health["status"] == "error":
                    health_status["overall_status"] = "critical"
                    health_status["issues"].append(f"{model_id}: {model_health.get('error', 'Unknown error')}")
                elif model_health["status"] == "warning" and health_status["overall_status"] == "healthy":
                    health_status["overall_status"] = "warning"
                    health_status["issues"].append(f"{model_id}: {model_health.get('warning', 'Performance degraded')}")
                    
            except Exception as e:
                logger.error(f"Error checking {model_id}: {str(e)}")
                health_status["models"][model_id] = {
                    "status": "error",
                    "error": str(e),
                    "loaded": False
                }
                health_status["overall_status"] = "critical"
                health_status["issues"].append(f"{model_id}: Health check failed - {str(e)}")
        
        # Add recommendations
        health_status["recommendations"] = self._generate_recommendations(health_status)
        
        # Calculate total check time
        health_status["check_duration_ms"] = int((time.time() - start_time) * 1000)
        
        # Cache the result
        self._health_cache[cache_key] = health_status
        
        logger.info(f"Health check completed in {health_status['check_duration_ms']}ms - Status: {health_status['overall_status']}")
        
        return health_status
    
    async def check_specific_model(self, model_id: str, force: bool = False) -> Dict[str, Any]:
        """Check health of a specific model"""
        if model_id not in self.model_configs:
            return {
                "error": f"Unknown model ID: {model_id}",
                "status": "error",
                "available_models": list(self.model_configs.keys())
            }
        
        cache_key = f"model_health_{model_id}"
        
        if not force and cache_key in self._health_cache:
            return self._health_cache[cache_key]
        
        config = self.model_configs[model_id]
        
        try:
            if config["type"] == "ollama":
                result = await self._check_ollama_health(model_id, config)
            else:
                result = await self._check_transformer_health(model_id, config)
            
            self._health_cache[cache_key] = result
            return result
            
        except Exception as e:
            logger.error(f"Error checking {model_id}: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "model_id": model_id,
                "timestamp": datetime.now().isoformat()
            }
    
    async def test_model_with_data(self, model_id: str, test_data: Dict[str, Any]) -> Dict[str, Any]:
        """Test a specific model with custom data"""
        if model_id not in self.model_configs:
            return {
                "error": f"Unknown model ID: {model_id}",
                "status": "error"
            }
        
        config = self.model_configs[model_id]
        start_time = time.time()
        
        try:
            if config["type"] == "embedding":
                result = await self._test_embedding_model(model_id, test_data.get("texts", ["Test text"]))
            elif config["type"] == "cross-encoder":
                result = await self._test_reranker_model(model_id, test_data.get("pairs", [["Query", "Document"]]))
            elif config["type"] == "ollama":
                result = await self._test_ollama_model(model_id, test_data.get("prompt", "Test prompt"))
            else:
                result = {"error": f"Unknown model type: {config['type']}"}
            
            result["test_duration_ms"] = int((time.time() - start_time) * 1000)
            result["timestamp"] = datetime.now().isoformat()
            
            return result
            
        except Exception as e:
            logger.error(f"Error testing {model_id}: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "model_id": model_id,
                "test_duration_ms": int((time.time() - start_time) * 1000)
            }
    
    async def _check_transformer_health(self, model_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Check health of transformer-based models (embeddings, reranker)"""
        health_info = {
            "model_id": model_id,
            "model_name": config["name"],
            "type": config["type"],
            "status": "unknown",
            "loaded": False,
            "device": self.device,
            "memory_usage_mb": 0,
            "response_time_ms": None,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # Check if model is loaded
            model = self._model_registry.get(model_id)
            
            if not model:
                # Try to load from existing instances
                if model_id == "embedding_primary":
                    # Check if embedding manager has the model
                    from modules.retrieval.embedding import EmbeddingManager
                    em = EmbeddingManager()
                    if hasattr(em, 'model') and em.model is not None:
                        model = em.model
                        self._model_registry[model_id] = model
                
                elif model_id == "reranker":
                    # Check if reranker has the model
                    from modules.retrieval.reranker import ReRanker
                    rr = ReRanker()
                    if hasattr(rr, 'model') and rr.model is not None:
                        model = rr.model
                        self._model_registry[model_id] = model
            
            if model:
                health_info["loaded"] = True
                
                # Get memory usage
                if self.device == "cuda":
                    torch.cuda.synchronize()
                    memory_bytes = torch.cuda.memory_allocated()
                    health_info["memory_usage_mb"] = memory_bytes / (1024 * 1024)
                    health_info["gpu_memory_total_mb"] = torch.cuda.get_device_properties(0).total_memory / (1024 * 1024)
                    health_info["gpu_memory_used_percent"] = (memory_bytes / torch.cuda.get_device_properties(0).total_memory) * 100
                else:
                    # Estimate CPU memory usage
                    process = psutil.Process()
                    health_info["memory_usage_mb"] = process.memory_info().rss / (1024 * 1024)
                
                # Test model response time
                start_time = time.time()
                
                if config["type"] == "embedding":
                    test_texts = config.get("test_texts", ["Test"])
                    if isinstance(model, SentenceTransformer):
                        embeddings = model.encode(test_texts, convert_to_numpy=True)
                        health_info["output_shape"] = embeddings.shape
                        health_info["expected_dim"] = config.get("expected_dim")
                        
                        if embeddings.shape[1] != config.get("expected_dim", embeddings.shape[1]):
                            health_info["warning"] = f"Unexpected embedding dimension: {embeddings.shape[1]}"
                            health_info["status"] = "warning"
                        else:
                            health_info["status"] = "healthy"
                    
                elif config["type"] == "cross-encoder":
                    test_pairs = config.get("test_pairs", [["Query", "Document"]])
                    if isinstance(model, CrossEncoder):
                        scores = model.predict(test_pairs)
                        health_info["test_scores"] = scores.tolist()
                        health_info["status"] = "healthy"
                
                health_info["response_time_ms"] = int((time.time() - start_time) * 1000)
                
                # Check if response time is acceptable
                if health_info["response_time_ms"] > 1000:
                    health_info["warning"] = "High response time detected"
                    health_info["status"] = "warning"
                
            else:
                health_info["status"] = "not_loaded"
                health_info["info"] = "Model not currently loaded in memory"
                
                # Check if model files exist
                model_path = self._get_model_cache_path(config["name"])
                if model_path and model_path.exists():
                    health_info["model_files_exist"] = True
                    health_info["can_be_loaded"] = True
                else:
                    health_info["model_files_exist"] = False
                    health_info["needs_download"] = True
                    
        except Exception as e:
            logger.error(f"Error checking {model_id} health: {str(e)}")
            health_info["status"] = "error"
            health_info["error"] = str(e)
        
        return health_info
    
    async def _check_ollama_health(self, model_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Check health of Ollama LLM"""
        health_info = {
            "model_id": model_id,
            "model_name": config["name"],
            "type": "ollama",
            "status": "unknown",
            "ollama_url": config["url"],
            "loaded": False,
            "memory_usage_mb": 0,
            "response_time_ms": None,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # Check Ollama server status
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Check if Ollama is running
                try:
                    server_response = await client.get(f"{config['url']}/api/tags")
                    if server_response.status_code == 200:
                        health_info["ollama_server"] = "running"
                        
                        # Check if model is available
                        models_data = server_response.json()
                        available_models = [m["name"] for m in models_data.get("models", [])]
                        health_info["available_models"] = available_models
                        
                        if config["name"] in available_models:
                            health_info["loaded"] = True
                            
                            # Get model info
                            for model in models_data["models"]:
                                if model["name"] == config["name"]:
                                    health_info["model_info"] = {
                                        "size_gb": model.get("size", 0) / (1024**3),
                                        "modified": model.get("modified_at", ""),
                                        "family": model.get("details", {}).get("family", ""),
                                        "parameter_size": model.get("details", {}).get("parameter_size", ""),
                                        "quantization": model.get("details", {}).get("quantization_level", "")
                                    }
                            
                            # Test model response
                            start_time = time.time()
                            test_response = await client.post(
                                f"{config['url']}/api/generate",
                                json={
                                    "model": config["name"],
                                    "prompt": config.get("test_prompt", "Test"),
                                    "stream": False,
                                    "options": {
                                        "num_predict": 10,
                                        "temperature": 0.1
                                    }
                                },
                                timeout=30.0
                            )
                            
                            if test_response.status_code == 200:
                                health_info["response_time_ms"] = int((time.time() - start_time) * 1000)
                                test_data = test_response.json()
                                health_info["test_response"] = test_data.get("response", "")[:100]
                                health_info["status"] = "healthy"
                                
                                # Performance warnings
                                if health_info["response_time_ms"] > 5000:
                                    health_info["warning"] = "High response time"
                                    health_info["status"] = "warning"
                            else:
                                health_info["status"] = "error"
                                health_info["error"] = f"Test failed: {test_response.status_code}"
                        else:
                            health_info["status"] = "not_loaded"
                            health_info["needs_pull"] = True
                            health_info["pull_command"] = f"ollama pull {config['name']}"
                    else:
                        health_info["ollama_server"] = "error"
                        health_info["status"] = "error"
                        health_info["error"] = f"Ollama server returned: {server_response.status_code}"
                        
                except httpx.ConnectError:
                    health_info["ollama_server"] = "not_running"
                    health_info["status"] = "error"
                    health_info["error"] = "Cannot connect to Ollama server"
                    health_info["start_command"] = "ollama serve"
                    
        except Exception as e:
            logger.error(f"Error checking Ollama health: {str(e)}")
            health_info["status"] = "error"
            health_info["error"] = str(e)
        
        return health_info
    
    async def _test_embedding_model(self, model_id: str, texts: List[str]) -> Dict[str, Any]:
        """Test embedding model with custom texts"""
        config = self.model_configs[model_id]
        
        try:
            model = self._model_registry.get(model_id)
            
            if not model:
                # Try to load model
                model = SentenceTransformer(config["name"], device=self.device)
                self._model_registry[model_id] = model
            
            start_time = time.time()
            embeddings = model.encode(texts, convert_to_numpy=True)
            duration_ms = int((time.time() - start_time) * 1000)
            
            return {
                "status": "success",
                "model_id": model_id,
                "input_texts": len(texts),
                "output_shape": embeddings.shape,
                "embedding_dim": embeddings.shape[1],
                "duration_ms": duration_ms,
                "avg_time_per_text_ms": duration_ms / len(texts),
                "sample_embedding": embeddings[0][:10].tolist()  # First 10 dimensions
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "model_id": model_id
            }
    
    async def _test_reranker_model(self, model_id: str, pairs: List[List[str]]) -> Dict[str, Any]:
        """Test reranker model with custom query-document pairs"""
        config = self.model_configs[model_id]
        
        try:
            model = self._model_registry.get(model_id)
            
            if not model:
                # Try to load model
                model = CrossEncoder(config["name"], device=self.device)
                self._model_registry[model_id] = model
            
            start_time = time.time()
            scores = model.predict(pairs)
            duration_ms = int((time.time() - start_time) * 1000)
            
            return {
                "status": "success",
                "model_id": model_id,
                "input_pairs": len(pairs),
                "scores": scores.tolist(),
                "duration_ms": duration_ms,
                "avg_time_per_pair_ms": duration_ms / len(pairs),
                "score_statistics": {
                    "min": float(scores.min()),
                    "max": float(scores.max()),
                    "mean": float(scores.mean()),
                    "std": float(scores.std())
                }
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "model_id": model_id
            }
    
    async def _test_ollama_model(self, model_id: str, prompt: str) -> Dict[str, Any]:
        """Test Ollama model with custom prompt"""
        config = self.model_configs[model_id]
        
        try:
            start_time = time.time()
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{config['url']}/api/generate",
                    json={
                        "model": config["name"],
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "num_predict": 200
                        }
                    }
                )
                
                duration_ms = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "status": "success",
                        "model_id": model_id,
                        "prompt_length": len(prompt),
                        "response_length": len(data.get("response", "")),
                        "response": data.get("response", ""),
                        "duration_ms": duration_ms,
                        "eval_count": data.get("eval_count", 0),
                        "eval_duration_ns": data.get("eval_duration", 0),
                        "tokens_per_second": (data.get("eval_count", 0) / (data.get("eval_duration", 1) / 1e9)) if data.get("eval_duration", 0) > 0 else 0
                    }
                else:
                    return {
                        "status": "error",
                        "error": f"HTTP {response.status_code}: {response.text}",
                        "model_id": model_id,
                        "duration_ms": duration_ms
                    }
                    
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "model_id": model_id
            }
    
    async def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system-wide metrics relevant to model health"""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            
            metrics = {
                "cpu": {
                    "usage_percent": cpu_percent,
                    "count": psutil.cpu_count()
                },
                "memory": {
                    "total_gb": memory.total / (1024**3),
                    "available_gb": memory.available / (1024**3),
                    "used_percent": memory.percent
                }
            }
            
            # GPU metrics if available
            if self.device == "cuda":
                try:
                    gpu_props = torch.cuda.get_device_properties(0)
                    memory_allocated = torch.cuda.memory_allocated(0)
                    memory_reserved = torch.cuda.memory_reserved(0)
                    
                    metrics["gpu"] = {
                        "name": gpu_props.name,
                        "total_memory_gb": gpu_props.total_memory / (1024**3),
                        "allocated_memory_gb": memory_allocated / (1024**3),
                        "reserved_memory_gb": memory_reserved / (1024**3),
                        "free_memory_gb": (gpu_props.total_memory - memory_allocated) / (1024**3),
                        "utilization_percent": (memory_allocated / gpu_props.total_memory) * 100
                    }
                except Exception as e:
                    logger.warning(f"Could not get GPU metrics: {str(e)}")
                    metrics["gpu"] = {"error": str(e)}
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting system metrics: {str(e)}")
            return {"error": str(e)}
    
    def _generate_recommendations(self, health_status: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on health status"""
        recommendations = []
        
        # Check overall system memory
        system_memory = health_status.get("system", {}).get("memory", {})
        if system_memory.get("used_percent", 0) > 85:
            recommendations.append("System memory usage is high (>85%). Consider closing other applications or upgrading RAM.")
        
        # Check GPU memory if available
        gpu_info = health_status.get("system", {}).get("gpu", {})
        if gpu_info and gpu_info.get("utilization_percent", 0) > 90:
            recommendations.append("GPU memory usage is very high (>90%). Consider using smaller models or batch processing.")
        
        # Check individual models
        for model_id, model_health in health_status.get("models", {}).items():
            if model_health.get("status") == "not_loaded":
                if model_health.get("needs_download"):
                    recommendations.append(f"Model '{model_id}' needs to be downloaded. Use appropriate download method.")
                elif model_health.get("needs_pull"):
                    recommendations.append(f"Ollama model '{model_id}' needs to be pulled: {model_health.get('pull_command', '')}")
            
            elif model_health.get("status") == "error":
                if "ollama_server" in model_health and model_health["ollama_server"] == "not_running":
                    recommendations.append("Ollama server is not running. Start it with: ollama serve")
                else:
                    recommendations.append(f"Model '{model_id}' has errors. Check logs for details.")
            
            elif model_health.get("status") == "warning":
                if "response_time_ms" in model_health and model_health["response_time_ms"] > 1000:
                    recommendations.append(f"Model '{model_id}' has high response time. Consider using GPU or a smaller model.")
        
        # If no issues found
        if not recommendations and health_status.get("overall_status") == "healthy":
            recommendations.append("All models are healthy. No actions needed.")
        
        return recommendations
    
    def _get_model_cache_path(self, model_name: str) -> Optional[Path]:
        """Get the cache path for a model"""
        # Common cache locations
        cache_dirs = [
            Path.home() / ".cache" / "torch" / "sentence_transformers",
            Path.home() / ".cache" / "huggingface" / "hub",
            Path("/tmp") / "sentence_transformers"
        ]
        
        # Clean model name for directory search
        clean_name = model_name.replace("/", "_")
        
        for cache_dir in cache_dirs:
            if cache_dir.exists():
                # Look for model directory
                for item in cache_dir.iterdir():
                    if clean_name in item.name or model_name.replace("/", "--") in item.name:
                        return item
        
        return None
    
    async def download_missing_models(self) -> Dict[str, Any]:
        """Attempt to download any missing models"""
        results = {
            "timestamp": datetime.now().isoformat(),
            "downloads": {}
        }
        
        for model_id, config in self.model_configs.items():
            if config["type"] in ["embedding", "cross-encoder"]:
                try:
                    # Check if model exists
                    model_path = self._get_model_cache_path(config["name"])
                    
                    if not model_path or not model_path.exists():
                        logger.info(f"Downloading {model_id}: {config['name']}")
                        start_time = time.time()
                        
                        # Attempt download
                        if config["type"] == "embedding":
                            model = SentenceTransformer(config["name"], device=self.device)
                        else:
                            model = CrossEncoder(config["name"], device=self.device)
                        
                        # Store in registry
                        self._model_registry[model_id] = model
                        
                        results["downloads"][model_id] = {
                            "status": "success",
                            "duration_seconds": time.time() - start_time,
                            "model_name": config["name"]
                        }
                        logger.info(f"Successfully downloaded {model_id}")
                    else:
                        results["downloads"][model_id] = {
                            "status": "already_exists",
                            "path": str(model_path)
                        }
                        
                except Exception as e:
                    logger.error(f"Failed to download {model_id}: {str(e)}")
                    results["downloads"][model_id] = {
                        "status": "error",
                        "error": str(e),
                        "model_name": config["name"]
                    }
            
            elif config["type"] == "ollama":
                # Check if Ollama model needs to be pulled
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(f"{config['url']}/api/tags")
                        
                        if response.status_code == 200:
                            models_data = response.json()
                            available_models = [m["name"] for m in models_data.get("models", [])]
                            
                            if config["name"] not in available_models:
                                results["downloads"][model_id] = {
                                    "status": "needs_manual_pull",
                                    "command": f"ollama pull {config['name']}",
                                    "model_name": config["name"]
                                }
                            else:
                                results["downloads"][model_id] = {
                                    "status": "already_exists",
                                    "model_name": config["name"]
                                }
                        else:
                            results["downloads"][model_id] = {
                                "status": "error",
                                "error": "Cannot connect to Ollama server"
                            }
                            
                except Exception as e:
                    results["downloads"][model_id] = {
                        "status": "error",
                        "error": str(e)
                    }
        
        return results
    
    def cleanup_model_cache(self) -> Dict[str, Any]:
        """Clean up model cache and free memory"""
        with self._lock:
            results = {
                "timestamp": datetime.now().isoformat(),
                "freed_memory_mb": 0,
                "cleaned_models": []
            }
            
            # Clear model registry
            for model_id in list(self._model_registry.keys()):
                del self._model_registry[model_id]
                results["cleaned_models"].append(model_id)
            
            # Clear health cache
            self._health_cache.clear()
            
            # Force garbage collection
            gc.collect()
            
            # GPU memory cleanup
            if self.device == "cuda":
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
            
            # Estimate freed memory (rough estimate)
            results["freed_memory_mb"] = len(results["cleaned_models"]) * 500  # Rough estimate
            
            logger.info(f"Cleaned up {len(results['cleaned_models'])} models from cache")
            
            return results


# Global instance
_health_checker = None


def get_health_checker() -> ModelHealthChecker:
    """Get or create the global health checker instance"""
    global _health_checker
    if _health_checker is None:
        _health_checker = ModelHealthChecker()
    return _health_checker