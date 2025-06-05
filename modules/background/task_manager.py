"""
Background Task Manager for async operations
"""

import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import logging

logger = logging.getLogger(__name__)

class BackgroundTaskManager:
    """Manages background tasks for the application"""
    
    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.task_queue = asyncio.Queue()
        
    async def create_task(self, task_type: str, task_data: Dict[str, Any]) -> str:
        """Create a new background task"""
        task_id = str(uuid.uuid4())
        
        task = {
            "id": task_id,
            "type": task_type,
            "data": task_data,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "progress": 0,
            "result": None,
            "error": None
        }
        
        self.tasks[task_id] = task
        await self.task_queue.put(task)
        
        logger.info(f"Created task {task_id} of type {task_type}")
        return task_id
    
    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task by ID"""
        return self.tasks.get(task_id)
    
    async def get_tasks(self, status: Optional[str] = None, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
        """Get all tasks with optional filtering"""
        tasks = list(self.tasks.values())
        
        # Filter by status if provided
        if status:
            tasks = [t for t in tasks if t["status"] == status]
        
        # Sort by created_at descending
        tasks.sort(key=lambda t: t["created_at"], reverse=True)
        
        # Paginate
        start = (page - 1) * limit
        end = start + limit
        
        return tasks[start:end]
    
    async def update_task_status(self, task_id: str, status: str, progress: int = None, result: Any = None, error: str = None):
        """Update task status"""
        if task_id in self.tasks:
            self.tasks[task_id]["status"] = status
            self.tasks[task_id]["updated_at"] = datetime.now().isoformat()
            
            if progress is not None:
                self.tasks[task_id]["progress"] = progress
            if result is not None:
                self.tasks[task_id]["result"] = result
            if error is not None:
                self.tasks[task_id]["error"] = error
            
            logger.info(f"Updated task {task_id} - status: {status}, progress: {progress}")
    
    async def cancel_task(self, task_id: str):
        """Cancel a task"""
        if task_id in self.tasks:
            await self.update_task_status(task_id, "cancelled")
            logger.info(f"Cancelled task {task_id}")
    
    async def process_tasks(self):
        """Background task processor (should be run in a separate coroutine)"""
        while True:
            try:
                task = await self.task_queue.get()
                task_id = task["id"]
                
                # Update status to running
                await self.update_task_status(task_id, "running")
                
                # Process based on task type
                if task["type"] == "rag_reindex":
                    # Simulate reindexing
                    for i in range(0, 101, 10):
                        await asyncio.sleep(1)
                        await self.update_task_status(task_id, "running", progress=i)
                    
                    await self.update_task_status(task_id, "completed", progress=100, result={"documents_processed": 150})
                
                elif task["type"] == "knowledge_training":
                    # Simulate training
                    for i in range(0, 101, 20):
                        await asyncio.sleep(2)
                        await self.update_task_status(task_id, "running", progress=i)
                    
                    await self.update_task_status(task_id, "completed", progress=100, result={"model_accuracy": 0.95})
                
                else:
                    # Unknown task type
                    await self.update_task_status(task_id, "failed", error=f"Unknown task type: {task['type']}")
                
            except Exception as e:
                logger.error(f"Error processing task: {e}")
                if 'task_id' in locals():
                    await self.update_task_status(task_id, "failed", error=str(e))