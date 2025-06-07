from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from modules.core.auth_dependency import get_current_admin_user
from modules.auth.user_model import User
from modules.analytics import (
    predictive_analytics,
    PredictionType
)

router = APIRouter(prefix="/api/admin/analytics", tags=["admin-analytics"])

@router.get("/metrics")
async def get_available_metrics(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get available metrics for prediction"""
    metrics = [
        {
            'id': metric.value,
            'name': metric.value.replace('_', ' ').title(),
            'description': f'Predictive analytics for {metric.value.replace("_", " ")}',
            'has_data': metric in predictive_analytics.historical_data
        }
        for metric in PredictionType
    ]
    
    return {
        'success': True,
        'metrics': metrics
    }

@router.get("/predict/{metric}")
async def get_predictions(
    metric: str,
    horizon_hours: int = Query(24, ge=1, le=168, description="Prediction horizon in hours"),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get predictions for a specific metric"""
    try:
        # Parse metric type
        try:
            metric_type = PredictionType(metric)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid metric: {metric}"
            )
        
        # Generate predictions
        report = await predictive_analytics.predict(
            metric_type,
            horizon_hours
        )
        
        # Convert to response format
        predictions_data = [
            {
                'timestamp': pred.timestamp.isoformat(),
                'value': pred.value,
                'confidence': pred.confidence,
                'lower_bound': pred.lower_bound,
                'upper_bound': pred.upper_bound
            }
            for pred in report.predictions
        ]
        
        anomalies_data = [
            {
                'timestamp': anomaly.timestamp.isoformat(),
                'type': anomaly.type.value,
                'severity': anomaly.severity,
                'value': anomaly.value,
                'expected_value': anomaly.expected_value,
                'deviation': anomaly.deviation,
                'message': anomaly.message
            }
            for anomaly in report.anomalies
        ]
        
        return {
            'success': True,
            'report': {
                'metric': report.metric.value,
                'current_value': report.current_value,
                'predictions': predictions_data,
                'trend': {
                    'direction': report.trend.direction,
                    'slope': report.trend.slope,
                    'r_squared': report.trend.r_squared,
                    'change_percent': report.trend.change_percent
                },
                'anomalies': anomalies_data,
                'recommendations': report.recommendations,
                'generated_at': report.generated_at.isoformat()
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/historical/{metric}")
async def get_historical_data(
    metric: str,
    days: int = Query(7, ge=1, le=90, description="Number of days of historical data"),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get historical data for a metric"""
    try:
        # Parse metric type
        try:
            metric_type = PredictionType(metric)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid metric: {metric}"
            )
        
        if metric_type not in predictive_analytics.historical_data:
            raise HTTPException(
                status_code=404,
                detail=f"No historical data for metric: {metric}"
            )
        
        # Get historical data
        df = predictive_analytics.historical_data[metric_type]
        
        # Filter by date range
        cutoff_date = datetime.now() - timedelta(days=days)
        filtered_df = df[df['timestamp'] > cutoff_date]
        
        # Convert to response format
        data_points = [
            {
                'timestamp': row['timestamp'].isoformat(),
                'value': row['value']
            }
            for _, row in filtered_df.iterrows()
        ]
        
        # Get summary statistics
        summary = predictive_analytics.get_metric_summary(metric_type)
        
        return {
            'success': True,
            'metric': metric,
            'data': data_points,
            'summary': summary,
            'total_points': len(data_points)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add-data/{metric}")
async def add_data_point(
    metric: str,
    value: float,
    timestamp: Optional[datetime] = None,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Add a new data point for a metric"""
    try:
        # Parse metric type
        try:
            metric_type = PredictionType(metric)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid metric: {metric}"
            )
        
        # Add data point
        await predictive_analytics.add_data_point(
            metric_type,
            value,
            timestamp
        )
        
        return {
            'success': True,
            'message': f'Data point added for {metric}'
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alert")
async def create_alert(
    metric: str,
    threshold: float,
    comparison: str = Query('greater', regex='^(greater|less)$'),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Create an alert for a metric threshold"""
    try:
        # Parse metric type
        try:
            metric_type = PredictionType(metric)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid metric: {metric}"
            )
        
        # Generate alert
        alert = await predictive_analytics.generate_alert(
            metric_type,
            threshold,
            comparison
        )
        
        if alert:
            return {
                'success': True,
                'alert': alert
            }
        else:
            return {
                'success': True,
                'alert': None,
                'message': f'No alert triggered. {metric} is not predicted to {comparison} {threshold}'
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
async def get_analytics_dashboard(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get analytics dashboard data"""
    try:
        dashboard_data = {
            'metrics': {},
            'alerts': [],
            'recent_anomalies': []
        }
        
        # Get data for each metric
        for metric_type in PredictionType:
            if metric_type in predictive_analytics.historical_data:
                # Get current value and trend
                summary = predictive_analytics.get_metric_summary(metric_type)
                report = await predictive_analytics.predict(metric_type, horizon_hours=6)
                
                dashboard_data['metrics'][metric_type.value] = {
                    'current': summary.get('current', 0),
                    'trend': report.trend.direction,
                    'change_percent': report.trend.change_percent,
                    'has_anomalies': len(report.anomalies) > 0
                }
                
                # Add recent anomalies
                for anomaly in report.anomalies[:2]:  # Top 2 anomalies per metric
                    dashboard_data['recent_anomalies'].append({
                        'metric': metric_type.value,
                        'timestamp': anomaly.timestamp.isoformat(),
                        'type': anomaly.type.value,
                        'severity': anomaly.severity,
                        'message': anomaly.message
                    })
        
        # Check for alerts (example thresholds)
        alert_configs = [
            (PredictionType.SYSTEM_LOAD, 80, 'greater'),
            (PredictionType.ERROR_RATE, 0.1, 'greater'),
            (PredictionType.RESPONSE_TIME, 500, 'greater'),
            (PredictionType.STORAGE_USAGE, 90, 'greater')
        ]
        
        for metric_type, threshold, comparison in alert_configs:
            alert = await predictive_analytics.generate_alert(
                metric_type, threshold, comparison
            )
            if alert:
                dashboard_data['alerts'].append(alert)
        
        # Sort anomalies by severity
        dashboard_data['recent_anomalies'].sort(
            key=lambda x: x['severity'], 
            reverse=True
        )
        
        return {
            'success': True,
            'dashboard': dashboard_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations")
async def get_all_recommendations(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get recommendations for all metrics"""
    try:
        all_recommendations = []
        
        for metric_type in PredictionType:
            if metric_type in predictive_analytics.historical_data:
                report = await predictive_analytics.predict(metric_type, horizon_hours=24)
                
                for rec in report.recommendations:
                    all_recommendations.append({
                        'metric': metric_type.value,
                        'recommendation': rec,
                        'trend': report.trend.direction,
                        'severity': 'high' if report.trend.change_percent > 30 else 'medium'
                    })
        
        # Sort by severity
        all_recommendations.sort(
            key=lambda x: 0 if x['severity'] == 'high' else 1
        )
        
        return {
            'success': True,
            'recommendations': all_recommendations[:10]  # Top 10 recommendations
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))