"""
Performance Monitoring API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import asyncio

from modules.core.auth_dependency import get_current_user
from modules.rag.performance_monitor import get_performance_monitor
from modules.rag.self_optimization import SelfOptimizer
from modules.core.logging import LogManager

logger = LogManager.setup_logging(__name__)

router = APIRouter()

# Global self-optimizer instance
_self_optimizer: Optional[SelfOptimizer] = None


def get_self_optimizer() -> SelfOptimizer:
    """Get or create self-optimizer instance"""
    global _self_optimizer
    if _self_optimizer is None:
        # This would be properly initialized with RAG engine
        from modules.rag.optimized_rag_engine import OptimizedRAGEngine
        rag_engine = OptimizedRAGEngine()
        _self_optimizer = SelfOptimizer(rag_engine)
        _self_optimizer.start()
    return _self_optimizer


@router.get("/performance/metrics/current")
async def get_current_metrics(
    current_user: dict = Depends(get_current_user)
):
    """Get current performance metrics"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
            
        monitor = get_performance_monitor()
        metrics = monitor.get_current_metrics()
        
        return {
            "success": True,
            "data": metrics
        }
        
    except Exception as e:
        logger.error(f"Error getting current metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/metrics/history")
async def get_metrics_history(
    minutes: int = Query(60, description="Time window in minutes"),
    current_user: dict = Depends(get_current_user)
):
    """Get performance metrics history"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
            
        monitor = get_performance_monitor()
        history = monitor.get_metrics_history(minutes=minutes)
        
        return {
            "success": True,
            "data": {
                "time_window_minutes": minutes,
                "metrics": history
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting metrics history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/report")
async def get_performance_report(
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive performance report"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
            
        monitor = get_performance_monitor()
        report = monitor.get_performance_report()
        
        return {
            "success": True,
            "data": report
        }
        
    except Exception as e:
        logger.error(f"Error generating performance report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/optimization/status")
async def get_optimization_status(
    current_user: dict = Depends(get_current_user)
):
    """Get self-optimization status"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
            
        optimizer = get_self_optimizer()
        report = optimizer.get_optimization_report()
        
        return {
            "success": True,
            "data": report
        }
        
    except Exception as e:
        logger.error(f"Error getting optimization status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/performance/optimization/mode")
async def set_optimization_mode(
    mode: str,
    current_user: dict = Depends(get_current_user)
):
    """Set optimization mode"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
            
        if mode not in ['performance', 'efficiency', 'balanced']:
            raise HTTPException(status_code=400, detail="Invalid mode")
            
        optimizer = get_self_optimizer()
        optimizer.set_mode(mode)
        
        return {
            "success": True,
            "message": f"Optimization mode set to: {mode}"
        }
        
    except Exception as e:
        logger.error(f"Error setting optimization mode: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/performance/alerts/thresholds")
async def update_alert_thresholds(
    thresholds: Dict[str, float],
    current_user: dict = Depends(get_current_user)
):
    """Update performance alert thresholds"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
            
        monitor = get_performance_monitor()
        
        # Update thresholds
        for key, value in thresholds.items():
            if key in monitor.thresholds:
                monitor.thresholds[key] = value
                
        return {
            "success": True,
            "message": "Alert thresholds updated",
            "thresholds": monitor.thresholds
        }
        
    except Exception as e:
        logger.error(f"Error updating alert thresholds: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/stream")
async def stream_performance_metrics(
    current_user: dict = Depends(get_current_user)
):
    """Stream real-time performance metrics via SSE"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
        
    async def event_generator():
        monitor = get_performance_monitor()
        
        while True:
            try:
                # Get current metrics
                metrics = monitor.get_current_metrics()
                
                # Format as SSE
                data = json.dumps({
                    "type": "metrics",
                    "timestamp": datetime.now().isoformat(),
                    "data": metrics
                })
                
                yield f"data: {data}\n\n"
                
                # Wait before next update
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"Error in metrics stream: {str(e)}")
                error_data = json.dumps({
                    "type": "error",
                    "message": str(e)
                })
                yield f"data: {error_data}\n\n"
                break
                
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/performance/export")
async def export_performance_data(
    format: str = Query("json", description="Export format (json, csv)"),
    current_user: dict = Depends(get_current_user)
):
    """Export performance data"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
            
        monitor = get_performance_monitor()
        optimizer = get_self_optimizer()
        
        # Prepare export data
        export_data = {
            "export_time": datetime.now().isoformat(),
            "performance_report": monitor.get_performance_report(),
            "metrics_history": monitor.get_metrics_history(minutes=1440),  # 24 hours
            "optimization_report": optimizer.get_optimization_report()
        }
        
        if format == "json":
            return StreamingResponse(
                iter([json.dumps(export_data, indent=2)]),
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=performance_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                }
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
            
    except Exception as e:
        logger.error(f"Error exporting performance data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/health")
async def get_system_health(
    current_user: dict = Depends(get_current_user)
):
    """Get system health summary"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
            
        monitor = get_performance_monitor()
        metrics = monitor.get_current_metrics()
        report = monitor.get_performance_report()
        
        # Determine health status
        bottlenecks = report.get('bottlenecks', [])
        
        if not bottlenecks:
            health_status = 'healthy'
            health_score = 100
        else:
            high_severity = sum(1 for b in bottlenecks if b.get('severity') == 'high')
            if high_severity > 0:
                health_status = 'critical'
                health_score = 40 - (high_severity * 10)
            else:
                health_status = 'warning'
                health_score = 70 - (len(bottlenecks) * 10)
                
        health_score = max(0, health_score)
        
        return {
            "success": True,
            "data": {
                "status": health_status,
                "score": health_score,
                "summary": {
                    "cpu_usage": metrics.get('system', {}).get('cpu_percent', 0),
                    "memory_usage": metrics.get('system', {}).get('memory_percent', 0),
                    "avg_query_time": metrics.get('rag', {}).get('avg_query_time_ms', 0),
                    "error_rate": metrics.get('rag', {}).get('error_rate', 0),
                    "queries_per_second": metrics.get('rag', {}).get('queries_per_second', 0)
                },
                "bottlenecks": bottlenecks,
                "recommendations": report.get('recommendations', [])[:3]  # Top 3
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))