from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime

from modules.core.auth_dependency import get_current_admin_user
from modules.auth.user_model import User
from modules.testing import (
    ab_testing,
    ExperimentStatus,
    AllocationStrategy
)

router = APIRouter(prefix="/api/admin/ab-testing", tags=["admin-ab-testing"])

@router.get("/experiments")
async def get_experiments(
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get all A/B testing experiments"""
    experiments = ab_testing.get_all_experiments()
    
    # Filter by status if provided
    if status:
        experiments = [e for e in experiments if e['status'] == status]
    
    # Group by status
    grouped = {
        'running': [],
        'completed': [],
        'draft': [],
        'paused': [],
        'archived': []
    }
    
    for exp in experiments:
        grouped[exp['status']].append(exp)
    
    return {
        'success': True,
        'experiments': experiments,
        'grouped': grouped,
        'total': len(experiments)
    }

@router.get("/experiments/{experiment_id}")
async def get_experiment_details(
    experiment_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get detailed experiment information"""
    status = await ab_testing.get_experiment_status(experiment_id)
    
    if 'error' in status:
        raise HTTPException(status_code=404, detail=status['error'])
    
    return {
        'success': True,
        **status
    }

@router.post("/experiments")
async def create_experiment(
    experiment_data: Dict[str, Any],
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Create a new A/B test experiment"""
    try:
        # Validate required fields
        required_fields = ['name', 'description', 'hypothesis', 'variants', 
                          'metrics', 'min_sample_size', 'max_duration_days']
        
        for field in required_fields:
            if field not in experiment_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        # Validate variants
        if len(experiment_data['variants']) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 variants are required"
            )
        
        # Ensure one control variant
        has_control = any(v.get('is_control', False) for v in experiment_data['variants'])
        if not has_control:
            experiment_data['variants'][0]['is_control'] = True
        
        # Validate metrics
        if not experiment_data['metrics']:
            raise HTTPException(
                status_code=400,
                detail="At least one metric is required"
            )
        
        # Ensure one primary metric
        has_primary = any(m.get('primary', False) for m in experiment_data['metrics'])
        if not has_primary:
            experiment_data['metrics'][0]['primary'] = True
        
        # Create experiment
        experiment = await ab_testing.create_experiment(experiment_data)
        
        return {
            'success': True,
            'experiment': {
                'id': experiment.id,
                'name': experiment.name,
                'status': experiment.status.value
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/experiments/{experiment_id}/start")
async def start_experiment(
    experiment_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Start an experiment"""
    success = await ab_testing.start_experiment(experiment_id)
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Failed to start experiment. It may not exist or is not in draft status."
        )
    
    return {
        'success': True,
        'message': 'Experiment started successfully'
    }

@router.put("/experiments/{experiment_id}/stop")
async def stop_experiment(
    experiment_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Stop a running experiment"""
    success = await ab_testing.stop_experiment(experiment_id)
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Failed to stop experiment. It may not exist or is not running."
        )
    
    return {
        'success': True,
        'message': 'Experiment stopped successfully'
    }

@router.put("/experiments/{experiment_id}/pause")
async def pause_experiment(
    experiment_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Pause a running experiment"""
    if experiment_id not in ab_testing.experiments:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    experiment = ab_testing.experiments[experiment_id]
    
    if experiment.status != ExperimentStatus.RUNNING:
        raise HTTPException(
            status_code=400,
            detail="Can only pause running experiments"
        )
    
    experiment.status = ExperimentStatus.PAUSED
    
    return {
        'success': True,
        'message': 'Experiment paused successfully'
    }

@router.put("/experiments/{experiment_id}/resume")
async def resume_experiment(
    experiment_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Resume a paused experiment"""
    if experiment_id not in ab_testing.experiments:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    experiment = ab_testing.experiments[experiment_id]
    
    if experiment.status != ExperimentStatus.PAUSED:
        raise HTTPException(
            status_code=400,
            detail="Can only resume paused experiments"
        )
    
    experiment.status = ExperimentStatus.RUNNING
    
    return {
        'success': True,
        'message': 'Experiment resumed successfully'
    }

@router.delete("/experiments/{experiment_id}")
async def delete_experiment(
    experiment_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Delete an experiment (only if in draft or archived status)"""
    if experiment_id not in ab_testing.experiments:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    experiment = ab_testing.experiments[experiment_id]
    
    if experiment.status not in [ExperimentStatus.DRAFT, ExperimentStatus.ARCHIVED]:
        raise HTTPException(
            status_code=400,
            detail="Can only delete experiments in draft or archived status"
        )
    
    del ab_testing.experiments[experiment_id]
    
    return {
        'success': True,
        'message': 'Experiment deleted successfully'
    }

@router.get("/experiments/{experiment_id}/results")
async def get_experiment_results(
    experiment_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get detailed results for an experiment"""
    if experiment_id not in ab_testing.experiments:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    experiment = ab_testing.experiments[experiment_id]
    
    # Format results for response
    results_by_metric = {}
    
    for metric in experiment.metrics:
        metric_results = []
        
        for variant in experiment.variants:
            if variant.id in experiment.results and metric.id in experiment.results[variant.id]:
                result = experiment.results[variant.id][metric.id]
                
                metric_results.append({
                    'variant_id': variant.id,
                    'variant_name': variant.name,
                    'is_control': variant.is_control,
                    'sample_size': result.sample_size,
                    'conversion_rate': result.conversion_rate if metric.type == 'conversion' else None,
                    'conversions': result.conversions if metric.type == 'conversion' else None,
                    'mean_value': result.mean_value if metric.type != 'conversion' else None,
                    'std_dev': result.std_dev,
                    'confidence_interval': {
                        'lower': result.confidence_interval[0],
                        'upper': result.confidence_interval[1]
                    },
                    'p_value': result.p_value,
                    'is_significant': result.is_significant,
                    'uplift': result.uplift,
                    'uplift_percentage': result.uplift * 100
                })
        
        results_by_metric[metric.id] = {
            'metric_name': metric.name,
            'metric_type': metric.type,
            'metric_goal': metric.goal,
            'is_primary': metric.primary,
            'results': metric_results
        }
    
    return {
        'success': True,
        'experiment_id': experiment_id,
        'experiment_name': experiment.name,
        'status': experiment.status.value,
        'results': results_by_metric
    }

@router.post("/experiments/{experiment_id}/simulate")
async def simulate_traffic(
    experiment_id: str,
    participants: int = Query(100, ge=10, le=1000, description="Number of participants to simulate"),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Simulate traffic for testing (development only)"""
    if experiment_id not in ab_testing.experiments:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    experiment = ab_testing.experiments[experiment_id]
    
    if experiment.status != ExperimentStatus.RUNNING:
        raise HTTPException(
            status_code=400,
            detail="Can only simulate traffic for running experiments"
        )
    
    import random
    import uuid
    
    # Simulate user assignments and events
    for _ in range(participants):
        user_id = str(uuid.uuid4())
        
        # Get variant assignment
        variant_id = await ab_testing.get_variant_assignment(experiment_id, user_id)
        
        if variant_id:
            # Simulate events for each metric
            for metric in experiment.metrics:
                if metric.type == 'conversion':
                    # Simulate conversion with some probability
                    if random.random() < 0.2:  # 20% base conversion
                        await ab_testing.track_event(
                            experiment_id, user_id, metric.id, 1
                        )
                elif metric.type == 'numeric':
                    # Simulate numeric value
                    value = random.gauss(10, 3)
                    await ab_testing.track_event(
                        experiment_id, user_id, metric.id, value
                    )
                elif metric.type == 'duration':
                    # Simulate duration in seconds
                    value = random.gauss(300, 90)  # 5 min average
                    await ab_testing.track_event(
                        experiment_id, user_id, metric.id, value
                    )
    
    # Recalculate results
    await ab_testing._calculate_results(experiment_id)
    
    return {
        'success': True,
        'message': f'Simulated {participants} participants',
        'experiment_id': experiment_id
    }

@router.get("/allocation-strategies")
async def get_allocation_strategies(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get available allocation strategies"""
    strategies = [
        {
            'id': AllocationStrategy.RANDOM.value,
            'name': 'Random',
            'description': 'Randomly assign users to variants with equal probability'
        },
        {
            'id': AllocationStrategy.WEIGHTED.value,
            'name': 'Weighted',
            'description': 'Assign users based on variant weights'
        },
        {
            'id': AllocationStrategy.ADAPTIVE.value,
            'name': 'Adaptive (Multi-Armed Bandit)',
            'description': 'Dynamically adjust allocation based on performance'
        }
    ]
    
    return {
        'success': True,
        'strategies': strategies
    }

@router.get("/metric-types")
async def get_metric_types(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get available metric types"""
    metric_types = [
        {
            'id': 'conversion',
            'name': 'Conversion',
            'description': 'Binary outcome (yes/no)',
            'example': 'Button clicks, form submissions'
        },
        {
            'id': 'numeric',
            'name': 'Numeric',
            'description': 'Continuous numeric value',
            'example': 'Revenue, items per session'
        },
        {
            'id': 'duration',
            'name': 'Duration',
            'description': 'Time-based metric',
            'example': 'Session length, time to complete'
        }
    ]
    
    return {
        'success': True,
        'metric_types': metric_types
    }