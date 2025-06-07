import logging
import asyncio
from typing import List, Dict, Any, Callable, Optional, Union
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class BulkOperationType(Enum):
    DELETE = "delete"
    UPDATE = "update"
    EXPORT = "export"
    IMPORT = "import"
    ARCHIVE = "archive"
    RESTORE = "restore"
    PROCESS = "process"
    VALIDATE = "validate"

class BulkOperationStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIALLY_FAILED = "partially_failed"
    CANCELLED = "cancelled"

@dataclass
class BulkOperationResult:
    """Result of a single item in bulk operation"""
    item_id: str
    success: bool
    error: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

@dataclass
class BulkOperation:
    """Bulk operation tracking"""
    id: str
    type: BulkOperationType
    entity_type: str  # e.g., 'users', 'documents', 'sessions'
    total_items: int
    processed_items: int = 0
    successful_items: int = 0
    failed_items: int = 0
    status: BulkOperationStatus = BulkOperationStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results: List[BulkOperationResult] = None
    error_summary: Optional[str] = None
    user_id: Optional[str] = None
    
    def __post_init__(self):
        if self.results is None:
            self.results = []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'type': self.type.value,
            'entity_type': self.entity_type,
            'total_items': self.total_items,
            'processed_items': self.processed_items,
            'successful_items': self.successful_items,
            'failed_items': self.failed_items,
            'status': self.status.value,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'progress_percentage': (self.processed_items / self.total_items * 100) if self.total_items > 0 else 0,
            'error_summary': self.error_summary,
            'user_id': self.user_id
        }

class BulkOperationManager:
    """Manages bulk operations across different entities"""
    
    def __init__(self):
        # Operation handlers for different entity types
        self.handlers: Dict[str, Dict[BulkOperationType, Callable]] = {}
        
        # Active operations
        self.operations: Dict[str, BulkOperation] = {}
        
        # Operation history
        self.history: List[BulkOperation] = []
        self.max_history = 100
        
        # Concurrent operation limit
        self.max_concurrent = 10
        
        # Register default handlers
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register default bulk operation handlers"""
        # User bulk operations
        self.register_handler('users', BulkOperationType.DELETE, self._bulk_delete_users)
        self.register_handler('users', BulkOperationType.UPDATE, self._bulk_update_users)
        self.register_handler('users', BulkOperationType.EXPORT, self._bulk_export_users)
        self.register_handler('users', BulkOperationType.IMPORT, self._bulk_import_users)
        
        # Document bulk operations
        self.register_handler('documents', BulkOperationType.DELETE, self._bulk_delete_documents)
        self.register_handler('documents', BulkOperationType.ARCHIVE, self._bulk_archive_documents)
        self.register_handler('documents', BulkOperationType.PROCESS, self._bulk_process_documents)
        self.register_handler('documents', BulkOperationType.EXPORT, self._bulk_export_documents)
        
        # Session bulk operations
        self.register_handler('sessions', BulkOperationType.DELETE, self._bulk_delete_sessions)
        self.register_handler('sessions', BulkOperationType.EXPORT, self._bulk_export_sessions)
        
        # Feedback bulk operations
        self.register_handler('feedback', BulkOperationType.UPDATE, self._bulk_update_feedback)
        self.register_handler('feedback', BulkOperationType.EXPORT, self._bulk_export_feedback)
        self.register_handler('feedback', BulkOperationType.ARCHIVE, self._bulk_archive_feedback)
    
    def register_handler(self, entity_type: str, operation_type: BulkOperationType, 
                        handler: Callable):
        """Register a bulk operation handler"""
        if entity_type not in self.handlers:
            self.handlers[entity_type] = {}
        
        self.handlers[entity_type][operation_type] = handler
        logger.info(f"Registered bulk handler: {entity_type}.{operation_type.value}")
    
    async def execute_bulk_operation(self, entity_type: str, operation_type: BulkOperationType,
                                   item_ids: List[str], options: Dict[str, Any] = None,
                                   user_id: Optional[str] = None) -> BulkOperation:
        """Execute a bulk operation"""
        import uuid
        
        # Validate handler exists
        if entity_type not in self.handlers or operation_type not in self.handlers[entity_type]:
            raise ValueError(f"No handler for {entity_type}.{operation_type.value}")
        
        # Create operation
        operation = BulkOperation(
            id=str(uuid.uuid4()),
            type=operation_type,
            entity_type=entity_type,
            total_items=len(item_ids),
            user_id=user_id
        )
        
        self.operations[operation.id] = operation
        
        # Execute operation
        try:
            operation.status = BulkOperationStatus.PROCESSING
            operation.started_at = datetime.now()
            
            # Get handler
            handler = self.handlers[entity_type][operation_type]
            
            # Process items in batches
            batch_size = options.get('batch_size', 10) if options else 10
            
            for i in range(0, len(item_ids), batch_size):
                batch = item_ids[i:i + batch_size]
                
                # Process batch concurrently
                tasks = []
                for item_id in batch:
                    task = self._process_single_item(
                        handler, item_id, options, operation
                    )
                    tasks.append(task)
                
                # Wait for batch to complete
                await asyncio.gather(*tasks)
                
                # Check if cancelled
                if operation.status == BulkOperationStatus.CANCELLED:
                    break
            
            # Update final status
            if operation.status != BulkOperationStatus.CANCELLED:
                if operation.failed_items == 0:
                    operation.status = BulkOperationStatus.COMPLETED
                elif operation.successful_items > 0:
                    operation.status = BulkOperationStatus.PARTIALLY_FAILED
                else:
                    operation.status = BulkOperationStatus.FAILED
            
        except Exception as e:
            logger.error(f"Bulk operation failed: {str(e)}")
            operation.status = BulkOperationStatus.FAILED
            operation.error_summary = str(e)
        
        finally:
            operation.completed_at = datetime.now()
            
            # Move to history
            self.history.append(operation)
            if len(self.history) > self.max_history:
                self.history = self.history[-self.max_history:]
            
            # Remove from active
            del self.operations[operation.id]
        
        return operation
    
    async def _process_single_item(self, handler: Callable, item_id: str,
                                  options: Dict[str, Any], operation: BulkOperation):
        """Process a single item in bulk operation"""
        try:
            result = await handler(item_id, options)
            
            operation.results.append(BulkOperationResult(
                item_id=item_id,
                success=True,
                data=result
            ))
            
            operation.successful_items += 1
            
        except Exception as e:
            logger.error(f"Failed to process item {item_id}: {str(e)}")
            
            operation.results.append(BulkOperationResult(
                item_id=item_id,
                success=False,
                error=str(e)
            ))
            
            operation.failed_items += 1
        
        finally:
            operation.processed_items += 1
    
    def cancel_operation(self, operation_id: str) -> bool:
        """Cancel an active bulk operation"""
        if operation_id in self.operations:
            operation = self.operations[operation_id]
            if operation.status == BulkOperationStatus.PROCESSING:
                operation.status = BulkOperationStatus.CANCELLED
                return True
        return False
    
    def get_operation(self, operation_id: str) -> Optional[BulkOperation]:
        """Get operation by ID"""
        # Check active operations
        if operation_id in self.operations:
            return self.operations[operation_id]
        
        # Check history
        for op in self.history:
            if op.id == operation_id:
                return op
        
        return None
    
    def get_active_operations(self, entity_type: Optional[str] = None,
                            user_id: Optional[str] = None) -> List[BulkOperation]:
        """Get active operations with optional filters"""
        operations = list(self.operations.values())
        
        if entity_type:
            operations = [op for op in operations if op.entity_type == entity_type]
        
        if user_id:
            operations = [op for op in operations if op.user_id == user_id]
        
        return operations
    
    # Default handlers implementation
    
    async def _bulk_delete_users(self, user_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a user"""
        from modules.auth.user_model import UserManager
        
        user_manager = UserManager()
        success = user_manager.delete_user(user_id)
        
        if not success:
            raise Exception("Failed to delete user")
        
        return {'deleted': True}
    
    async def _bulk_update_users(self, user_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Update user properties"""
        from modules.auth.user_model import UserManager
        
        user_manager = UserManager()
        updates = options.get('updates', {})
        
        user = user_manager.get_user_by_id(user_id)
        if not user:
            raise Exception("User not found")
        
        # Apply updates
        for key, value in updates.items():
            if key in ['name', 'role', 'is_active']:
                setattr(user, key, value)
        
        success = user_manager.update_user(user)
        if not success:
            raise Exception("Failed to update user")
        
        return {'updated': True, 'changes': updates}
    
    async def _bulk_export_users(self, user_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Export user data"""
        from modules.auth.user_model import UserManager
        
        user_manager = UserManager()
        user = user_manager.get_user_by_id(user_id)
        
        if not user:
            raise Exception("User not found")
        
        return {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'created_at': user.created_at,
            'is_active': user.is_active
        }
    
    async def _bulk_import_users(self, user_data: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Import user data (user_data is JSON string)"""
        from modules.auth.user_model import UserManager, User
        
        data = json.loads(user_data)
        user_manager = UserManager()
        
        # Create user
        user = User(
            email=data['email'],
            name=data['name'],
            role=data.get('role', 'user')
        )
        
        # Set password if provided
        if 'password' in data:
            user.set_password(data['password'])
        
        user_id = user_manager.create_user(user)
        if not user_id:
            raise Exception("Failed to create user")
        
        return {'imported': True, 'user_id': user_id}
    
    async def _bulk_delete_documents(self, doc_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a document"""
        from modules.rag.knowledge_manager import knowledge_manager
        
        success = await knowledge_manager.delete_document(doc_id)
        if not success:
            raise Exception("Failed to delete document")
        
        return {'deleted': True}
    
    async def _bulk_archive_documents(self, doc_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Archive a document"""
        from modules.rag.knowledge_manager import knowledge_manager
        
        success = await knowledge_manager.archive_document(doc_id)
        if not success:
            raise Exception("Failed to archive document")
        
        return {'archived': True}
    
    async def _bulk_process_documents(self, doc_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Process a document through workflow"""
        from modules.doc_converter.workflow_engine import workflow_engine
        
        workflow_id = options.get('workflow_id')
        if not workflow_id:
            raise Exception("No workflow_id provided")
        
        # Execute workflow
        execution = await workflow_engine.execute_workflow(
            workflow_id,
            {'document_id': doc_id, 'document_path': options.get('path')}
        )
        
        if execution.status.value != 'success':
            raise Exception(f"Workflow failed: {execution.errors}")
        
        return {'processed': True, 'execution_id': execution.id}
    
    async def _bulk_export_documents(self, doc_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Export document metadata"""
        from modules.rag.knowledge_manager import knowledge_manager
        
        document = await knowledge_manager.get_document(doc_id)
        if not document:
            raise Exception("Document not found")
        
        return document
    
    async def _bulk_delete_sessions(self, session_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a session"""
        from modules.sessions.session_manager import SessionManager
        
        session_manager = SessionManager()
        user_id = options.get('user_id')
        
        success = session_manager.delete_session(session_id, user_id)
        if not success:
            raise Exception("Failed to delete session")
        
        return {'deleted': True}
    
    async def _bulk_export_sessions(self, session_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Export session data"""
        from modules.sessions.session_manager import SessionManager
        from modules.chat.chat_history_manager import ChatHistoryManager
        
        session_manager = SessionManager()
        chat_manager = ChatHistoryManager()
        
        session = session_manager.get_session(session_id)
        if not session:
            raise Exception("Session not found")
        
        messages = chat_manager.get_messages(session_id)
        
        return {
            'session': session,
            'messages': messages,
            'message_count': len(messages)
        }
    
    async def _bulk_update_feedback(self, feedback_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Update feedback status"""
        from modules.feedback.feedback_manager import FeedbackManager
        
        feedback_manager = FeedbackManager()
        updates = options.get('updates', {})
        
        success = feedback_manager.update_feedback(feedback_id, updates)
        if not success:
            raise Exception("Failed to update feedback")
        
        return {'updated': True, 'changes': updates}
    
    async def _bulk_export_feedback(self, feedback_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Export feedback data"""
        from modules.feedback.feedback_manager import FeedbackManager
        
        feedback_manager = FeedbackManager()
        feedback = feedback_manager.get_feedback(feedback_id)
        
        if not feedback:
            raise Exception("Feedback not found")
        
        return feedback
    
    async def _bulk_archive_feedback(self, feedback_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Archive feedback"""
        from modules.feedback.feedback_manager import FeedbackManager
        
        feedback_manager = FeedbackManager()
        success = feedback_manager.archive_feedback(feedback_id)
        
        if not success:
            raise Exception("Failed to archive feedback")
        
        return {'archived': True}

# Global bulk operation manager
bulk_manager = BulkOperationManager()