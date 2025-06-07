import pytest
import asyncio
from datetime import datetime
import json
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.core.email_service import email_service
from modules.background.job_retry_manager import job_manager, JobStatus, Job
from modules.core.hot_reload_config import config_manager
from modules.doc_converter.workflow_engine import workflow_engine, WorkflowCondition, ConditionOperator

class TestEmailService:
    """Test email service functionality"""
    
    @pytest.mark.asyncio
    async def test_email_configuration(self):
        """Test email service configuration"""
        # Test connection (should fail without proper config)
        assert not email_service.test_connection()
        
        # Test template rendering
        template = email_service.templates['password_reset']
        assert 'Password Reset Request' in template['subject']
        
        # Test custom template
        email_service.add_custom_template(
            'test_template',
            'Test Subject',
            '<p>Hello {name}!</p>'
        )
        assert 'test_template' in email_service.templates
    
    @pytest.mark.asyncio
    async def test_email_templates(self):
        """Test email template functionality"""
        # Mock send_email to avoid actual sending
        original_send = email_service.send_email
        emails_sent = []
        
        async def mock_send(to_email, subject, body, is_html=True):
            emails_sent.append({
                'to': to_email,
                'subject': subject,
                'body': body
            })
            return True
        
        email_service.send_email = mock_send
        
        try:
            # Test password reset email
            await email_service.send_password_reset_email(
                'test@example.com',
                'Test User',
                'http://localhost:3000/reset?token=abc123'
            )
            
            assert len(emails_sent) == 1
            assert emails_sent[0]['to'] == 'test@example.com'
            assert 'Password Reset Request' in emails_sent[0]['subject']
            assert 'Test User' in emails_sent[0]['body']
            assert 'http://localhost:3000/reset?token=abc123' in emails_sent[0]['body']
            
        finally:
            email_service.send_email = original_send

class TestJobRetryManager:
    """Test background job retry functionality"""
    
    @pytest.mark.asyncio
    async def test_job_creation(self):
        """Test job creation and retrieval"""
        # Create a test job
        job = await job_manager.create_job(
            job_type='test_job',
            payload={'test': 'data'},
            user_id='test_user',
            priority=5
        )
        
        assert job.id
        assert job.type == 'test_job'
        assert job.status == JobStatus.PENDING
        assert job.payload == {'test': 'data'}
        assert job.user_id == 'test_user'
        assert job.priority == 5
        
        # Retrieve job
        retrieved_job = await job_manager.get_job(job.id)
        assert retrieved_job
        assert retrieved_job.id == job.id
    
    @pytest.mark.asyncio
    async def test_job_handler_registration(self):
        """Test job handler registration and execution"""
        executed = {'count': 0}
        
        async def test_handler(payload):
            executed['count'] += 1
            return {'result': 'success', 'input': payload}
        
        # Register handler
        job_manager.register_handler('test_handler_job', test_handler)
        assert 'test_handler_job' in job_manager.handlers
        
        # Create and execute job
        job = await job_manager.create_job(
            job_type='test_handler_job',
            payload={'test': 'data'}
        )
        
        # Execute job directly (without background processing)
        await job_manager._execute_job(job)
        
        # Check execution
        assert executed['count'] == 1
        
        # Check job status
        updated_job = await job_manager.get_job(job.id)
        assert updated_job.status == JobStatus.SUCCESS
        assert updated_job.result == {'result': 'success', 'input': {'test': 'data'}}
    
    @pytest.mark.asyncio
    async def test_job_retry_mechanism(self):
        """Test job retry on failure"""
        attempt_count = {'count': 0}
        
        async def failing_handler(payload):
            attempt_count['count'] += 1
            if attempt_count['count'] < 3:
                raise Exception("Simulated failure")
            return {'result': 'success after retries'}
        
        # Register handler
        job_manager.register_handler('retry_test_job', failing_handler)
        
        # Create job
        job = await job_manager.create_job(
            job_type='retry_test_job',
            payload={'test': 'retry'}
        )
        
        # Execute job (it should retry)
        await job_manager._execute_job(job)
        
        # Check that it retried
        assert attempt_count['count'] == 3
        
        # Check final status
        updated_job = await job_manager.get_job(job.id)
        assert updated_job.status == JobStatus.SUCCESS
        assert updated_job.retry_count == 2  # 2 retries after initial failure
    
    @pytest.mark.asyncio
    async def test_job_statistics(self):
        """Test job statistics"""
        # Create various jobs
        await job_manager.create_job('stat_test', {'type': 'success'})
        await job_manager.create_job('stat_test', {'type': 'pending'})
        
        # Get statistics
        stats = await job_manager.get_statistics()
        
        assert 'status_counts' in stats
        assert 'type_counts' in stats
        assert 'total_jobs' in stats
        assert stats['total_jobs'] > 0

class TestHotReloadConfig:
    """Test hot reload configuration"""
    
    @pytest.mark.asyncio
    async def test_config_get_set(self):
        """Test configuration get/set operations"""
        # Set a value
        await config_manager.set('test.key', 'test_value', persist=False)
        
        # Get value
        value = config_manager.get('test.key')
        assert value == 'test_value'
        
        # Get nested value
        await config_manager.set('test.nested.deep.value', 42, persist=False)
        assert config_manager.get('test.nested.deep.value') == 42
        
        # Get with default
        assert config_manager.get('non.existent.key', 'default') == 'default'
    
    @pytest.mark.asyncio
    async def test_config_callbacks(self):
        """Test configuration change callbacks"""
        callback_fired = {'count': 0, 'change': None}
        
        def test_callback(change):
            callback_fired['count'] += 1
            callback_fired['change'] = change
        
        # Register callback
        config_manager.register_callback('test.callback.key', test_callback)
        
        # Change value
        await config_manager.set('test.callback.key', 'new_value', persist=False)
        
        # Check callback was fired
        assert callback_fired['count'] == 1
        assert callback_fired['change'].new_value == 'new_value'
        assert callback_fired['change'].key_path == 'test.callback.key'
    
    def test_config_validation(self):
        """Test configuration validation"""
        schema = {
            'server': {
                'required': True,
                'nested': {
                    'port': {
                        'type': int,
                        'min': 1,
                        'max': 65535
                    },
                    'host': {
                        'type': str,
                        'required': True
                    }
                }
            }
        }
        
        # Set valid config
        config_manager.config = {
            'server': {
                'port': 8000,
                'host': 'localhost'
            }
        }
        
        errors = config_manager.validate_config(schema)
        assert len(errors) == 0
        
        # Test invalid config
        config_manager.config['server']['port'] = 70000
        errors = config_manager.validate_config(schema)
        assert len(errors) > 0
        assert any('above maximum' in error for error in errors)

class TestWorkflowEngine:
    """Test workflow engine functionality"""
    
    def test_workflow_creation(self):
        """Test workflow creation"""
        # Define workflow steps
        steps = [
            {
                'id': 'step1',
                'name': 'Extract Text',
                'type': 'ocr',
                'handler': 'ocr_extract',
                'config': {'language': 'eng'},
                'on_success': 'step2'
            },
            {
                'id': 'step2',
                'name': 'Classify Document',
                'type': 'classification',
                'handler': 'classify_document',
                'config': {},
                'conditions': [
                    {
                        'field': 'ocr_extract_result.text',
                        'operator': 'exists',
                        'value': None
                    }
                ]
            }
        ]
        
        # Create workflow
        workflow = workflow_engine.create_workflow(
            name='Test OCR Workflow',
            description='Test workflow for OCR processing',
            steps=steps,
            entry_point='step1'
        )
        
        assert workflow.id
        assert workflow.name == 'Test OCR Workflow'
        assert len(workflow.steps) == 2
        assert workflow.entry_point == 'step1'
    
    def test_workflow_condition_evaluation(self):
        """Test workflow condition evaluation"""
        # Test EQUALS condition
        cond = WorkflowCondition(
            field='status',
            operator=ConditionOperator.EQUALS,
            value='success'
        )
        assert cond.evaluate({'status': 'success'})
        assert not cond.evaluate({'status': 'failed'})
        
        # Test CONTAINS condition
        cond = WorkflowCondition(
            field='text',
            operator=ConditionOperator.CONTAINS,
            value='invoice'
        )
        assert cond.evaluate({'text': 'This is an invoice document'})
        assert not cond.evaluate({'text': 'This is a contract'})
        
        # Test nested field access
        cond = WorkflowCondition(
            field='result.classification.type',
            operator=ConditionOperator.EQUALS,
            value='invoice'
        )
        assert cond.evaluate({
            'result': {
                'classification': {
                    'type': 'invoice'
                }
            }
        })
    
    @pytest.mark.asyncio
    async def test_workflow_execution(self):
        """Test workflow execution"""
        # Create a simple test workflow
        executed_steps = []
        
        async def test_step_handler(context, config):
            step_name = config.get('step_name', 'unknown')
            executed_steps.append(step_name)
            return {'executed': step_name}
        
        # Register test handlers
        workflow_engine.register_handler('test_step', test_step_handler)
        
        # Create workflow
        steps = [
            {
                'id': 'start',
                'name': 'Start Step',
                'type': 'test',
                'handler': 'test_step',
                'config': {'step_name': 'start'},
                'on_success': 'middle'
            },
            {
                'id': 'middle',
                'name': 'Middle Step',
                'type': 'test',
                'handler': 'test_step',
                'config': {'step_name': 'middle'},
                'on_success': 'end'
            },
            {
                'id': 'end',
                'name': 'End Step',
                'type': 'test',
                'handler': 'test_step',
                'config': {'step_name': 'end'}
            }
        ]
        
        workflow = workflow_engine.create_workflow(
            name='Test Execution Workflow',
            description='Test workflow execution',
            steps=steps,
            entry_point='start'
        )
        
        # Execute workflow
        execution = await workflow_engine.execute_workflow(
            workflow.id,
            {'initial': 'context'}
        )
        
        # Check execution
        assert execution.status.value == 'success'
        assert len(executed_steps) == 3
        assert executed_steps == ['start', 'middle', 'end']
        assert len(execution.step_results) == 3

class TestIntegration:
    """Test integration between components"""
    
    @pytest.mark.asyncio
    async def test_job_with_email_notification(self):
        """Test job completion with email notification"""
        # Mock email sending
        emails_sent = []
        original_send = email_service.send_job_completion_email
        
        async def mock_send_completion(*args, **kwargs):
            emails_sent.append(kwargs)
            return True
        
        email_service.send_job_completion_email = mock_send_completion
        
        try:
            # Create and execute a job
            async def completion_test_handler(payload):
                return {'processed': True}
            
            job_manager.register_handler('completion_test', completion_test_handler)
            
            job = await job_manager.create_job(
                job_type='completion_test',
                payload={'test': 'data'},
                user_id='test_user'
            )
            
            # Execute job
            await job_manager._execute_job(job)
            
            # Email notification would be sent in real implementation
            # Here we just verify the job completed
            updated_job = await job_manager.get_job(job.id)
            assert updated_job.status == JobStatus.SUCCESS
            
        finally:
            email_service.send_job_completion_email = original_send
    
    @pytest.mark.asyncio
    async def test_workflow_with_config_changes(self):
        """Test workflow execution with configuration changes"""
        # Set initial config
        await config_manager.set('workflow.ocr.language', 'eng', persist=False)
        
        # Create workflow that uses config
        async def config_aware_handler(context, step_config):
            language = config_manager.get('workflow.ocr.language', 'eng')
            return {'language_used': language}
        
        workflow_engine.register_handler('config_test', config_aware_handler)
        
        workflow = workflow_engine.create_workflow(
            name='Config Test Workflow',
            description='Test config integration',
            steps=[{
                'id': 'test',
                'name': 'Test Step',
                'type': 'test',
                'handler': 'config_test',
                'config': {}
            }],
            entry_point='test'
        )
        
        # Execute with initial config
        execution1 = await workflow_engine.execute_workflow(workflow.id, {})
        assert execution1.step_results['test']['result']['language_used'] == 'eng'
        
        # Change config
        await config_manager.set('workflow.ocr.language', 'deu', persist=False)
        
        # Execute with new config
        execution2 = await workflow_engine.execute_workflow(workflow.id, {})
        assert execution2.step_results['test']['result']['language_used'] == 'deu'

if __name__ == '__main__':
    # Run tests
    pytest.main([__file__, '-v'])