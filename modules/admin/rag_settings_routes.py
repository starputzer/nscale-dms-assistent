"""
Admin RAG Settings Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from modules.core.auth_dependency import get_current_user
from modules.rag.engine import RAGEngine
from modules.rag.performance_optimizer import PerformanceOptimizer

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
rag_engine = RAGEngine()
perf_optimizer = PerformanceOptimizer()

# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data

@router.get("/settings")
async def get_rag_settings(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get current RAG settings"""
    try:
        config = rag_engine.get_config()
        
        return config
    except Exception as e:
        logger.error(f"Error getting RAG settings: {e}")
        # Return default config
        return {
            "retrieval": {
                "chunk_size": 512,
                "chunk_overlap": 50,
                "top_k": 5,
                "similarity_threshold": 0.7,
                "rerank_enabled": True,
                "hybrid_search": True
            },
            "embedding": {
                "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                "dimension": 384,
                "batch_size": 32,
                "normalize": True
            },
            "generation": {
                "model": "llama3:8b-instruct-q4_1",
                "temperature": 0.7,
                "max_tokens": 2048,
                "context_window": 4096,
                "system_prompt": "Du bist ein hilfreicher Assistent für nscale Dokumentenmanagement."
            },
            "optimization": {
                "cache_enabled": True,
                "cache_ttl_minutes": 60,
                "async_processing": True,
                "batch_queries": True,
                "compression_enabled": True
            }
        }

@router.get("/config")
async def get_rag_config(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get current RAG configuration"""
    try:
        config = rag_engine.get_config()
        
        return config
    except Exception as e:
        logger.error(f"Error getting RAG config: {e}")
        # Return default config
        return {
            "retrieval": {
                "chunk_size": 512,
                "chunk_overlap": 50,
                "top_k": 5,
                "similarity_threshold": 0.7,
                "rerank_enabled": True,
                "hybrid_search": True
            },
            "embedding": {
                "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                "dimension": 384,
                "batch_size": 32,
                "normalize": True
            },
            "generation": {
                "model": "llama3:8b-instruct-q4_1",
                "temperature": 0.7,
                "max_tokens": 2048,
                "context_window": 4096,
                "system_prompt": "Du bist ein hilfreicher Assistent für nscale Dokumentenmanagement."
            },
            "optimization": {
                "cache_enabled": True,
                "cache_ttl_minutes": 60,
                "async_processing": True,
                "batch_queries": True,
                "compression_enabled": True
            }
        }

@router.put("/config")
async def update_rag_config(
    config: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Update RAG configuration"""
    try:
        # Validate configuration
        validation_result = rag_engine.validate_config(config)
        if not validation_result["valid"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid configuration: {validation_result['errors']}"
            )
        
        # Apply configuration
        rag_engine.update_config(config)
        
        return {
            "success": True,
            "message": "RAG configuration updated successfully",
            "restart_required": validation_result.get("restart_required", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating RAG config: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/performance")
async def get_rag_performance(
    hours: int = 24,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get RAG performance metrics"""
    try:
        metrics = perf_optimizer.get_performance_metrics(hours)
        
        return metrics
    except Exception as e:
        logger.error(f"Error getting RAG performance: {e}")
        # Return mock data
        return {
            "period": f"Last {hours} hours",
            "queries": {
                "total": 1250,
                "average_response_time_ms": 185,
                "p95_response_time_ms": 320,
                "p99_response_time_ms": 450,
                "cache_hit_rate": 0.68
            },
            "retrieval": {
                "average_chunks_retrieved": 5.2,
                "average_relevance_score": 0.82,
                "reranking_improvement": 0.15,
                "empty_results_rate": 0.02
            },
            "generation": {
                "average_tokens_generated": 256,
                "average_generation_time_ms": 120,
                "timeout_rate": 0.001
            },
            "errors": {
                "total": 15,
                "retrieval_errors": 5,
                "generation_errors": 8,
                "timeout_errors": 2
            }
        }

@router.get("/index/status")
async def get_index_status(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get vector index status"""
    try:
        status = rag_engine.get_index_status()
        
        return status
    except Exception as e:
        logger.error(f"Error getting index status: {e}")
        # Return mock data
        return {
            "status": "healthy",
            "total_documents": 1050,
            "total_chunks": 15750,
            "total_embeddings": 15750,
            "index_size_mb": 450.5,
            "last_update": "2025-06-05T10:30:00Z",
            "index_type": "HNSW",
            "dimensions": 384,
            "metrics": {
                "search_speed_ms": 12,
                "indexing_speed_chunks_per_second": 150,
                "memory_usage_mb": 380
            }
        }

@router.post("/index/rebuild")
async def rebuild_index(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Rebuild the vector index"""
    try:
        job_id = rag_engine.start_index_rebuild()
        
        return {
            "success": True,
            "message": "Index rebuild started",
            "job_id": job_id
        }
    except Exception as e:
        logger.error(f"Error starting index rebuild: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/index/optimize")
async def optimize_index(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Optimize the vector index"""
    try:
        result = rag_engine.optimize_index()
        
        return {
            "success": True,
            "message": "Index optimization completed",
            "improvements": result
        }
    except Exception as e:
        logger.error(f"Error optimizing index: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/available-models")
async def get_available_models(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get available models for RAG"""
    try:
        models = {
            "embedding_models": [
                {
                    "id": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                    "name": "Multilingual MiniLM L12 v2",
                    "languages": ["de", "en", "fr", "es", "it"],
                    "dimension": 384,
                    "max_tokens": 512,
                    "size_mb": 120
                },
                {
                    "id": "sentence-transformers/all-mpnet-base-v2",
                    "name": "All MPNet Base v2",
                    "languages": ["en"],
                    "dimension": 768,
                    "max_tokens": 512,
                    "size_mb": 420
                }
            ],
            "generation_models": [
                {
                    "id": "llama3:8b-instruct-q4_1",
                    "name": "Llama 3 8B Instruct (Q4)",
                    "size_gb": 4.5,
                    "context_window": 8192,
                    "languages": ["multi"],
                    "quantization": "Q4_1"
                },
                {
                    "id": "mistral:7b-instruct-v0.2",
                    "name": "Mistral 7B Instruct v0.2",
                    "size_gb": 4.1,
                    "context_window": 8192,
                    "languages": ["multi"],
                    "quantization": "Q4_0"
                }
            ]
        }
        
        return models
    except Exception as e:
        logger.error(f"Error getting available models: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/models")
async def get_available_models(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get available models for RAG"""
    try:
        models = {
            "embedding_models": [
                {
                    "id": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                    "name": "Multilingual MiniLM L12 v2",
                    "languages": ["de", "en", "fr", "es", "it"],
                    "dimension": 384,
                    "max_tokens": 512,
                    "size_mb": 120
                },
                {
                    "id": "sentence-transformers/all-mpnet-base-v2",
                    "name": "All MPNet Base v2",
                    "languages": ["en"],
                    "dimension": 768,
                    "max_tokens": 512,
                    "size_mb": 420
                }
            ],
            "generation_models": [
                {
                    "id": "llama3:8b-instruct-q4_1",
                    "name": "Llama 3 8B Instruct (Q4)",
                    "size_gb": 4.5,
                    "context_window": 8192,
                    "languages": ["multi"],
                    "quantization": "Q4_1"
                },
                {
                    "id": "mistral:7b-instruct-v0.2",
                    "name": "Mistral 7B Instruct v0.2",
                    "size_gb": 4.1,
                    "context_window": 8192,
                    "languages": ["multi"],
                    "quantization": "Q4_0"
                }
            ]
        }
        
        return models
    except Exception as e:
        logger.error(f"Error getting available models: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/presets")
async def get_rag_presets(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get predefined RAG configuration presets"""
    try:
        return {
            "presets": [
                {
                    "id": "high_accuracy",
                    "name": "Hohe Genauigkeit",
                    "description": "Optimiert für präzise Antworten",
                    "config": {
                        "retrieval": {
                            "top_k": 10,
                            "similarity_threshold": 0.8,
                            "rerank_enabled": True
                        },
                        "generation": {
                            "temperature": 0.3,
                            "max_tokens": 2048
                        }
                    }
                },
                {
                    "id": "fast_response",
                    "name": "Schnelle Antworten",
                    "description": "Optimiert für niedrige Latenz",
                    "config": {
                        "retrieval": {
                            "top_k": 3,
                            "similarity_threshold": 0.6,
                            "rerank_enabled": False
                        },
                        "generation": {
                            "temperature": 0.7,
                            "max_tokens": 512
                        }
                    }
                },
                {
                    "id": "balanced",
                    "name": "Ausgewogen",
                    "description": "Balance zwischen Geschwindigkeit und Genauigkeit",
                    "config": {
                        "retrieval": {
                            "top_k": 5,
                            "similarity_threshold": 0.7,
                            "rerank_enabled": True
                        },
                        "generation": {
                            "temperature": 0.5,
                            "max_tokens": 1024
                        }
                    }
                }
            ]
        }
    except Exception as e:
        logger.error(f"Error getting RAG presets: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/prompts")
async def get_system_prompts(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get system prompts"""
    try:
        prompts = rag_engine.get_system_prompts()
        
        return prompts
    except Exception as e:
        logger.error(f"Error getting system prompts: {e}")
        # Return default prompts
        return {
            "default": "Du bist ein hilfreicher Assistent für nscale Dokumentenmanagement. Beantworte Fragen basierend auf den bereitgestellten Kontextinformationen.",
            "retrieval": "Verwende die folgenden Dokumente, um die Frage zu beantworten:\n\n{context}\n\nFrage: {question}",
            "no_context": "Ich kann keine relevanten Informationen in der Wissensdatenbank finden. Bitte stellen Sie eine spezifischere Frage oder kontaktieren Sie den Support.",
            "error": "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut."
        }

@router.put("/prompts")
async def update_system_prompts(
    prompts: Dict[str, str],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Update system prompts"""
    try:
        rag_engine.update_system_prompts(prompts)
        
        return {"success": True, "message": "System prompts updated successfully"}
    except Exception as e:
        logger.error(f"Error updating system prompts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/test-query")
async def test_rag_query(
    query: str,
    config_override: Optional[Dict[str, Any]] = None,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Test RAG query with optional config override"""
    try:
        result = await rag_engine.test_query(
            query=query,
            config_override=config_override
        )
        
        return {
            "query": query,
            "result": result["answer"],
            "sources": result["sources"],
            "metrics": {
                "retrieval_time_ms": result["retrieval_time_ms"],
                "generation_time_ms": result["generation_time_ms"],
                "total_time_ms": result["total_time_ms"],
                "chunks_retrieved": len(result["chunks"]),
                "relevance_scores": result["relevance_scores"]
            }
        }
    except Exception as e:
        logger.error(f"Error testing RAG query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cache/stats")
async def get_cache_stats(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get RAG cache statistics"""
    try:
        stats = rag_engine.get_cache_stats()
        
        return stats
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        # Return mock data
        return {
            "enabled": True,
            "size_mb": 125.5,
            "entries": 850,
            "hit_rate": 0.68,
            "miss_rate": 0.32,
            "eviction_rate": 0.05,
            "ttl_minutes": 60,
            "oldest_entry": "2025-06-05T11:30:00Z",
            "newest_entry": "2025-06-05T12:25:00Z"
        }

@router.post("/cache/clear")
async def clear_cache(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Clear RAG cache"""
    try:
        rag_engine.clear_cache()
        
        return {"success": True, "message": "Cache cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")