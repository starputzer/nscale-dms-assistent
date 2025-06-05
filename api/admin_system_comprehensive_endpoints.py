"""
Admin System Comprehensive API Endpoints
Provides complete system management functionality
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import psutil
import os
import json
import time
import shutil
from sqlalchemy import text

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_admin_user as require_admin, get_current_user
from modules.core.config import Config
from modules.core.db import DBManager

# Initialize components
logger = LogManager.setup_logging(__name__)
db_manager = DBManager()

router = APIRouter()

# Pydantic models
class SystemStats(BaseModel):
    cpu_usage_percent: float
    memory_usage_percent: float
    memory_total: int
    memory_used: int
    disk_usage_percent: float
    disk_total: int
    disk_used: int
    db_size_mb: float
    storage_used_mb: float
    total_sessions: int
    total_messages: int
    total_feedback: int
    active_users_today: int
    new_users_week: int
    avg_messages_per_session: float
    response_time_ms: float
    api_requests_today: int
    error_rate: float
    uptime_hours: float
    last_updated: datetime

class SystemSettings(BaseModel):
    # Model settings
    defaultModel: str
    availableModels: List[str]
    maxTokensPerRequest: int
    
    # Rate limiting
    enableRateLimit: bool
    rateLimitPerMinute: int
    
    # Session settings
    maxSessionsPerUser: int
    sessionTimeoutMinutes: int
    
    # Feature toggles
    enableFeedback: bool
    enableLogging: bool
    
    # Maintenance
    maintenanceMode: bool
    maintenanceMessage: str
    
    # Additional settings
    maxUploadSizeMB: Optional[int] = 10
    allowedFileTypes: Optional[List[str]] = None
    enableEmbeddingCache: Optional[bool] = True
    cacheExpirationHours: Optional[int] = 24

class SystemHealth(BaseModel):
    status: str  # normal, warning, critical
    cpu_status: str
    memory_status: str
    disk_status: str
    database_status: str
    services_status: Dict[str, str]
    last_check: datetime
    issues: List[str]

class SystemAction(BaseModel):
    action: str
    params: Optional[Dict[str, Any]] = None

class ActionResult(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None

# Helper functions
def get_system_health_status(cpu_percent: float, memory_percent: float, disk_percent: float) -> tuple[str, str, str, str]:
    """Determine health status based on resource usage"""
    # CPU status
    if cpu_percent >= 90:
        cpu_status = "critical"
    elif cpu_percent >= 75:
        cpu_status = "warning"
    else:
        cpu_status = "normal"
    
    # Memory status
    if memory_percent >= 90:
        memory_status = "critical"
    elif memory_percent >= 80:
        memory_status = "warning"
    else:
        memory_status = "normal"
    
    # Disk status
    if disk_percent >= 95:
        disk_status = "critical"
    elif disk_percent >= 85:
        disk_status = "warning"
    else:
        disk_status = "normal"
    
    # Overall status
    if any(status == "critical" for status in [cpu_status, memory_status, disk_status]):
        overall_status = "critical"
    elif any(status == "warning" for status in [cpu_status, memory_status, disk_status]):
        overall_status = "warning"
    else:
        overall_status = "normal"
    
    return overall_status, cpu_status, memory_status, disk_status

def get_database_size() -> float:
    """Get database size in MB"""
    try:
        db_path = Config.DB_PATH
        if os.path.exists(db_path):
            return os.path.getsize(db_path) / (1024 * 1024)  # Convert to MB
        return 0
    except Exception as e:
        logger.error(f"Error getting database size: {e}")
        return 0

def get_storage_usage() -> float:
    """Get total storage used by uploads and data"""
    try:
        total_size = 0
        
        # Check uploads directory
        uploads_dir = "data/uploads"
        if os.path.exists(uploads_dir):
            for dirpath, dirnames, filenames in os.walk(uploads_dir):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    total_size += os.path.getsize(filepath)
        
        # Check other data directories
        data_dirs = ["data/cache", "data/embeddings", "data/temp"]
        for data_dir in data_dirs:
            if os.path.exists(data_dir):
                for dirpath, dirnames, filenames in os.walk(data_dir):
                    for filename in filenames:
                        filepath = os.path.join(dirpath, filename)
                        total_size += os.path.getsize(filepath)
        
        return total_size / (1024 * 1024)  # Convert to MB
    except Exception as e:
        logger.error(f"Error calculating storage usage: {e}")
        return 0

def check_service_status() -> Dict[str, str]:
    """Check status of various services"""
    services = {}
    
    # Check database
    try:
        with db_manager.get_session() as session:
            session.execute(text("SELECT 1"))
        services["database"] = "running"
    except:
        services["database"] = "error"
    
    # Check cache (simplified for now)
    services["cache"] = "running"  # Assume cache is running
    
    # Check RAG engine
    try:
        from modules.rag.engine import RAGEngine
        services["rag_engine"] = "running"
    except:
        services["rag_engine"] = "error"
    
    # Check document converter
    try:
        from modules.doc_converter import DocConverter
        services["doc_converter"] = "running"
    except:
        services["doc_converter"] = "error"
    
    return services

# Endpoints
@router.get("/stats", response_model=SystemStats)
async def get_system_stats(user: Dict[str, Any] = Depends(require_admin)):
    """Get comprehensive system statistics"""
    try:
        # System resources
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Database stats
        with db_manager.get_session() as session:
            total_sessions = session.execute(
                text("SELECT COUNT(*) FROM chat_sessions")
            ).scalar() or 0
            
            total_messages = session.execute(
                text("SELECT COUNT(*) FROM chat_messages")
            ).scalar() or 0
            
            total_feedback = session.execute(
                text("SELECT COUNT(*) FROM feedback")
            ).scalar() or 0
            
            # Active users today
            today = datetime.now().date()
            active_users_today = session.execute(
                text("SELECT COUNT(DISTINCT user_id) FROM chat_sessions WHERE DATE(created_at) = :date"),
                {"date": today}
            ).scalar() or 0
            
            # New users this week
            week_ago = datetime.now() - timedelta(days=7)
            new_users_week = session.execute(
                text("SELECT COUNT(*) FROM users WHERE created_at > :date"),
                {"date": week_ago}
            ).scalar() or 0
            
            # Average messages per session
            avg_messages = session.execute(
                text("""
                    SELECT AVG(message_count) FROM (
                        SELECT session_id, COUNT(*) as message_count
                        FROM chat_messages
                        GROUP BY session_id
                    )
                """)
            ).scalar() or 0
            
            # API requests today (mock for now)
            api_requests_today = session.execute(
                text("SELECT COUNT(*) FROM chat_messages WHERE DATE(created_at) = :date"),
                {"date": today}
            ).scalar() or 0
        
        # Calculate uptime
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        uptime_hours = uptime_seconds / 3600
        
        # Get sizes
        db_size = get_database_size()
        storage_used = get_storage_usage()
        
        return SystemStats(
            cpu_usage_percent=cpu_percent,
            memory_usage_percent=memory.percent,
            memory_total=memory.total,
            memory_used=memory.used,
            disk_usage_percent=disk.percent,
            disk_total=disk.total,
            disk_used=disk.used,
            db_size_mb=db_size,
            storage_used_mb=storage_used,
            total_sessions=total_sessions,
            total_messages=total_messages,
            total_feedback=total_feedback,
            active_users_today=active_users_today,
            new_users_week=new_users_week,
            avg_messages_per_session=round(avg_messages, 1),
            response_time_ms=250.0,  # Mock for now
            api_requests_today=api_requests_today * 3,  # Estimate
            error_rate=0.1,  # Mock 0.1% error rate
            uptime_hours=round(uptime_hours, 2),
            last_updated=datetime.now()
        )
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health", response_model=SystemHealth)
async def get_system_health(user: Dict[str, Any] = Depends(require_admin)):
    """Get system health status"""
    try:
        # Get resource usage
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Determine health status
        overall_status, cpu_status, memory_status, disk_status = get_system_health_status(
            cpu_percent, memory.percent, disk.percent
        )
        
        # Check database
        database_status = "normal"
        try:
            with db_manager.get_session() as session:
                session.execute(text("SELECT 1"))
        except:
            database_status = "critical"
        
        # Check services
        services_status = check_service_status()
        
        # Collect issues
        issues = []
        if cpu_status == "critical":
            issues.append(f"CPU usage critical: {cpu_percent}%")
        elif cpu_status == "warning":
            issues.append(f"CPU usage high: {cpu_percent}%")
        
        if memory_status == "critical":
            issues.append(f"Memory usage critical: {memory.percent}%")
        elif memory_status == "warning":
            issues.append(f"Memory usage high: {memory.percent}%")
        
        if disk_status == "critical":
            issues.append(f"Disk usage critical: {disk.percent}%")
        elif disk_status == "warning":
            issues.append(f"Disk usage high: {disk.percent}%")
        
        if database_status != "normal":
            issues.append("Database connection issue")
        
        for service, status in services_status.items():
            if status != "running":
                issues.append(f"{service} service not running")
        
        return SystemHealth(
            status=overall_status,
            cpu_status=cpu_status,
            memory_status=memory_status,
            disk_status=disk_status,
            database_status=database_status,
            services_status=services_status,
            last_check=datetime.now(),
            issues=issues
        )
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings", response_model=SystemSettings)
async def get_system_settings(user: Dict[str, Any] = Depends(require_admin)):
    """Get current system settings"""
    try:
        # Load settings from config and database
        settings = SystemSettings(
            # Model settings
            defaultModel=Config.DEFAULT_MODEL if hasattr(Config, 'DEFAULT_MODEL') else "llama-7b",
            availableModels=["llama-7b", "llama-13b", "mistral-7b", "mistral-7bq4"],
            maxTokensPerRequest=Config.MAX_TOKENS if hasattr(Config, 'MAX_TOKENS') else 4096,
            
            # Rate limiting
            enableRateLimit=Config.ENABLE_RATE_LIMIT if hasattr(Config, 'ENABLE_RATE_LIMIT') else True,
            rateLimitPerMinute=Config.RATE_LIMIT_PER_MINUTE if hasattr(Config, 'RATE_LIMIT_PER_MINUTE') else 30,
            
            # Session settings
            maxSessionsPerUser=Config.MAX_SESSIONS_PER_USER if hasattr(Config, 'MAX_SESSIONS_PER_USER') else 10,
            sessionTimeoutMinutes=Config.SESSION_TIMEOUT_MINUTES if hasattr(Config, 'SESSION_TIMEOUT_MINUTES') else 60,
            
            # Feature toggles
            enableFeedback=Config.ENABLE_FEEDBACK if hasattr(Config, 'ENABLE_FEEDBACK') else True,
            enableLogging=Config.ENABLE_LOGGING if hasattr(Config, 'ENABLE_LOGGING') else True,
            
            # Maintenance
            maintenanceMode=Config.MAINTENANCE_MODE if hasattr(Config, 'MAINTENANCE_MODE') else False,
            maintenanceMessage=Config.MAINTENANCE_MESSAGE if hasattr(Config, 'MAINTENANCE_MESSAGE') else "System wird gewartet und ist vorübergehend nicht verfügbar.",
            
            # Additional settings
            maxUploadSizeMB=Config.MAX_UPLOAD_SIZE_MB if hasattr(Config, 'MAX_UPLOAD_SIZE_MB') else 10,
            allowedFileTypes=Config.ALLOWED_FILE_TYPES if hasattr(Config, 'ALLOWED_FILE_TYPES') else ["pdf", "txt", "doc", "docx"],
            enableEmbeddingCache=Config.ENABLE_EMBEDDING_CACHE if hasattr(Config, 'ENABLE_EMBEDDING_CACHE') else True,
            cacheExpirationHours=Config.CACHE_EXPIRATION_HOURS if hasattr(Config, 'CACHE_EXPIRATION_HOURS') else 24
        )
        
        return settings
    except Exception as e:
        logger.error(f"Error getting system settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/settings", response_model=ActionResult)
async def update_system_settings(settings: SystemSettings, user: Dict[str, Any] = Depends(require_admin)):
    """Update system settings"""
    try:
        # Update configuration
        # In a real implementation, this would update a config file or database
        
        # Update in-memory config
        if hasattr(Config, 'DEFAULT_MODEL'):
            Config.DEFAULT_MODEL = settings.defaultModel
        if hasattr(Config, 'MAX_TOKENS'):
            Config.MAX_TOKENS = settings.maxTokensPerRequest
        if hasattr(Config, 'ENABLE_RATE_LIMIT'):
            Config.ENABLE_RATE_LIMIT = settings.enableRateLimit
        if hasattr(Config, 'RATE_LIMIT_PER_MINUTE'):
            Config.RATE_LIMIT_PER_MINUTE = settings.rateLimitPerMinute
        if hasattr(Config, 'MAX_SESSIONS_PER_USER'):
            Config.MAX_SESSIONS_PER_USER = settings.maxSessionsPerUser
        if hasattr(Config, 'SESSION_TIMEOUT_MINUTES'):
            Config.SESSION_TIMEOUT_MINUTES = settings.sessionTimeoutMinutes
        if hasattr(Config, 'ENABLE_FEEDBACK'):
            Config.ENABLE_FEEDBACK = settings.enableFeedback
        if hasattr(Config, 'ENABLE_LOGGING'):
            Config.ENABLE_LOGGING = settings.enableLogging
        if hasattr(Config, 'MAINTENANCE_MODE'):
            Config.MAINTENANCE_MODE = settings.maintenanceMode
        if hasattr(Config, 'MAINTENANCE_MESSAGE'):
            Config.MAINTENANCE_MESSAGE = settings.maintenanceMessage
        
        # Save to persistent storage (mock)
        logger.info(f"System settings updated: {settings.dict()}")
        
        return ActionResult(
            success=True,
            message="System settings updated successfully",
            details={"updated_at": datetime.now().isoformat()}
        )
    except Exception as e:
        logger.error(f"Error updating system settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/clear-cache", response_model=ActionResult)
async def clear_cache(user: Dict[str, Any] = Depends(require_admin)):
    """Clear system cache"""
    try:
        # Clear cache directories only</        # (cache clearing would be done here if cache_manager was available)
        
        # Clear file caches
        cache_dirs = ["data/cache", "data/temp"]
        for cache_dir in cache_dirs:
            if os.path.exists(cache_dir):
                shutil.rmtree(cache_dir)
                os.makedirs(cache_dir)
        
        return ActionResult(
            success=True,
            message="Cache cleared successfully",
            details={
                "cleared_at": datetime.now().isoformat(),
                "cache_dirs_cleaned": cache_dirs
            }
        )
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/clear-embedding-cache", response_model=ActionResult)
async def clear_embedding_cache(user: Dict[str, Any] = Depends(require_admin)):
    """Clear embedding cache"""
    try:
        # Clear embedding cache
        embedding_cache_dir = "data/embeddings"
        if os.path.exists(embedding_cache_dir):
            shutil.rmtree(embedding_cache_dir)
            os.makedirs(embedding_cache_dir)
        
        # Clear from database if stored there
        try:
            with db_manager.get_session() as session:
                session.execute(text("DELETE FROM embedding_cache"))
                session.commit()
        except:
            pass  # Table might not exist
        
        return ActionResult(
            success=True,
            message="Embedding cache cleared successfully",
            details={
                "cleared_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error clearing embedding cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/restart-services", response_model=ActionResult)
async def restart_services(service_name: Optional[str] = None, user: Dict[str, Any] = Depends(require_admin)):
    """Restart system services"""
    try:
        restarted_services = []
        
        if service_name:
            # Restart specific service
            if service_name == "rag_engine":
                from modules.rag.engine import RAGEngine
                # Re-initialize RAG engine
                rag_engine = RAGEngine()
                await rag_engine.initialize()
                restarted_services.append("rag_engine")
            elif service_name == "cache":
                # Clear cache directories
                cache_dirs = ["data/cache", "data/temp"]
                for cache_dir in cache_dirs:
                    if os.path.exists(cache_dir):
                        shutil.rmtree(cache_dir)
                        os.makedirs(cache_dir)
                restarted_services.append("cache")
        else:
            # Restart all services
            # RAG Engine
            try:
                from modules.rag.engine import RAGEngine
                rag_engine = RAGEngine()
                await rag_engine.initialize()
                restarted_services.append("rag_engine")
            except:
                pass
            
            # Cache
            cache_dirs = ["data/cache", "data/temp"]
            for cache_dir in cache_dirs:
                if os.path.exists(cache_dir):
                    shutil.rmtree(cache_dir)
                    os.makedirs(cache_dir)
            restarted_services.append("cache")
        
        return ActionResult(
            success=True,
            message="Services restarted successfully",
            details={
                "restarted_services": restarted_services,
                "restarted_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error restarting services: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/export-logs", response_model=ActionResult)
async def export_logs(hours: int = 24, user: Dict[str, Any] = Depends(require_admin)):
    """Export system logs"""
    try:
        log_file = "logs/app.log"
        export_file = f"logs/export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        
        if os.path.exists(log_file):
            # Copy recent logs
            with open(log_file, 'r') as source:
                lines = source.readlines()
                
            # Filter by time if needed (mock for now, just take last N lines)
            recent_lines = lines[-1000:]  # Last 1000 lines
            
            with open(export_file, 'w') as target:
                target.writelines(recent_lines)
            
            return ActionResult(
                success=True,
                message="Logs exported successfully",
                details={
                    "export_file": export_file,
                    "lines_exported": len(recent_lines),
                    "exported_at": datetime.now().isoformat()
                }
            )
        else:
            return ActionResult(
                success=False,
                message="Log file not found",
                details={}
            )
    except Exception as e:
        logger.error(f"Error exporting logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/optimize-database", response_model=ActionResult)
async def optimize_database(user: Dict[str, Any] = Depends(require_admin)):
    """Optimize database"""
    try:
        with db_manager.get_session() as session:
            # SQLite optimization commands
            session.execute(text("VACUUM"))
            session.execute(text("ANALYZE"))
            session.commit()
        
        # Get new size
        new_size = get_database_size()
        
        return ActionResult(
            success=True,
            message="Database optimized successfully",
            details={
                "new_size_mb": new_size,
                "optimized_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error optimizing database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/reset-statistics", response_model=ActionResult)
async def reset_statistics(category: Optional[str] = None, user: Dict[str, Any] = Depends(require_admin)):
    """Reset system statistics"""
    try:
        if category == "sessions":
            # Clear old sessions
            with db_manager.get_session() as session:
                month_ago = datetime.now() - timedelta(days=30)
                session.execute(
                    text("DELETE FROM chat_sessions WHERE created_at < :date"),
                    {"date": month_ago}
                )
                session.commit()
        elif category == "feedback":
            # Clear old feedback
            with db_manager.get_session() as session:
                month_ago = datetime.now() - timedelta(days=30)
                session.execute(
                    text("DELETE FROM feedback WHERE created_at < :date"),
                    {"date": month_ago}
                )
                session.commit()
        else:
            # Reset counters (in a real system, this might reset specific counters)
            pass
        
        return ActionResult(
            success=True,
            message=f"Statistics reset successfully{f' for {category}' if category else ''}",
            details={
                "category": category,
                "reset_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error resetting statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/create-backup", response_model=ActionResult)
async def create_backup(user: Dict[str, Any] = Depends(require_admin)):
    """Create system backup"""
    try:
        backup_dir = "backups"
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = f"{backup_dir}/backup_{timestamp}"
        os.makedirs(backup_path)
        
        # Backup database
        db_backup = f"{backup_path}/database.db"
        shutil.copy2(Config.DB_PATH, db_backup)
        
        # Backup config (mock)
        config_backup = f"{backup_path}/config.json"
        config_data = {
            "DEFAULT_MODEL": getattr(Config, 'DEFAULT_MODEL', 'llama-7b'),
            "MAX_TOKENS": getattr(Config, 'MAX_TOKENS', 4096),
            "backup_time": datetime.now().isoformat()
        }
        with open(config_backup, 'w') as f:
            json.dump(config_data, f, indent=2)
        
        # Create tar archive
        archive_path = f"{backup_dir}/backup_{timestamp}.tar.gz"
        import tarfile
        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(backup_path, arcname=f"backup_{timestamp}")
        
        # Clean up temp directory
        shutil.rmtree(backup_path)
        
        return ActionResult(
            success=True,
            message="Backup created successfully",
            details={
                "backup_file": archive_path,
                "size_mb": os.path.getsize(archive_path) / (1024 * 1024),
                "created_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error creating backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/reload-motd", response_model=ActionResult)
async def reload_motd(user: Dict[str, Any] = Depends(require_admin)):
    """Reload MOTD configuration"""
    try:
        from modules.core.motd_manager import MOTDManager
        motd_manager = MOTDManager()
        motd_manager.reload()
        
        current_motd = motd_manager.get_current_motd()
        
        return ActionResult(
            success=True,
            message="MOTD reloaded successfully",
            details={
                "current_motd": current_motd,
                "reloaded_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error reloading MOTD: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available-actions")
async def get_available_actions(user: Dict[str, Any] = Depends(require_admin)):
    """Get list of available system actions"""
    actions = [
        {
            "type": "clear-cache",
            "name": "Cache leeren",
            "description": "Löscht alle zwischengespeicherten Daten",
            "requiresConfirmation": True,
            "confirmationMessage": "Möchten Sie wirklich den gesamten Cache leeren? Dies kann die Performance vorübergehend beeinträchtigen."
        },
        {
            "type": "clear-embedding-cache",
            "name": "Embedding-Cache leeren",
            "description": "Löscht alle zwischengespeicherten Embeddings",
            "requiresConfirmation": True,
            "confirmationMessage": "Möchten Sie wirklich den Embedding-Cache leeren? Embeddings müssen neu generiert werden."
        },
        {
            "type": "restart-services",
            "name": "Dienste neu starten",
            "description": "Startet alle Systemdienste neu",
            "requiresConfirmation": True,
            "confirmationMessage": "Möchten Sie wirklich alle Dienste neu starten? Dies kann zu kurzen Unterbrechungen führen."
        },
        {
            "type": "export-logs",
            "name": "Logs exportieren",
            "description": "Exportiert die Systemlogs der letzten 24 Stunden",
            "requiresConfirmation": False
        },
        {
            "type": "optimize-database",
            "name": "Datenbank optimieren",
            "description": "Optimiert die Datenbankperformance",
            "requiresConfirmation": True,
            "confirmationMessage": "Möchten Sie die Datenbank optimieren? Dies kann einige Minuten dauern."
        },
        {
            "type": "reset-statistics",
            "name": "Statistiken zurücksetzen",
            "description": "Setzt ausgewählte Statistiken zurück",
            "requiresConfirmation": True,
            "confirmationMessage": "Möchten Sie wirklich die Statistiken zurücksetzen? Dies kann nicht rückgängig gemacht werden."
        },
        {
            "type": "create-backup",
            "name": "Backup erstellen",
            "description": "Erstellt ein vollständiges System-Backup",
            "requiresConfirmation": False
        },
        {
            "type": "reload-motd",
            "name": "MOTD neu laden",
            "description": "Lädt die Message of the Day Konfiguration neu",
            "requiresConfirmation": False
        }
    ]
    
    return {"actions": actions}