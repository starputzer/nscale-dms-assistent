import logging
import asyncio
from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import json
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

class StepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"

class ConditionOperator(Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    REGEX_MATCH = "regex_match"
    EXISTS = "exists"
    NOT_EXISTS = "not_exists"

@dataclass
class WorkflowCondition:
    """Condition for workflow branching"""
    field: str  # Field to check in context
    operator: ConditionOperator
    value: Any
    
    def evaluate(self, context: Dict[str, Any]) -> bool:
        """Evaluate condition against context"""
        field_value = self._get_field_value(context, self.field)
        
        if self.operator == ConditionOperator.EXISTS:
            return field_value is not None
        elif self.operator == ConditionOperator.NOT_EXISTS:
            return field_value is None
        elif self.operator == ConditionOperator.EQUALS:
            return field_value == self.value
        elif self.operator == ConditionOperator.NOT_EQUALS:
            return field_value != self.value
        elif self.operator == ConditionOperator.CONTAINS:
            return self.value in str(field_value)
        elif self.operator == ConditionOperator.NOT_CONTAINS:
            return self.value not in str(field_value)
        elif self.operator == ConditionOperator.GREATER_THAN:
            return float(field_value) > float(self.value)
        elif self.operator == ConditionOperator.LESS_THAN:
            return float(field_value) < float(self.value)
        elif self.operator == ConditionOperator.REGEX_MATCH:
            import re
            return bool(re.match(self.value, str(field_value)))
        
        return False
    
    def _get_field_value(self, context: Dict, field: str) -> Any:
        """Get nested field value from context"""
        keys = field.split('.')
        value = context
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        return value

@dataclass
class WorkflowStep:
    """Single step in a workflow"""
    id: str
    name: str
    type: str  # e.g., 'ocr', 'extract', 'transform', 'validate'
    handler: str  # Handler function name
    config: Dict[str, Any] = field(default_factory=dict)
    conditions: List[WorkflowCondition] = field(default_factory=list)
    on_success: Optional[str] = None  # Next step ID
    on_failure: Optional[str] = None  # Error step ID
    retry_count: int = 0
    max_retries: int = 3
    timeout: int = 300  # seconds
    
    def should_execute(self, context: Dict[str, Any]) -> bool:
        """Check if step should execute based on conditions"""
        if not self.conditions:
            return True
        
        # All conditions must be true (AND logic)
        return all(cond.evaluate(context) for cond in self.conditions)

@dataclass
class WorkflowExecution:
    """Tracks workflow execution state"""
    id: str
    workflow_id: str
    status: StepStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    current_step: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    step_results: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    errors: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class Workflow:
    """Document processing workflow definition"""
    id: str
    name: str
    description: str
    steps: Dict[str, WorkflowStep]
    entry_point: str  # First step ID
    created_at: datetime
    updated_at: datetime
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

class WorkflowEngine:
    """Executes document processing workflows"""
    
    def __init__(self):
        # Registered step handlers
        self.handlers: Dict[str, Callable] = {}
        
        # Workflows storage
        self.workflows: Dict[str, Workflow] = {}
        
        # Active executions
        self.executions: Dict[str, WorkflowExecution] = {}
        
        # Register built-in handlers
        self._register_builtin_handlers()
    
    def _register_builtin_handlers(self):
        """Register built-in workflow step handlers"""
        # OCR handlers
        self.register_handler('ocr_extract', self._ocr_extract_handler)
        self.register_handler('ocr_preprocess', self._ocr_preprocess_handler)
        
        # Document analysis
        self.register_handler('extract_metadata', self._extract_metadata_handler)
        self.register_handler('extract_entities', self._extract_entities_handler)
        self.register_handler('classify_document', self._classify_document_handler)
        
        # Transformation
        self.register_handler('transform_format', self._transform_format_handler)
        self.register_handler('split_document', self._split_document_handler)
        self.register_handler('merge_documents', self._merge_documents_handler)
        
        # Validation
        self.register_handler('validate_schema', self._validate_schema_handler)
        self.register_handler('validate_content', self._validate_content_handler)
        
        # Integration
        self.register_handler('index_to_rag', self._index_to_rag_handler)
        self.register_handler('send_notification', self._send_notification_handler)
    
    def register_handler(self, name: str, handler: Callable):
        """Register a step handler"""
        self.handlers[name] = handler
        logger.info(f"Registered workflow handler: {name}")
    
    def create_workflow(self, name: str, description: str, 
                       steps: List[Dict[str, Any]], entry_point: str) -> Workflow:
        """Create a new workflow"""
        workflow_id = str(uuid.uuid4())
        
        # Convert step definitions to WorkflowStep objects
        workflow_steps = {}
        for step_def in steps:
            conditions = [
                WorkflowCondition(
                    field=cond['field'],
                    operator=ConditionOperator(cond['operator']),
                    value=cond['value']
                )
                for cond in step_def.get('conditions', [])
            ]
            
            step = WorkflowStep(
                id=step_def['id'],
                name=step_def['name'],
                type=step_def['type'],
                handler=step_def['handler'],
                config=step_def.get('config', {}),
                conditions=conditions,
                on_success=step_def.get('on_success'),
                on_failure=step_def.get('on_failure'),
                retry_count=0,
                max_retries=step_def.get('max_retries', 3),
                timeout=step_def.get('timeout', 300)
            )
            workflow_steps[step.id] = step
        
        workflow = Workflow(
            id=workflow_id,
            name=name,
            description=description,
            steps=workflow_steps,
            entry_point=entry_point,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        self.workflows[workflow_id] = workflow
        logger.info(f"Created workflow: {name} ({workflow_id})")
        
        return workflow
    
    async def execute_workflow(self, workflow_id: str, 
                              initial_context: Dict[str, Any]) -> WorkflowExecution:
        """Execute a workflow"""
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        workflow = self.workflows[workflow_id]
        
        # Create execution
        execution = WorkflowExecution(
            id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            status=StepStatus.RUNNING,
            started_at=datetime.now(),
            context=initial_context.copy()
        )
        
        self.executions[execution.id] = execution
        
        try:
            # Start from entry point
            await self._execute_step(workflow, execution, workflow.entry_point)
            
            # Mark as successful if no errors
            if not execution.errors:
                execution.status = StepStatus.SUCCESS
            else:
                execution.status = StepStatus.FAILED
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}")
            execution.status = StepStatus.FAILED
            execution.errors.append({
                'step': execution.current_step,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
        finally:
            execution.completed_at = datetime.now()
        
        return execution
    
    async def _execute_step(self, workflow: Workflow, execution: WorkflowExecution, 
                           step_id: str):
        """Execute a single workflow step"""
        if step_id not in workflow.steps:
            logger.warning(f"Step {step_id} not found in workflow")
            return
        
        step = workflow.steps[step_id]
        execution.current_step = step_id
        
        # Check conditions
        if not step.should_execute(execution.context):
            logger.info(f"Skipping step {step.name} due to conditions")
            execution.step_results[step_id] = {
                'status': StepStatus.SKIPPED.value,
                'skipped_at': datetime.now().isoformat()
            }
            
            # Continue to next step if defined
            if step.on_success:
                await self._execute_step(workflow, execution, step.on_success)
            return
        
        # Get handler
        handler = self.handlers.get(step.handler)
        if not handler:
            raise ValueError(f"Handler {step.handler} not found")
        
        logger.info(f"Executing step: {step.name}")
        
        # Execute with retries
        for attempt in range(step.max_retries + 1):
            try:
                # Execute handler with timeout
                result = await asyncio.wait_for(
                    handler(execution.context, step.config),
                    timeout=step.timeout
                )
                
                # Store result
                execution.step_results[step_id] = {
                    'status': StepStatus.SUCCESS.value,
                    'result': result,
                    'completed_at': datetime.now().isoformat(),
                    'attempts': attempt + 1
                }
                
                # Update context with result
                execution.context[f'{step_id}_result'] = result
                
                # Continue to next step
                if step.on_success:
                    await self._execute_step(workflow, execution, step.on_success)
                
                break  # Success, exit retry loop
                
            except asyncio.TimeoutError:
                error_msg = f"Step {step.name} timed out after {step.timeout}s"
                logger.error(error_msg)
                
                if attempt < step.max_retries:
                    logger.info(f"Retrying step {step.name} (attempt {attempt + 2})")
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    self._handle_step_failure(execution, step, error_msg)
                    if step.on_failure:
                        await self._execute_step(workflow, execution, step.on_failure)
                    break
                    
            except Exception as e:
                error_msg = f"Step {step.name} failed: {str(e)}"
                logger.error(error_msg)
                
                if attempt < step.max_retries:
                    logger.info(f"Retrying step {step.name} (attempt {attempt + 2})")
                    await asyncio.sleep(2 ** attempt)
                else:
                    self._handle_step_failure(execution, step, error_msg)
                    if step.on_failure:
                        await self._execute_step(workflow, execution, step.on_failure)
                    break
    
    def _handle_step_failure(self, execution: WorkflowExecution, 
                            step: WorkflowStep, error_msg: str):
        """Handle step failure"""
        execution.step_results[step.id] = {
            'status': StepStatus.FAILED.value,
            'error': error_msg,
            'failed_at': datetime.now().isoformat()
        }
        
        execution.errors.append({
            'step_id': step.id,
            'step_name': step.name,
            'error': error_msg,
            'timestamp': datetime.now().isoformat()
        })
    
    # Built-in handlers
    
    async def _ocr_extract_handler(self, context: Dict[str, Any], 
                                  config: Dict[str, Any]) -> Dict[str, Any]:
        """Extract text from document using OCR"""
        from modules.doc_converter.processing.enhanced_processor import EnhancedDocumentProcessor
        
        document_path = context.get('document_path')
        if not document_path:
            raise ValueError("No document_path in context")
        
        processor = EnhancedDocumentProcessor()
        result = await processor.extract_text_with_ocr(
            document_path,
            language=config.get('language', 'deu+eng'),
            dpi=config.get('dpi', 300)
        )
        
        return {
            'text': result.get('text', ''),
            'pages': result.get('pages', 0),
            'confidence': result.get('confidence', 0)
        }
    
    async def _ocr_preprocess_handler(self, context: Dict[str, Any], 
                                     config: Dict[str, Any]) -> Dict[str, Any]:
        """Preprocess image for better OCR results"""
        # Implementation would use image processing libraries
        # For now, return mock result
        return {
            'preprocessed': True,
            'enhancements': ['deskew', 'denoise', 'contrast']
        }
    
    async def _extract_metadata_handler(self, context: Dict[str, Any], 
                                       config: Dict[str, Any]) -> Dict[str, Any]:
        """Extract document metadata"""
        from modules.doc_converter.processing import metadata_extractor
        
        document_path = context.get('document_path')
        if not document_path:
            raise ValueError("No document_path in context")
        
        metadata = metadata_extractor.extract_metadata(document_path)
        return metadata
    
    async def _extract_entities_handler(self, context: Dict[str, Any], 
                                       config: Dict[str, Any]) -> Dict[str, Any]:
        """Extract named entities from document"""
        text = context.get('ocr_extract_result', {}).get('text', '')
        if not text:
            text = context.get('text', '')
        
        # Simple entity extraction - would use NLP in production
        import re
        
        entities = {
            'dates': re.findall(r'\d{1,2}[./-]\d{1,2}[./-]\d{2,4}', text),
            'emails': re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', text),
            'urls': re.findall(r'https?://[^\s]+', text),
            'numbers': re.findall(r'\b\d{5,}\b', text)  # IDs, phone numbers, etc.
        }
        
        return entities
    
    async def _classify_document_handler(self, context: Dict[str, Any], 
                                        config: Dict[str, Any]) -> Dict[str, Any]:
        """Classify document type"""
        text = context.get('text', '')
        metadata = context.get('metadata', {})
        
        # Simple rule-based classification
        classification = {
            'type': 'unknown',
            'confidence': 0.0,
            'categories': []
        }
        
        # Check for invoice indicators
        if any(word in text.lower() for word in ['rechnung', 'invoice', 'total', 'mwst']):
            classification['type'] = 'invoice'
            classification['confidence'] = 0.9
            classification['categories'].append('financial')
        
        # Check for contract indicators
        elif any(word in text.lower() for word in ['vertrag', 'contract', 'agreement']):
            classification['type'] = 'contract'
            classification['confidence'] = 0.85
            classification['categories'].append('legal')
        
        # Check for report indicators
        elif any(word in text.lower() for word in ['bericht', 'report', 'summary']):
            classification['type'] = 'report'
            classification['confidence'] = 0.8
            classification['categories'].append('business')
        
        return classification
    
    async def _transform_format_handler(self, context: Dict[str, Any], 
                                       config: Dict[str, Any]) -> Dict[str, Any]:
        """Transform document format"""
        from modules.doc_converter.main import DocumentConverter
        
        input_path = context.get('document_path')
        output_format = config.get('output_format', 'pdf')
        
        converter = DocumentConverter()
        output_path = await converter.convert(
            input_path,
            output_format=output_format
        )
        
        return {
            'output_path': output_path,
            'format': output_format
        }
    
    async def _split_document_handler(self, context: Dict[str, Any], 
                                     config: Dict[str, Any]) -> Dict[str, Any]:
        """Split document into multiple parts"""
        # Implementation would split PDF/documents
        # For now, return mock result
        return {
            'parts': [
                {'path': '/tmp/part1.pdf', 'pages': '1-10'},
                {'path': '/tmp/part2.pdf', 'pages': '11-20'}
            ],
            'total_parts': 2
        }
    
    async def _merge_documents_handler(self, context: Dict[str, Any], 
                                      config: Dict[str, Any]) -> Dict[str, Any]:
        """Merge multiple documents"""
        # Implementation would merge documents
        # For now, return mock result
        return {
            'merged_path': '/tmp/merged.pdf',
            'total_pages': 50
        }
    
    async def _validate_schema_handler(self, context: Dict[str, Any], 
                                      config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate document against schema"""
        schema = config.get('schema', {})
        data = context.get('extracted_data', {})
        
        errors = []
        
        # Simple validation
        for field, rules in schema.items():
            if rules.get('required') and field not in data:
                errors.append(f"Missing required field: {field}")
            
            if field in data and 'type' in rules:
                # Type checking would go here
                pass
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    async def _validate_content_handler(self, context: Dict[str, Any], 
                                       config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate document content"""
        rules = config.get('rules', [])
        text = context.get('text', '')
        
        validation_results = []
        
        for rule in rules:
            if rule['type'] == 'contains':
                passed = rule['value'] in text
            elif rule['type'] == 'min_length':
                passed = len(text) >= rule['value']
            elif rule['type'] == 'max_length':
                passed = len(text) <= rule['value']
            else:
                passed = False
            
            validation_results.append({
                'rule': rule['name'],
                'passed': passed
            })
        
        return {
            'valid': all(r['passed'] for r in validation_results),
            'results': validation_results
        }
    
    async def _index_to_rag_handler(self, context: Dict[str, Any], 
                                   config: Dict[str, Any]) -> Dict[str, Any]:
        """Index document to RAG system"""
        from modules.rag.knowledge_manager import knowledge_manager
        
        document_path = context.get('document_path')
        metadata = context.get('metadata', {})
        classification = context.get('classification', {})
        
        # Add to knowledge base
        result = await knowledge_manager.add_document(
            file_path=document_path,
            metadata={
                **metadata,
                'document_type': classification.get('type', 'unknown'),
                'categories': classification.get('categories', []),
                'workflow_id': context.get('workflow_id')
            }
        )
        
        return {
            'indexed': True,
            'document_id': result.get('id'),
            'chunks': result.get('chunks', 0)
        }
    
    async def _send_notification_handler(self, context: Dict[str, Any], 
                                        config: Dict[str, Any]) -> Dict[str, Any]:
        """Send notification about workflow completion"""
        from modules.core.email_service import email_service
        
        notification_type = config.get('type', 'email')
        
        if notification_type == 'email':
            recipient = config.get('recipient')
            if recipient:
                await email_service.send_email(
                    to_email=recipient,
                    subject=f"Workflow completed: {context.get('workflow_name', 'Unknown')}",
                    body=f"Your document has been processed successfully."
                )
        
        return {
            'notification_sent': True,
            'type': notification_type
        }
    
    def export_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """Export workflow as JSON"""
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        workflow = self.workflows[workflow_id]
        
        return {
            'id': workflow.id,
            'name': workflow.name,
            'description': workflow.description,
            'entry_point': workflow.entry_point,
            'steps': [
                {
                    'id': step.id,
                    'name': step.name,
                    'type': step.type,
                    'handler': step.handler,
                    'config': step.config,
                    'conditions': [
                        {
                            'field': cond.field,
                            'operator': cond.operator.value,
                            'value': cond.value
                        }
                        for cond in step.conditions
                    ],
                    'on_success': step.on_success,
                    'on_failure': step.on_failure,
                    'max_retries': step.max_retries,
                    'timeout': step.timeout
                }
                for step in workflow.steps.values()
            ],
            'created_at': workflow.created_at.isoformat(),
            'updated_at': workflow.updated_at.isoformat(),
            'tags': workflow.tags,
            'metadata': workflow.metadata
        }
    
    def import_workflow(self, workflow_data: Dict[str, Any]) -> Workflow:
        """Import workflow from JSON"""
        return self.create_workflow(
            name=workflow_data['name'],
            description=workflow_data['description'],
            steps=workflow_data['steps'],
            entry_point=workflow_data['entry_point']
        )

# Global workflow engine instance
workflow_engine = WorkflowEngine()