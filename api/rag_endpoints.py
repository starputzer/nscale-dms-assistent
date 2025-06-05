"""RAG-specific API endpoints for monitoring and optimization"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import asyncio

from modules.rag.engine import RAGEngine
from modules.core.logging import LogManager

logger = LogManager.setup_logging()

router = APIRouter(prefix="/api/v1/rag", tags=["rag"])

# Global RAG engine instance
_rag_engine = None

async def get_rag_engine() -> RAGEngine:
    """Get or create RAG engine instance"""
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGEngine()
        await _rag_engine.initialize()
    return _rag_engine

@router.get("/health")
async def rag_health():
    """Get RAG system health status"""
    try:
        engine = await get_rag_engine()
        
        return {
            "status": "healthy" if engine.initialized else "initializing",
            "current_engine": "optimized",
            "optimized_engine": "active",
            "mode": "full",
            "can_use_optimized": True,
            "system": engine.monitor.get_system_resources() if hasattr(engine, 'monitor') else {}
        }
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        return {
            "status": "error",
            "error": str(e),
            "current_engine": "fallback",
            "optimized_engine": "unavailable",
            "mode": "fallback",
            "can_use_optimized": False
        }

@router.get("/performance")
async def rag_performance():
    """Get detailed performance metrics"""
    try:
        engine = await get_rag_engine()
        return await engine.get_performance_report()
    except Exception as e:
        logger.error(f"Error getting performance report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def rag_stats():
    """Get document and chunk statistics"""
    try:
        engine = await get_rag_engine()
        return engine.get_document_stats()
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize-memory")
async def optimize_memory():
    """Trigger memory optimization"""
    try:
        engine = await get_rag_engine()
        result = await engine.optimize_memory()
        return result
    except Exception as e:
        logger.error(f"Error optimizing memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cache/stats")
async def cache_stats():
    """Get cache statistics"""
    try:
        engine = await get_rag_engine()
        if hasattr(engine, 'cache') and engine.cache:
            return engine.cache.get_stats()
        else:
            return {"error": "Cache not initialized"}
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))