"""Health check endpoint for RAG optimization monitoring"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import asyncio
import psutil
import time
from datetime import datetime
import logging

from modules.core.config import Config
from modules.rag.compatibility_layer import get_compatibility_layer
from modules.rag.error_handler import error_handler

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/rag", tags=["rag-health"])


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Get RAG system health status"""
    try:
        compatibility_layer = get_compatibility_layer()
        health = await compatibility_layer.health_check()
        
        # Add system metrics
        health['system'] = {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_usage': psutil.disk_usage('/').percent
        }
        
        # Overall health status
        health['status'] = _determine_health_status(health)
        health['timestamp'] = datetime.now().isoformat()
        
        return health
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Health check failed")


@router.get("/metrics")
async def get_metrics() -> Dict[str, Any]:
    """Get detailed RAG performance metrics"""
    try:
        compatibility_layer = get_compatibility_layer()
        metrics = compatibility_layer.get_metrics()
        
        # Add additional metrics
        metrics['uptime'] = _get_uptime()
        metrics['timestamp'] = datetime.now().isoformat()
        
        return metrics
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics")


@router.get("/dependencies")
async def check_dependencies() -> Dict[str, Any]:
    """Check status of all RAG dependencies"""
    try:
        deps = error_handler.check_dependencies()
        
        # Add version information
        versions = {}
        
        try:
            import faiss
            versions['faiss'] = faiss.__version__ if hasattr(faiss, '__version__') else 'unknown'
        except:
            pass
            
        try:
            import spacy
            versions['spacy'] = spacy.__version__
        except:
            pass
            
        try:
            import sentence_transformers
            versions['sentence_transformers'] = sentence_transformers.__version__
        except:
            pass
            
        try:
            import redis
            versions['redis'] = redis.__version__
        except:
            pass
        
        return {
            'dependencies': deps,
            'versions': versions,
            'all_satisfied': all(deps.values()),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Dependency check failed: {e}")
        raise HTTPException(status_code=500, detail="Dependency check failed")


@router.get("/benchmark")
async def run_benchmark() -> Dict[str, Any]:
    """Run a quick performance benchmark"""
    try:
        compatibility_layer = get_compatibility_layer()
        
        # Test queries
        test_queries = [
            "Was ist nscale?",
            "Wie funktioniert die Dokumentenverwaltung?",
            "Welche Berechtigungen gibt es?"
        ]
        
        results = []
        
        for query in test_queries:
            start_time = time.time()
            
            # Test search
            search_results = await compatibility_layer.search(query, k=3)
            search_time = time.time() - start_time
            
            # Test streaming (first few chunks)
            stream_start = time.time()
            chunks = []
            async for chunk in compatibility_layer.stream_answer_chunks(query):
                chunks.append(chunk)
                if len(chunks) >= 5:  # Just test first 5 chunks
                    break
            stream_time = time.time() - stream_start
            
            results.append({
                'query': query,
                'search_time': round(search_time, 3),
                'search_results': len(search_results),
                'stream_time': round(stream_time, 3),
                'chunks_generated': len(chunks)
            })
        
        # Calculate averages
        avg_search_time = sum(r['search_time'] for r in results) / len(results)
        avg_stream_time = sum(r['stream_time'] for r in results) / len(results)
        
        return {
            'results': results,
            'summary': {
                'avg_search_time': round(avg_search_time, 3),
                'avg_stream_time': round(avg_stream_time, 3),
                'total_queries': len(test_queries)
            },
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Benchmark failed: {e}")
        raise HTTPException(status_code=500, detail="Benchmark failed")


@router.post("/cache/clear")
async def clear_cache() -> Dict[str, str]:
    """Clear RAG cache (admin only)"""
    try:
        compatibility_layer = get_compatibility_layer()
        
        # Clear cache if optimized engine is available
        if hasattr(compatibility_layer.optimized_engine, 'cache_manager'):
            compatibility_layer.optimized_engine.cache_manager.invalidate()
            return {"status": "success", "message": "Cache cleared"}
        else:
            return {"status": "info", "message": "No cache to clear (optimized engine not active)"}
            
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")


@router.get("/config")
async def get_configuration() -> Dict[str, Any]:
    """Get current RAG configuration"""
    return {
        'mode': Config.RAG_OPTIMIZATION_MODE,
        'optimized_enabled': Config.USE_OPTIMIZED_RAG,
        'canary_percentage': Config.CANARY_PERCENTAGE if Config.RAG_OPTIMIZATION_MODE == 'canary' else None,
        'redis': {
            'host': Config.REDIS_HOST,
            'port': Config.REDIS_PORT,
            'db': Config.REDIS_DB
        },
        'paths': {
            'txt_dir': str(Config.TXT_DIR),
            'raw_docs_dir': str(Config.RAG_RAW_DOCS_DIR),
            'index_dir': str(Config.RAG_INDEX_DIR)
        },
        'timestamp': datetime.now().isoformat()
    }


def _determine_health_status(health: Dict[str, Any]) -> str:
    """Determine overall health status from health data"""
    # Check critical components
    if health.get('current_engine') != 'healthy':
        return 'unhealthy'
    
    # Check system resources
    system = health.get('system', {})
    if system.get('memory_percent', 0) > 90:
        return 'degraded'
    if system.get('cpu_percent', 0) > 90:
        return 'degraded'
    
    # Check error rates
    metrics = health.get('metrics', {})
    if metrics.get('error_rate', 0) > 5:  # More than 5% errors
        return 'degraded'
    
    # If optimized is enabled but not working
    if health.get('can_use_optimized') and health.get('optimized_engine') != 'healthy':
        return 'degraded'
    
    return 'healthy'


def _get_uptime() -> float:
    """Get application uptime in seconds"""
    # This would need to be tracked from application start
    # For now, return process uptime
    try:
        import os
        import psutil
        process = psutil.Process(os.getpid())
        return time.time() - process.create_time()
    except:
        return 0.0


# Add router to main app
def setup_health_routes(app):
    """Add health check routes to FastAPI app"""
    app.include_router(router)