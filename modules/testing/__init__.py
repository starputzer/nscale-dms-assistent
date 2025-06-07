"""
Testing Module

Provides A/B testing and experimentation capabilities.
"""

from .ab_testing import (
    ABTestingFramework,
    Experiment,
    Variant,
    Metric,
    ExperimentStatus,
    AllocationStrategy,
    ExperimentResult,
    ab_testing
)

__all__ = [
    'ABTestingFramework',
    'Experiment',
    'Variant',
    'Metric',
    'ExperimentStatus',
    'AllocationStrategy',
    'ExperimentResult',
    'ab_testing'
]