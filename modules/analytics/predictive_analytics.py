import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import json
from collections import defaultdict
import asyncio
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class PredictionType(Enum):
    USER_ACTIVITY = "user_activity"
    SYSTEM_LOAD = "system_load"
    ERROR_RATE = "error_rate"
    RESPONSE_TIME = "response_time"
    STORAGE_USAGE = "storage_usage"
    FEEDBACK_SCORE = "feedback_score"
    DOCUMENT_VOLUME = "document_volume"

class AnomalyType(Enum):
    SPIKE = "spike"
    DROP = "drop"
    PATTERN_CHANGE = "pattern_change"
    THRESHOLD_BREACH = "threshold_breach"

@dataclass
class Prediction:
    """Single prediction result"""
    timestamp: datetime
    value: float
    confidence: float
    lower_bound: float
    upper_bound: float
    
@dataclass
class Trend:
    """Trend analysis result"""
    direction: str  # 'increasing', 'decreasing', 'stable'
    slope: float
    r_squared: float
    change_percent: float
    
@dataclass
class Anomaly:
    """Detected anomaly"""
    timestamp: datetime
    type: AnomalyType
    severity: float  # 0-1
    value: float
    expected_value: float
    deviation: float
    message: str

@dataclass
class PredictiveReport:
    """Complete predictive analytics report"""
    metric: PredictionType
    current_value: float
    predictions: List[Prediction]
    trend: Trend
    anomalies: List[Anomaly]
    recommendations: List[str]
    generated_at: datetime

class PredictiveAnalytics:
    """Predictive analytics engine with ML-based forecasting"""
    
    def __init__(self):
        # Historical data storage
        self.historical_data: Dict[PredictionType, pd.DataFrame] = {}
        
        # Model cache
        self.models: Dict[PredictionType, Any] = {}
        
        # Anomaly detection thresholds
        self.anomaly_thresholds = {
            PredictionType.USER_ACTIVITY: {'z_score': 2.5, 'min_deviation': 0.3},
            PredictionType.SYSTEM_LOAD: {'z_score': 2.0, 'min_deviation': 0.25},
            PredictionType.ERROR_RATE: {'z_score': 2.0, 'min_deviation': 0.5},
            PredictionType.RESPONSE_TIME: {'z_score': 2.5, 'min_deviation': 0.4},
            PredictionType.STORAGE_USAGE: {'z_score': 3.0, 'min_deviation': 0.2},
            PredictionType.FEEDBACK_SCORE: {'z_score': 2.0, 'min_deviation': 0.3},
            PredictionType.DOCUMENT_VOLUME: {'z_score': 2.5, 'min_deviation': 0.35}
        }
        
        # Initialize with demo data
        self._initialize_demo_data()
    
    def _initialize_demo_data(self):
        """Initialize with realistic demo data"""
        # Generate time series for last 30 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        date_range = pd.date_range(start_date, end_date, freq='H')
        
        # User activity pattern (daily cycles with weekly trend)
        user_activity = []
        for i, timestamp in enumerate(date_range):
            hour = timestamp.hour
            day_of_week = timestamp.weekday()
            
            # Base activity level
            base = 50
            
            # Hourly pattern (peak during business hours)
            if 9 <= hour <= 17:
                hourly_factor = 1.5 + 0.3 * np.sin((hour - 9) * np.pi / 8)
            elif 18 <= hour <= 22:
                hourly_factor = 1.2
            else:
                hourly_factor = 0.3
            
            # Weekly pattern (lower on weekends)
            weekly_factor = 1.0 if day_of_week < 5 else 0.6
            
            # Trend (gradual increase)
            trend_factor = 1.0 + (i / len(date_range)) * 0.2
            
            # Add some noise
            noise = np.random.normal(0, 5)
            
            value = base * hourly_factor * weekly_factor * trend_factor + noise
            user_activity.append(max(0, value))
        
        self.historical_data[PredictionType.USER_ACTIVITY] = pd.DataFrame({
            'timestamp': date_range,
            'value': user_activity
        })
        
        # System load (correlated with user activity)
        system_load = []
        for i, activity in enumerate(user_activity):
            base_load = 30
            load = base_load + activity * 0.4 + np.random.normal(0, 3)
            # Add occasional spikes
            if np.random.random() < 0.05:
                load *= 1.5
            system_load.append(min(100, max(0, load)))
        
        self.historical_data[PredictionType.SYSTEM_LOAD] = pd.DataFrame({
            'timestamp': date_range,
            'value': system_load
        })
        
        # Error rate (inverse correlation with time of day)
        error_rates = []
        for timestamp in date_range:
            hour = timestamp.hour
            # Lower error rates during business hours
            if 9 <= hour <= 17:
                base_rate = 0.02
            else:
                base_rate = 0.05
            
            # Add random variations
            rate = base_rate + np.random.exponential(0.01)
            # Occasional error spikes
            if np.random.random() < 0.02:
                rate *= 5
            
            error_rates.append(min(0.2, rate))
        
        self.historical_data[PredictionType.ERROR_RATE] = pd.DataFrame({
            'timestamp': date_range,
            'value': error_rates
        })
        
        # Response time (correlated with system load)
        response_times = []
        for load in system_load:
            base_time = 200  # ms
            time = base_time + load * 2 + np.random.normal(0, 20)
            response_times.append(max(50, time))
        
        self.historical_data[PredictionType.RESPONSE_TIME] = pd.DataFrame({
            'timestamp': date_range,
            'value': response_times
        })
        
        # Storage usage (gradual increase with daily variations)
        storage_usage = []
        base_storage = 50  # GB
        for i, timestamp in enumerate(date_range):
            # Linear growth
            growth = i * 0.1
            # Daily variations
            daily_var = 2 * np.sin(timestamp.hour * np.pi / 12)
            usage = base_storage + growth + daily_var + np.random.normal(0, 0.5)
            storage_usage.append(max(0, usage))
        
        self.historical_data[PredictionType.STORAGE_USAGE] = pd.DataFrame({
            'timestamp': date_range,
            'value': storage_usage
        })
        
        # Feedback score (weekly patterns)
        feedback_scores = []
        for timestamp in date_range:
            day_of_week = timestamp.weekday()
            # Better scores on weekdays
            if day_of_week < 5:
                base_score = 4.2
            else:
                base_score = 3.8
            
            score = base_score + np.random.normal(0, 0.3)
            feedback_scores.append(min(5.0, max(1.0, score)))
        
        self.historical_data[PredictionType.FEEDBACK_SCORE] = pd.DataFrame({
            'timestamp': date_range,
            'value': feedback_scores
        })
        
        # Document volume (business hours pattern)
        doc_volumes = []
        for timestamp in date_range:
            hour = timestamp.hour
            day_of_week = timestamp.weekday()
            
            if day_of_week < 5 and 9 <= hour <= 17:
                base_volume = 100
            else:
                base_volume = 20
            
            volume = base_volume + np.random.poisson(10)
            doc_volumes.append(volume)
        
        self.historical_data[PredictionType.DOCUMENT_VOLUME] = pd.DataFrame({
            'timestamp': date_range,
            'value': doc_volumes
        })
    
    async def add_data_point(self, metric: PredictionType, value: float, 
                           timestamp: Optional[datetime] = None):
        """Add a new data point for a metric"""
        if timestamp is None:
            timestamp = datetime.now()
        
        new_data = pd.DataFrame({
            'timestamp': [timestamp],
            'value': [value]
        })
        
        if metric in self.historical_data:
            self.historical_data[metric] = pd.concat([
                self.historical_data[metric], 
                new_data
            ], ignore_index=True)
            
            # Keep only last 90 days
            cutoff_date = datetime.now() - timedelta(days=90)
            self.historical_data[metric] = self.historical_data[metric][
                self.historical_data[metric]['timestamp'] > cutoff_date
            ]
        else:
            self.historical_data[metric] = new_data
        
        # Invalidate cached model
        if metric in self.models:
            del self.models[metric]
    
    async def predict(self, metric: PredictionType, 
                     horizon_hours: int = 24) -> PredictiveReport:
        """Generate predictions for a metric"""
        if metric not in self.historical_data:
            raise ValueError(f"No historical data for metric: {metric}")
        
        df = self.historical_data[metric].copy()
        
        # Prepare features
        df = self._prepare_features(df)
        
        # Train or get cached model
        model = self._get_or_train_model(metric, df)
        
        # Generate predictions
        predictions = self._generate_predictions(
            model, df, horizon_hours
        )
        
        # Analyze trend
        trend = self._analyze_trend(df)
        
        # Detect anomalies
        anomalies = self._detect_anomalies(metric, df)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            metric, predictions, trend, anomalies
        )
        
        # Current value
        current_value = df['value'].iloc[-1] if len(df) > 0 else 0
        
        return PredictiveReport(
            metric=metric,
            current_value=current_value,
            predictions=predictions,
            trend=trend,
            anomalies=anomalies,
            recommendations=recommendations,
            generated_at=datetime.now()
        )
    
    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for modeling"""
        df = df.sort_values('timestamp').reset_index(drop=True)
        
        # Extract time-based features
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['day_of_month'] = df['timestamp'].dt.day
        df['week_of_year'] = df['timestamp'].dt.isocalendar().week
        
        # Cyclical encoding for time features
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        
        # Lag features
        for lag in [1, 6, 12, 24]:  # 1h, 6h, 12h, 24h lags
            df[f'lag_{lag}'] = df['value'].shift(lag)
        
        # Rolling statistics
        for window in [6, 12, 24]:
            df[f'rolling_mean_{window}'] = df['value'].rolling(window).mean()
            df[f'rolling_std_{window}'] = df['value'].rolling(window).std()
        
        # Drop rows with NaN values from feature engineering
        df = df.dropna()
        
        return df
    
    def _get_or_train_model(self, metric: PredictionType, 
                           df: pd.DataFrame) -> Any:
        """Get cached model or train new one"""
        if metric in self.models:
            return self.models[metric]
        
        # Feature columns
        feature_cols = [
            'hour_sin', 'hour_cos', 'dow_sin', 'dow_cos',
            'lag_1', 'lag_6', 'lag_12', 'lag_24',
            'rolling_mean_6', 'rolling_mean_12', 'rolling_mean_24',
            'rolling_std_6', 'rolling_std_12', 'rolling_std_24'
        ]
        
        X = df[feature_cols].values
        y = df['value'].values
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train model (using Linear Regression for simplicity)
        model = LinearRegression()
        model.fit(X_scaled, y)
        
        # Cache model and scaler
        self.models[metric] = {
            'model': model,
            'scaler': scaler,
            'feature_cols': feature_cols
        }
        
        return self.models[metric]
    
    def _generate_predictions(self, model_dict: Dict[str, Any], 
                            df: pd.DataFrame, 
                            horizon_hours: int) -> List[Prediction]:
        """Generate future predictions"""
        predictions = []
        model = model_dict['model']
        scaler = model_dict['scaler']
        feature_cols = model_dict['feature_cols']
        
        # Start from last timestamp
        last_timestamp = df['timestamp'].iloc[-1]
        
        # Use last known values for lag features
        last_values = df['value'].tail(24).tolist()
        
        for h in range(1, horizon_hours + 1):
            pred_timestamp = last_timestamp + timedelta(hours=h)
            
            # Create feature vector
            features = {
                'hour_sin': np.sin(2 * np.pi * pred_timestamp.hour / 24),
                'hour_cos': np.cos(2 * np.pi * pred_timestamp.hour / 24),
                'dow_sin': np.sin(2 * np.pi * pred_timestamp.weekday() / 7),
                'dow_cos': np.cos(2 * np.pi * pred_timestamp.weekday() / 7)
            }
            
            # Lag features
            for lag in [1, 6, 12, 24]:
                if lag <= len(last_values):
                    features[f'lag_{lag}'] = last_values[-lag]
                else:
                    features[f'lag_{lag}'] = np.mean(last_values)
            
            # Rolling statistics
            for window in [6, 12, 24]:
                window_values = last_values[-window:] if len(last_values) >= window else last_values
                features[f'rolling_mean_{window}'] = np.mean(window_values)
                features[f'rolling_std_{window}'] = np.std(window_values) if len(window_values) > 1 else 0
            
            # Create feature array
            X_pred = np.array([[features[col] for col in feature_cols]])
            X_pred_scaled = scaler.transform(X_pred)
            
            # Make prediction
            pred_value = model.predict(X_pred_scaled)[0]
            
            # Calculate confidence intervals (simplified)
            confidence = 0.9 - (h / horizon_hours) * 0.3  # Decreasing confidence
            std_dev = np.std(last_values) * (1 + h / horizon_hours)
            
            prediction = Prediction(
                timestamp=pred_timestamp,
                value=pred_value,
                confidence=confidence,
                lower_bound=pred_value - 1.96 * std_dev,
                upper_bound=pred_value + 1.96 * std_dev
            )
            
            predictions.append(prediction)
            
            # Update last values for next prediction
            last_values.append(pred_value)
            if len(last_values) > 24:
                last_values.pop(0)
        
        return predictions
    
    def _analyze_trend(self, df: pd.DataFrame) -> Trend:
        """Analyze trend in historical data"""
        if len(df) < 2:
            return Trend(
                direction='stable',
                slope=0,
                r_squared=0,
                change_percent=0
            )
        
        # Use last 7 days for trend analysis
        recent_data = df.tail(24 * 7)
        
        # Linear regression on time series
        X = np.arange(len(recent_data)).reshape(-1, 1)
        y = recent_data['value'].values
        
        model = LinearRegression()
        model.fit(X, y)
        
        slope = model.coef_[0]
        r_squared = model.score(X, y)
        
        # Calculate percentage change
        first_value = recent_data['value'].iloc[0]
        last_value = recent_data['value'].iloc[-1]
        change_percent = ((last_value - first_value) / first_value) * 100 if first_value != 0 else 0
        
        # Determine direction
        if abs(slope) < 0.01:
            direction = 'stable'
        elif slope > 0:
            direction = 'increasing'
        else:
            direction = 'decreasing'
        
        return Trend(
            direction=direction,
            slope=slope,
            r_squared=r_squared,
            change_percent=change_percent
        )
    
    def _detect_anomalies(self, metric: PredictionType, 
                         df: pd.DataFrame) -> List[Anomaly]:
        """Detect anomalies in historical data"""
        anomalies = []
        
        if len(df) < 24:  # Need at least 24 hours of data
            return anomalies
        
        thresholds = self.anomaly_thresholds[metric]
        z_threshold = thresholds['z_score']
        min_deviation = thresholds['min_deviation']
        
        # Calculate rolling statistics
        window = 24  # 24-hour window
        df['rolling_mean'] = df['value'].rolling(window, center=True).mean()
        df['rolling_std'] = df['value'].rolling(window, center=True).std()
        
        # Calculate z-scores
        df['z_score'] = (df['value'] - df['rolling_mean']) / df['rolling_std']
        
        # Detect anomalies
        for idx, row in df.iterrows():
            if pd.isna(row['z_score']):
                continue
            
            z_score_abs = abs(row['z_score'])
            
            if z_score_abs > z_threshold:
                deviation = abs(row['value'] - row['rolling_mean']) / row['rolling_mean']
                
                if deviation > min_deviation:
                    # Determine anomaly type
                    if row['z_score'] > 0:
                        anomaly_type = AnomalyType.SPIKE
                        message = f"Unusual spike detected: {row['value']:.2f} (expected: {row['rolling_mean']:.2f})"
                    else:
                        anomaly_type = AnomalyType.DROP
                        message = f"Unusual drop detected: {row['value']:.2f} (expected: {row['rolling_mean']:.2f})"
                    
                    anomaly = Anomaly(
                        timestamp=row['timestamp'],
                        type=anomaly_type,
                        severity=min(1.0, z_score_abs / (z_threshold * 2)),
                        value=row['value'],
                        expected_value=row['rolling_mean'],
                        deviation=deviation,
                        message=message
                    )
                    
                    anomalies.append(anomaly)
        
        # Keep only recent anomalies (last 7 days)
        cutoff_date = datetime.now() - timedelta(days=7)
        anomalies = [a for a in anomalies if a.timestamp > cutoff_date]
        
        # Sort by severity
        anomalies.sort(key=lambda x: x.severity, reverse=True)
        
        return anomalies[:10]  # Return top 10 anomalies
    
    def _generate_recommendations(self, metric: PredictionType,
                                predictions: List[Prediction],
                                trend: Trend,
                                anomalies: List[Anomaly]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Trend-based recommendations
        if trend.direction == 'increasing' and trend.change_percent > 20:
            if metric == PredictionType.USER_ACTIVITY:
                recommendations.append(
                    f"User activity is increasing rapidly ({trend.change_percent:.1f}% over last week). "
                    "Consider scaling up resources to handle increased load."
                )
            elif metric == PredictionType.ERROR_RATE:
                recommendations.append(
                    f"Error rate is trending upward ({trend.change_percent:.1f}% increase). "
                    "Investigate root causes and implement fixes immediately."
                )
            elif metric == PredictionType.STORAGE_USAGE:
                recommendations.append(
                    f"Storage usage is growing rapidly ({trend.change_percent:.1f}% increase). "
                    "Plan for capacity expansion or implement data archiving."
                )
        
        elif trend.direction == 'decreasing' and trend.change_percent < -20:
            if metric == PredictionType.USER_ACTIVITY:
                recommendations.append(
                    f"User activity is declining ({abs(trend.change_percent):.1f}% decrease). "
                    "Review user engagement strategies and check for technical issues."
                )
            elif metric == PredictionType.FEEDBACK_SCORE:
                recommendations.append(
                    f"Feedback scores are dropping ({abs(trend.change_percent):.1f}% decrease). "
                    "Analyze negative feedback and implement improvements."
                )
        
        # Prediction-based recommendations
        if predictions:
            # Check if any predictions exceed thresholds
            max_predicted = max(p.value for p in predictions[:12])  # Next 12 hours
            
            if metric == PredictionType.SYSTEM_LOAD and max_predicted > 80:
                recommendations.append(
                    f"System load is predicted to reach {max_predicted:.1f}% in the next 12 hours. "
                    "Prepare for high load by scaling resources or optimizing performance."
                )
            elif metric == PredictionType.RESPONSE_TIME and max_predicted > 500:
                recommendations.append(
                    f"Response times may exceed {max_predicted:.0f}ms. "
                    "Optimize database queries and consider caching strategies."
                )
        
        # Anomaly-based recommendations
        if anomalies:
            high_severity_anomalies = [a for a in anomalies if a.severity > 0.7]
            
            if len(high_severity_anomalies) > 3:
                recommendations.append(
                    f"Multiple high-severity anomalies detected ({len(high_severity_anomalies)} in last week). "
                    "Conduct thorough system health check and review monitoring alerts."
                )
            
            # Specific anomaly recommendations
            for anomaly in anomalies[:2]:  # Top 2 anomalies
                if anomaly.type == AnomalyType.SPIKE:
                    if metric == PredictionType.ERROR_RATE:
                        recommendations.append(
                            f"Error spike detected on {anomaly.timestamp.strftime('%Y-%m-%d %H:%M')}. "
                            "Review error logs and implement preventive measures."
                        )
                    elif metric == PredictionType.RESPONSE_TIME:
                        recommendations.append(
                            f"Response time spike on {anomaly.timestamp.strftime('%Y-%m-%d %H:%M')}. "
                            "Investigate performance bottlenecks during that period."
                        )
        
        # General optimization recommendations
        if not recommendations:
            if metric == PredictionType.USER_ACTIVITY:
                recommendations.append(
                    "User activity patterns are stable. Monitor for seasonal changes."
                )
            elif metric == PredictionType.SYSTEM_LOAD:
                recommendations.append(
                    "System load is within normal parameters. Continue routine monitoring."
                )
        
        return recommendations[:5]  # Return top 5 recommendations
    
    async def generate_alert(self, metric: PredictionType,
                           threshold: float,
                           comparison: str = 'greater') -> Optional[Dict[str, Any]]:
        """Generate alert if predictions exceed threshold"""
        report = await self.predict(metric, horizon_hours=6)
        
        triggered = False
        trigger_time = None
        predicted_value = None
        
        for prediction in report.predictions:
            if comparison == 'greater' and prediction.value > threshold:
                triggered = True
                trigger_time = prediction.timestamp
                predicted_value = prediction.value
                break
            elif comparison == 'less' and prediction.value < threshold:
                triggered = True
                trigger_time = prediction.timestamp
                predicted_value = prediction.value
                break
        
        if triggered:
            return {
                'alert': True,
                'metric': metric.value,
                'threshold': threshold,
                'predicted_value': predicted_value,
                'trigger_time': trigger_time.isoformat(),
                'confidence': report.predictions[0].confidence,
                'message': f"{metric.value} is predicted to {'exceed' if comparison == 'greater' else 'fall below'} "
                          f"threshold {threshold} at {trigger_time.strftime('%H:%M')} "
                          f"(predicted value: {predicted_value:.2f})"
            }
        
        return None
    
    def get_metric_summary(self, metric: PredictionType) -> Dict[str, Any]:
        """Get summary statistics for a metric"""
        if metric not in self.historical_data:
            return {}
        
        df = self.historical_data[metric]
        values = df['value']
        
        return {
            'metric': metric.value,
            'current': values.iloc[-1] if len(values) > 0 else 0,
            'min': values.min(),
            'max': values.max(),
            'mean': values.mean(),
            'std': values.std(),
            'median': values.median(),
            'percentile_25': values.quantile(0.25),
            'percentile_75': values.quantile(0.75),
            'data_points': len(values),
            'last_updated': df['timestamp'].iloc[-1].isoformat() if len(df) > 0 else None
        }

# Global predictive analytics instance
predictive_analytics = PredictiveAnalytics()