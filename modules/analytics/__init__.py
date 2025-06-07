"""
Analytics Module

Provides predictive analytics and data analysis capabilities.
"""

from .predictive_analytics import (
    PredictiveAnalytics,
    PredictionType,
    AnomalyType,
    Prediction,
    Trend,
    Anomaly,
    PredictiveReport,
    predictive_analytics
)

__all__ = [
    'PredictiveAnalytics',
    'PredictionType',
    'AnomalyType',
    'Prediction',
    'Trend',
    'Anomaly',
    'PredictiveReport',
    'predictive_analytics'
]