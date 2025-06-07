import logging
import hashlib
import random
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import json
import uuid
from collections import defaultdict
import numpy as np
from scipy import stats
import asyncio

logger = logging.getLogger(__name__)

class ExperimentStatus(Enum):
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class AllocationStrategy(Enum):
    RANDOM = "random"
    WEIGHTED = "weighted"
    ADAPTIVE = "adaptive"  # Multi-armed bandit

@dataclass
class Variant:
    """Variant in an A/B test"""
    id: str
    name: str
    description: str
    config: Dict[str, Any]
    weight: float = 1.0
    is_control: bool = False

@dataclass
class Metric:
    """Metric to track in experiment"""
    id: str
    name: str
    type: str  # 'conversion', 'numeric', 'duration'
    goal: str  # 'increase', 'decrease'
    primary: bool = False

@dataclass
class ExperimentResult:
    """Result for a variant"""
    variant_id: str
    metric_id: str
    sample_size: int
    conversions: int = 0
    conversion_rate: float = 0.0
    mean_value: float = 0.0
    std_dev: float = 0.0
    confidence_interval: Tuple[float, float] = (0.0, 0.0)
    p_value: float = 1.0
    is_significant: bool = False
    uplift: float = 0.0

@dataclass
class Experiment:
    """A/B Test experiment"""
    id: str
    name: str
    description: str
    hypothesis: str
    variants: List[Variant]
    metrics: List[Metric]
    allocation_strategy: AllocationStrategy
    traffic_percentage: float  # Percentage of traffic to include
    min_sample_size: int
    max_duration_days: int
    status: ExperimentStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    results: Dict[str, Dict[str, ExperimentResult]] = None
    
    def __post_init__(self):
        if self.results is None:
            self.results = {}

class ABTestingFramework:
    """A/B Testing framework with statistical analysis"""
    
    def __init__(self):
        # Experiment storage
        self.experiments: Dict[str, Experiment] = {}
        
        # User assignments (user_id -> experiment_id -> variant_id)
        self.assignments: Dict[str, Dict[str, str]] = defaultdict(dict)
        
        # Event tracking (experiment_id -> variant_id -> metric_id -> events)
        self.events: Dict[str, Dict[str, Dict[str, List[Any]]]] = defaultdict(
            lambda: defaultdict(lambda: defaultdict(list))
        )
        
        # Initialize with demo experiments
        self._initialize_demo_experiments()
    
    def _initialize_demo_experiments(self):
        """Initialize demo experiments"""
        # Chat Interface Optimization
        chat_experiment = Experiment(
            id="chat-ui-optimization",
            name="Chat Interface Optimization",
            description="Test new chat UI design for better engagement",
            hypothesis="A streamlined chat interface will increase message volume by 20%",
            variants=[
                Variant(
                    id="control",
                    name="Current Design",
                    description="Existing chat interface",
                    config={"ui_version": "v1"},
                    is_control=True
                ),
                Variant(
                    id="streamlined",
                    name="Streamlined Design",
                    description="New minimalist chat interface",
                    config={"ui_version": "v2", "features": ["quick_replies", "typing_indicator"]}
                )
            ],
            metrics=[
                Metric(
                    id="messages_per_session",
                    name="Messages per Session",
                    type="numeric",
                    goal="increase",
                    primary=True
                ),
                Metric(
                    id="session_duration",
                    name="Session Duration",
                    type="duration",
                    goal="increase"
                ),
                Metric(
                    id="user_satisfaction",
                    name="User Satisfaction",
                    type="numeric",
                    goal="increase"
                )
            ],
            allocation_strategy=AllocationStrategy.RANDOM,
            traffic_percentage=50.0,
            min_sample_size=1000,
            max_duration_days=14,
            status=ExperimentStatus.RUNNING,
            created_at=datetime.now() - timedelta(days=7),
            started_at=datetime.now() - timedelta(days=7)
        )
        
        # Generate demo results
        self._generate_demo_results(chat_experiment)
        self.experiments[chat_experiment.id] = chat_experiment
        
        # Document Upload Flow
        upload_experiment = Experiment(
            id="document-upload-flow",
            name="Document Upload Flow Optimization",
            description="Test drag-and-drop vs button upload",
            hypothesis="Drag-and-drop will increase document upload completion by 15%",
            variants=[
                Variant(
                    id="button-only",
                    name="Button Upload",
                    description="Traditional button-based upload",
                    config={"upload_method": "button"},
                    is_control=True
                ),
                Variant(
                    id="drag-drop",
                    name="Drag & Drop",
                    description="Drag and drop with visual feedback",
                    config={"upload_method": "drag_drop", "visual_feedback": True}
                ),
                Variant(
                    id="hybrid",
                    name="Hybrid Approach",
                    description="Both button and drag-drop",
                    config={"upload_method": "hybrid"}
                )
            ],
            metrics=[
                Metric(
                    id="upload_completion_rate",
                    name="Upload Completion Rate",
                    type="conversion",
                    goal="increase",
                    primary=True
                ),
                Metric(
                    id="time_to_upload",
                    name="Time to Upload",
                    type="duration",
                    goal="decrease"
                ),
                Metric(
                    id="files_per_session",
                    name="Files per Session",
                    type="numeric",
                    goal="increase"
                )
            ],
            allocation_strategy=AllocationStrategy.WEIGHTED,
            traffic_percentage=75.0,
            min_sample_size=500,
            max_duration_days=10,
            status=ExperimentStatus.RUNNING,
            created_at=datetime.now() - timedelta(days=5),
            started_at=datetime.now() - timedelta(days=5)
        )
        
        self._generate_demo_results(upload_experiment)
        self.experiments[upload_experiment.id] = upload_experiment
        
        # Onboarding Flow (Completed)
        onboarding_experiment = Experiment(
            id="onboarding-optimization",
            name="Onboarding Flow Optimization",
            description="Test guided tour vs self-exploration",
            hypothesis="Guided tour will increase feature adoption by 30%",
            variants=[
                Variant(
                    id="self-guided",
                    name="Self-Guided",
                    description="Users explore on their own",
                    config={"onboarding": "none"},
                    is_control=True
                ),
                Variant(
                    id="guided-tour",
                    name="Guided Tour",
                    description="Interactive step-by-step tour",
                    config={"onboarding": "tour", "steps": 5}
                )
            ],
            metrics=[
                Metric(
                    id="feature_adoption",
                    name="Feature Adoption Rate",
                    type="conversion",
                    goal="increase",
                    primary=True
                ),
                Metric(
                    id="time_to_first_action",
                    name="Time to First Action",
                    type="duration",
                    goal="decrease"
                )
            ],
            allocation_strategy=AllocationStrategy.RANDOM,
            traffic_percentage=100.0,
            min_sample_size=300,
            max_duration_days=7,
            status=ExperimentStatus.COMPLETED,
            created_at=datetime.now() - timedelta(days=20),
            started_at=datetime.now() - timedelta(days=20),
            ended_at=datetime.now() - timedelta(days=13)
        )
        
        self._generate_demo_results(onboarding_experiment, completed=True)
        self.experiments[onboarding_experiment.id] = onboarding_experiment
    
    def _generate_demo_results(self, experiment: Experiment, completed: bool = False):
        """Generate realistic demo results"""
        for variant in experiment.variants:
            experiment.results[variant.id] = {}
            
            for metric in experiment.metrics:
                # Generate sample size
                base_sample = 500 if completed else random.randint(100, 400)
                sample_size = int(base_sample * (1 + random.uniform(-0.2, 0.2)))
                
                if metric.type == "conversion":
                    # Generate conversion data
                    if variant.is_control:
                        conversion_rate = 0.15  # 15% baseline
                    else:
                        # Variants can be better or worse
                        uplift = random.uniform(-0.2, 0.4) if metric.primary else random.uniform(-0.1, 0.2)
                        conversion_rate = 0.15 * (1 + uplift)
                    
                    conversions = int(sample_size * conversion_rate)
                    
                    # Calculate confidence interval
                    se = np.sqrt(conversion_rate * (1 - conversion_rate) / sample_size)
                    ci_lower = conversion_rate - 1.96 * se
                    ci_upper = conversion_rate + 1.96 * se
                    
                    # Calculate p-value (simplified)
                    if variant.is_control:
                        p_value = 1.0
                        is_significant = False
                        uplift = 0.0
                    else:
                        # Simulate statistical test
                        control_result = next(
                            (r for v in experiment.variants if v.is_control 
                             for r_id, r in experiment.results.get(v.id, {}).items() 
                             if r_id == metric.id), 
                            None
                        )
                        
                        if control_result:
                            # Chi-square test simulation
                            z_score = abs(conversion_rate - control_result.conversion_rate) / \
                                     np.sqrt(se**2 + control_result.std_dev**2)
                            p_value = 2 * (1 - stats.norm.cdf(z_score))
                            is_significant = p_value < 0.05
                            uplift = (conversion_rate - control_result.conversion_rate) / \
                                    control_result.conversion_rate
                        else:
                            p_value = random.uniform(0.01, 0.5)
                            is_significant = p_value < 0.05
                            uplift = (conversion_rate - 0.15) / 0.15
                    
                    result = ExperimentResult(
                        variant_id=variant.id,
                        metric_id=metric.id,
                        sample_size=sample_size,
                        conversions=conversions,
                        conversion_rate=conversion_rate,
                        std_dev=se,
                        confidence_interval=(ci_lower, ci_upper),
                        p_value=p_value,
                        is_significant=is_significant,
                        uplift=uplift
                    )
                
                elif metric.type == "numeric":
                    # Generate numeric data
                    if variant.is_control:
                        mean_value = 10.0
                    else:
                        change = random.uniform(-2, 4) if metric.primary else random.uniform(-1, 2)
                        mean_value = 10.0 + change
                    
                    std_dev = 3.0
                    se = std_dev / np.sqrt(sample_size)
                    ci_lower = mean_value - 1.96 * se
                    ci_upper = mean_value + 1.96 * se
                    
                    # T-test simulation
                    if not variant.is_control:
                        t_stat = abs(mean_value - 10.0) / np.sqrt(2 * (std_dev**2) / sample_size)
                        p_value = 2 * (1 - stats.t.cdf(t_stat, df=2*sample_size-2))
                        is_significant = p_value < 0.05
                        uplift = (mean_value - 10.0) / 10.0
                    else:
                        p_value = 1.0
                        is_significant = False
                        uplift = 0.0
                    
                    result = ExperimentResult(
                        variant_id=variant.id,
                        metric_id=metric.id,
                        sample_size=sample_size,
                        mean_value=mean_value,
                        std_dev=std_dev,
                        confidence_interval=(ci_lower, ci_upper),
                        p_value=p_value,
                        is_significant=is_significant,
                        uplift=uplift
                    )
                
                elif metric.type == "duration":
                    # Generate duration data (in seconds)
                    if variant.is_control:
                        mean_value = 300  # 5 minutes
                    else:
                        change = random.uniform(-60, 120) if metric.primary else random.uniform(-30, 60)
                        mean_value = 300 + change
                    
                    std_dev = 90
                    se = std_dev / np.sqrt(sample_size)
                    ci_lower = mean_value - 1.96 * se
                    ci_upper = mean_value + 1.96 * se
                    
                    if not variant.is_control:
                        t_stat = abs(mean_value - 300) / np.sqrt(2 * (std_dev**2) / sample_size)
                        p_value = 2 * (1 - stats.t.cdf(t_stat, df=2*sample_size-2))
                        is_significant = p_value < 0.05
                        uplift = (mean_value - 300) / 300
                    else:
                        p_value = 1.0
                        is_significant = False
                        uplift = 0.0
                    
                    result = ExperimentResult(
                        variant_id=variant.id,
                        metric_id=metric.id,
                        sample_size=sample_size,
                        mean_value=mean_value,
                        std_dev=std_dev,
                        confidence_interval=(ci_lower, ci_upper),
                        p_value=p_value,
                        is_significant=is_significant,
                        uplift=uplift
                    )
                
                experiment.results[variant.id][metric.id] = result
    
    async def create_experiment(self, experiment_data: Dict[str, Any]) -> Experiment:
        """Create a new experiment"""
        experiment = Experiment(
            id=str(uuid.uuid4()),
            name=experiment_data['name'],
            description=experiment_data['description'],
            hypothesis=experiment_data['hypothesis'],
            variants=[Variant(**v) for v in experiment_data['variants']],
            metrics=[Metric(**m) for m in experiment_data['metrics']],
            allocation_strategy=AllocationStrategy(experiment_data.get('allocation_strategy', 'random')),
            traffic_percentage=experiment_data.get('traffic_percentage', 100.0),
            min_sample_size=experiment_data['min_sample_size'],
            max_duration_days=experiment_data['max_duration_days'],
            status=ExperimentStatus.DRAFT,
            created_at=datetime.now()
        )
        
        self.experiments[experiment.id] = experiment
        logger.info(f"Created experiment: {experiment.id}")
        
        return experiment
    
    async def start_experiment(self, experiment_id: str) -> bool:
        """Start an experiment"""
        if experiment_id not in self.experiments:
            return False
        
        experiment = self.experiments[experiment_id]
        if experiment.status != ExperimentStatus.DRAFT:
            return False
        
        experiment.status = ExperimentStatus.RUNNING
        experiment.started_at = datetime.now()
        
        logger.info(f"Started experiment: {experiment_id}")
        return True
    
    async def stop_experiment(self, experiment_id: str) -> bool:
        """Stop an experiment"""
        if experiment_id not in self.experiments:
            return False
        
        experiment = self.experiments[experiment_id]
        if experiment.status != ExperimentStatus.RUNNING:
            return False
        
        experiment.status = ExperimentStatus.COMPLETED
        experiment.ended_at = datetime.now()
        
        # Calculate final results
        await self._calculate_results(experiment_id)
        
        logger.info(f"Stopped experiment: {experiment_id}")
        return True
    
    async def get_variant_assignment(self, experiment_id: str, user_id: str) -> Optional[str]:
        """Get variant assignment for a user"""
        if experiment_id not in self.experiments:
            return None
        
        experiment = self.experiments[experiment_id]
        
        # Check if experiment is running
        if experiment.status != ExperimentStatus.RUNNING:
            return None
        
        # Check traffic percentage
        if random.random() * 100 > experiment.traffic_percentage:
            return None
        
        # Check if user already assigned
        if user_id in self.assignments and experiment_id in self.assignments[user_id]:
            return self.assignments[user_id][experiment_id]
        
        # Assign variant based on strategy
        variant_id = self._assign_variant(experiment, user_id)
        
        # Store assignment
        self.assignments[user_id][experiment_id] = variant_id
        
        return variant_id
    
    def _assign_variant(self, experiment: Experiment, user_id: str) -> str:
        """Assign variant based on allocation strategy"""
        if experiment.allocation_strategy == AllocationStrategy.RANDOM:
            # Random assignment
            return random.choice([v.id for v in experiment.variants])
        
        elif experiment.allocation_strategy == AllocationStrategy.WEIGHTED:
            # Weighted random assignment
            weights = [v.weight for v in experiment.variants]
            total_weight = sum(weights)
            normalized_weights = [w / total_weight for w in weights]
            
            return np.random.choice(
                [v.id for v in experiment.variants],
                p=normalized_weights
            )
        
        elif experiment.allocation_strategy == AllocationStrategy.ADAPTIVE:
            # Multi-armed bandit (Thompson sampling)
            # Simplified implementation
            best_score = -1
            best_variant = experiment.variants[0].id
            
            for variant in experiment.variants:
                # Get current performance
                results = experiment.results.get(variant.id, {})
                primary_metric = next((m for m in experiment.metrics if m.primary), None)
                
                if primary_metric and primary_metric.id in results:
                    result = results[primary_metric.id]
                    # Thompson sampling with Beta distribution
                    alpha = result.conversions + 1
                    beta = result.sample_size - result.conversions + 1
                    score = np.random.beta(alpha, beta)
                else:
                    # No data yet, use uniform prior
                    score = np.random.beta(1, 1)
                
                if score > best_score:
                    best_score = score
                    best_variant = variant.id
            
            return best_variant
        
        # Default to first variant
        return experiment.variants[0].id
    
    async def track_event(self, experiment_id: str, user_id: str, 
                         metric_id: str, value: Any = 1):
        """Track an event for a metric"""
        if experiment_id not in self.experiments:
            return
        
        # Get user's variant
        variant_id = None
        if user_id in self.assignments and experiment_id in self.assignments[user_id]:
            variant_id = self.assignments[user_id][experiment_id]
        
        if not variant_id:
            return
        
        # Store event
        self.events[experiment_id][variant_id][metric_id].append({
            'user_id': user_id,
            'value': value,
            'timestamp': datetime.now()
        })
    
    async def _calculate_results(self, experiment_id: str):
        """Calculate experiment results"""
        if experiment_id not in self.experiments:
            return
        
        experiment = self.experiments[experiment_id]
        
        # Get control variant
        control_variant = next((v for v in experiment.variants if v.is_control), None)
        if not control_variant:
            control_variant = experiment.variants[0]
        
        for variant in experiment.variants:
            experiment.results[variant.id] = {}
            
            for metric in experiment.metrics:
                events = self.events[experiment_id][variant.id][metric.id]
                
                if not events:
                    # No data
                    result = ExperimentResult(
                        variant_id=variant.id,
                        metric_id=metric.id,
                        sample_size=0
                    )
                else:
                    # Calculate based on metric type
                    sample_size = len(set(e['user_id'] for e in events))
                    
                    if metric.type == "conversion":
                        conversions = len(set(e['user_id'] for e in events if e['value'] == 1))
                        conversion_rate = conversions / sample_size if sample_size > 0 else 0
                        
                        # Standard error
                        se = np.sqrt(conversion_rate * (1 - conversion_rate) / sample_size) if sample_size > 0 else 0
                        
                        result = ExperimentResult(
                            variant_id=variant.id,
                            metric_id=metric.id,
                            sample_size=sample_size,
                            conversions=conversions,
                            conversion_rate=conversion_rate,
                            std_dev=se,
                            confidence_interval=(
                                conversion_rate - 1.96 * se,
                                conversion_rate + 1.96 * se
                            )
                        )
                    
                    elif metric.type in ["numeric", "duration"]:
                        values = [e['value'] for e in events]
                        mean_value = np.mean(values)
                        std_dev = np.std(values)
                        se = std_dev / np.sqrt(sample_size)
                        
                        result = ExperimentResult(
                            variant_id=variant.id,
                            metric_id=metric.id,
                            sample_size=sample_size,
                            mean_value=mean_value,
                            std_dev=std_dev,
                            confidence_interval=(
                                mean_value - 1.96 * se,
                                mean_value + 1.96 * se
                            )
                        )
                    
                    # Calculate p-value and uplift if not control
                    if variant.id != control_variant.id and control_variant.id in experiment.results:
                        control_result = experiment.results[control_variant.id].get(metric.id)
                        
                        if control_result and control_result.sample_size > 0:
                            if metric.type == "conversion":
                                # Chi-square test
                                n1, n2 = result.sample_size, control_result.sample_size
                                p1, p2 = result.conversion_rate, control_result.conversion_rate
                                p_pooled = (result.conversions + control_result.conversions) / (n1 + n2)
                                
                                se_pooled = np.sqrt(p_pooled * (1 - p_pooled) * (1/n1 + 1/n2))
                                z_score = (p1 - p2) / se_pooled if se_pooled > 0 else 0
                                
                                result.p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
                                result.uplift = (p1 - p2) / p2 if p2 > 0 else 0
                            
                            else:
                                # T-test
                                t_stat, p_value = stats.ttest_ind_from_stats(
                                    result.mean_value, result.std_dev, result.sample_size,
                                    control_result.mean_value, control_result.std_dev, control_result.sample_size
                                )
                                
                                result.p_value = p_value
                                result.uplift = (result.mean_value - control_result.mean_value) / \
                                              control_result.mean_value if control_result.mean_value != 0 else 0
                            
                            result.is_significant = result.p_value < 0.05
                
                experiment.results[variant.id][metric.id] = result
    
    async def get_experiment_status(self, experiment_id: str) -> Dict[str, Any]:
        """Get detailed experiment status"""
        if experiment_id not in self.experiments:
            return {"error": "Experiment not found"}
        
        experiment = self.experiments[experiment_id]
        
        # Calculate progress
        total_sample_size = sum(
            result.sample_size
            for variant_results in experiment.results.values()
            for result in variant_results.values()
        ) // len(experiment.metrics)  # Average across metrics
        
        progress = min(100, (total_sample_size / experiment.min_sample_size) * 100)
        
        # Check if should auto-complete
        if experiment.status == ExperimentStatus.RUNNING:
            days_running = (datetime.now() - experiment.started_at).days
            if days_running >= experiment.max_duration_days or progress >= 100:
                await self.stop_experiment(experiment_id)
        
        return {
            "experiment": asdict(experiment),
            "progress": progress,
            "days_running": (datetime.now() - experiment.started_at).days if experiment.started_at else 0,
            "total_participants": total_sample_size
        }
    
    def get_all_experiments(self) -> List[Dict[str, Any]]:
        """Get all experiments"""
        experiments = []
        
        for exp_id, experiment in self.experiments.items():
            # Basic info
            exp_dict = {
                "id": experiment.id,
                "name": experiment.name,
                "status": experiment.status.value,
                "created_at": experiment.created_at.isoformat(),
                "started_at": experiment.started_at.isoformat() if experiment.started_at else None,
                "ended_at": experiment.ended_at.isoformat() if experiment.ended_at else None,
                "variants_count": len(experiment.variants),
                "metrics_count": len(experiment.metrics)
            }
            
            # Add results summary if available
            if experiment.results:
                primary_metric = next((m for m in experiment.metrics if m.primary), experiment.metrics[0])
                
                # Find winning variant
                best_variant = None
                best_uplift = 0
                
                for variant in experiment.variants:
                    if variant.is_control:
                        continue
                    
                    result = experiment.results.get(variant.id, {}).get(primary_metric.id)
                    if result and result.is_significant and result.uplift > best_uplift:
                        best_variant = variant
                        best_uplift = result.uplift
                
                exp_dict["has_winner"] = best_variant is not None
                exp_dict["winning_variant"] = best_variant.name if best_variant else None
                exp_dict["winning_uplift"] = best_uplift
            
            experiments.append(exp_dict)
        
        return experiments

# Global A/B testing instance
ab_testing = ABTestingFramework()