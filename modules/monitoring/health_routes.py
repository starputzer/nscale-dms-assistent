"""
Model Health Check Routes

FastAPI routes for comprehensive model health monitoring:
- GET /api/health/models - comprehensive model status
- GET /api/health/models/{model_id} - specific model check
- POST /api/health/models/test - test model with sample data
- GET /api/health/system - overall system health including models
- POST /api/health/models/download - download missing models
- POST /api/health/models/cleanup - clean up model cache
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from modules.core.auth_dependency import get_current_user
from .model_health import get_health_checker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/health", tags=["health"])


# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data


@router.get("/models")
async def get_all_models_health(
    force: bool = False,
    admin_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get comprehensive health status of all AI models in the system.
    
    This endpoint checks:
    - Embedding models (primary and fallback)
    - Reranker model
    - LLM (Ollama)
    
    Returns detailed status including memory usage, response times, and recommendations.
    
    Parameters:
    - force: Force a fresh check instead of using cached results (default: False)
    """
    try:
        health_checker = get_health_checker()
        health_status = await health_checker.check_all_models(force=force)
        
        logger.info(f"Model health check requested by {admin_user.get('email')} - Status: {health_status['overall_status']}")
        
        return health_status
        
    except Exception as e:
        logger.error(f"Error checking model health: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking model health: {str(e)}")


@router.get("/models/{model_id}")
async def get_specific_model_health(
    model_id: str,
    force: bool = False,
    admin_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get health status of a specific model.
    
    Available model IDs:
    - embedding_primary: Main embedding model (BAAI/bge-m3)
    - embedding_fallback: Fallback embedding model (paraphrase-MiniLM-L3-v2)
    - reranker: Cross-encoder reranking model
    - llm: Ollama language model
    
    Parameters:
    - model_id: The ID of the model to check
    - force: Force a fresh check instead of using cached results
    """
    try:
        health_checker = get_health_checker()
        model_health = await health_checker.check_specific_model(model_id, force=force)
        
        logger.info(f"Model health check for '{model_id}' requested by {admin_user.get('email')}")
        
        return model_health
        
    except Exception as e:
        logger.error(f"Error checking model {model_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking model: {str(e)}")


@router.post("/models/test")
async def test_model_with_data(
    request: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Test a specific model with custom data.
    
    Request body should contain:
    {
        "model_id": "embedding_primary|embedding_fallback|reranker|llm",
        "test_data": {
            # For embedding models:
            "texts": ["Text 1", "Text 2", ...]
            
            # For reranker:
            "pairs": [["Query 1", "Document 1"], ["Query 2", "Document 2"], ...]
            
            # For LLM:
            "prompt": "Your test prompt here"
        }
    }
    """
    try:
        model_id = request.get("model_id")
        test_data = request.get("test_data", {})
        
        if not model_id:
            raise HTTPException(status_code=400, detail="model_id is required")
        
        if not test_data:
            raise HTTPException(status_code=400, detail="test_data is required")
        
        health_checker = get_health_checker()
        test_result = await health_checker.test_model_with_data(model_id, test_data)
        
        logger.info(f"Model test for '{model_id}' requested by {admin_user.get('email')}")
        
        return test_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error testing model: {str(e)}")


@router.get("/system")
async def get_system_health(admin_user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """
    Get overall system health including all services and models.
    
    This is an enhanced version of the base system health check that includes:
    - Basic system metrics (CPU, memory, disk)
    - Service status (API, database, cache, background jobs)
    - AI model status summary
    - Combined issues and recommendations
    """
    try:
        # Get base system health
        from .routes import get_system_health as get_base_health
        base_health = await get_base_health(admin_user)
        
        # Get model health summary
        health_checker = get_health_checker()
        model_health = await health_checker.check_all_models(force=False)
        
        # Combine health information
        combined_health = {
            **base_health,
            "models_summary": {
                "overall_status": model_health["overall_status"],
                "healthy_models": sum(1 for m in model_health["models"].values() if m.get("status") == "healthy"),
                "warning_models": sum(1 for m in model_health["models"].values() if m.get("status") == "warning"),
                "error_models": sum(1 for m in model_health["models"].values() if m.get("status") == "error"),
                "models": {
                    model_id: {
                        "status": info.get("status"),
                        "loaded": info.get("loaded", False),
                        "response_time_ms": info.get("response_time_ms")
                    }
                    for model_id, info in model_health["models"].items()
                }
            },
            "ai_system": {
                "gpu_available": model_health["system"].get("gpu") is not None,
                "gpu_info": model_health["system"].get("gpu", {}),
                "model_recommendations": model_health.get("recommendations", [])
            }
        }
        
        # Update overall status based on models
        if model_health["overall_status"] == "critical" or base_health["status"] == "critical":
            combined_health["status"] = "critical"
        elif model_health["overall_status"] == "warning" or base_health["status"] == "warning":
            combined_health["status"] = "warning"
            
        # Combine issues
        combined_health["issues"].extend(model_health.get("issues", []))
        
        logger.info(f"System health check requested by {admin_user.get('email')} - Status: {combined_health['status']}")
        
        return combined_health
        
    except Exception as e:
        logger.error(f"Error checking system health: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking system health: {str(e)}")


@router.post("/models/download")
async def download_missing_models(
    background_tasks: BackgroundTasks,
    admin_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Attempt to download any missing AI models.
    
    This will:
    - Check which models are missing
    - Download transformer models automatically
    - Provide instructions for Ollama models that need manual pulling
    
    Note: Large models may take several minutes to download.
    """
    try:
        health_checker = get_health_checker()
        
        logger.info(f"Model download requested by {admin_user.get('email')}")
        
        # Start download (this could take a while)
        download_results = await health_checker.download_missing_models()
        
        return {
            "status": "completed",
            "message": "Model download check completed",
            "results": download_results,
            "next_steps": [
                "Check individual download results",
                "For Ollama models marked as 'needs_manual_pull', run the provided command",
                "Refresh model health status after downloads complete"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error downloading models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error downloading models: {str(e)}")


@router.post("/models/cleanup")
async def cleanup_model_cache(admin_user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """
    Clean up model cache and free memory.
    
    This will:
    - Remove loaded models from memory
    - Clear health check cache
    - Free GPU memory if available
    - Run garbage collection
    
    Warning: Models will need to be reloaded on next use, which may cause temporary slowdowns.
    """
    try:
        health_checker = get_health_checker()
        
        logger.info(f"Model cache cleanup requested by {admin_user.get('email')}")
        
        cleanup_results = health_checker.cleanup_model_cache()
        
        return {
            "status": "success",
            "message": "Model cache cleaned up successfully",
            "results": cleanup_results,
            "warning": "Models will be reloaded on next use, which may cause temporary performance impact"
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up model cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error cleaning up cache: {str(e)}")


@router.get("/models/info")
async def get_model_info(admin_user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """
    Get information about available models and their configurations.
    
    Returns details about all configured models including:
    - Model names and types
    - Expected dimensions/parameters
    - Memory requirements
    - Test configurations
    """
    try:
        health_checker = get_health_checker()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "models": health_checker.model_configs,
            "device": health_checker.device,
            "cache_ttl_seconds": 60,
            "check_interval_seconds": health_checker._check_interval
        }
        
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting model info: {str(e)}")


@router.get("/models/metrics")
async def get_model_metrics(
    hours: int = 24,
    admin_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get model performance metrics over time.
    
    Note: This endpoint returns mock data for now. 
    Real metrics tracking will be implemented in a future update.
    
    Parameters:
    - hours: Number of hours of history to retrieve (default: 24)
    """
    try:
        # TODO: Implement real metrics tracking
        # For now, return mock data structure
        
        import random
        from datetime import timedelta
        
        now = datetime.now()
        metrics = {
            "timestamp": now.isoformat(),
            "period_hours": hours,
            "models": {}
        }
        
        # Generate mock metrics for each model
        for model_id in ["embedding_primary", "embedding_fallback", "reranker", "llm"]:
            model_metrics = {
                "request_count": random.randint(100, 1000),
                "avg_response_time_ms": random.randint(50, 500),
                "error_count": random.randint(0, 10),
                "success_rate": random.uniform(0.95, 0.99),
                "history": []
            }
            
            # Generate hourly data points
            for i in range(min(hours, 24)):
                timestamp = now - timedelta(hours=i)
                model_metrics["history"].append({
                    "timestamp": timestamp.isoformat(),
                    "requests": random.randint(10, 100),
                    "avg_response_ms": random.randint(50, 500),
                    "errors": random.randint(0, 2)
                })
            
            metrics["models"][model_id] = model_metrics
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting model metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting metrics: {str(e)}")