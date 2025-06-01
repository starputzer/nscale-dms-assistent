#!/usr/bin/env python3
"""
Documentation Monitoring Dashboard
Web-based dashboard for viewing documentation health metrics
"""

import os
import json
import sqlite3
import datetime
from pathlib import Path
from flask import Flask, render_template_string, jsonify, request
from typing import Dict, List, Tuple

app = Flask(__name__)

# Configuration
DB_PATH = '/opt/nscale-assist/data/doc_metrics.db'
REPORT_PATH = '/opt/nscale-assist/logs/health_reports'

# HTML Template
DASHBOARD_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>Documentation Monitoring Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 20px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric-card {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
            text-align: center;
        }
        .metric-value {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        .metric-label {
            color: #666;
            font-size: 14px;
        }
        .healthy { color: #28a745; }
        .warning { color: #ffc107; }
        .critical { color: #dc3545; }
        .chart-container {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 20px;
        }
        .alerts-container {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
        }
        .alert-item {
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .alert-critical {
            background-color: #f8d7da;
            color: #721c24;
        }
        .alert-warning {
            background-color: #fff3cd;
            color: #856404;
        }
        .alert-info {
            background-color: #d1ecf1;
            color: #0c5460;
        }
        .timestamp {
            font-size: 12px;
            color: #999;
        }
        .refresh-btn {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
        }
        .refresh-btn:hover {
            background-color: #0056b3;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Documentation Monitoring Dashboard</h1>
            <p>Real-time documentation health metrics and alerts</p>
            <button class="refresh-btn" onclick="refreshData()">Refresh</button>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Documents</div>
                <div class="metric-value" id="total-docs">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Health Score</div>
                <div class="metric-value" id="health-score">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Active Alerts</div>
                <div class="metric-value" id="active-alerts">-</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Documents Updated Today</div>
                <div class="metric-value" id="updated-today">-</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h2>Health Trend (Last 7 Days)</h2>
            <canvas id="health-chart"></canvas>
        </div>
        
        <div class="chart-container">
            <h2>Document Status</h2>
            <canvas id="status-chart"></canvas>
        </div>
        
        <div class="alerts-container">
            <h2>Recent Alerts</h2>
            <div id="alerts-list" class="loading">Loading alerts...</div>
        </div>
        
        <div class="chart-container">
            <h2>Problem Documents</h2>
            <table id="problem-docs-table">
                <thead>
                    <tr>
                        <th>Document</th>
                        <th>Health Score</th>
                        <th>Issues</th>
                        <th>Last Updated</th>
                    </tr>
                </thead>
                <tbody id="problem-docs-body">
                    <tr><td colspan="4" class="loading">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        let healthChart = null;
        let statusChart = null;
        
        function initCharts() {
            // Health trend chart
            const healthCtx = document.getElementById('health-chart').getContext('2d');
            healthChart = new Chart(healthCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Overall Health Score',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
            
            // Status distribution chart
            const statusCtx = document.getElementById('status-chart').getContext('2d');
            statusChart = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Healthy', 'Warning', 'Critical'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: [
                            'rgb(40, 167, 69)',
                            'rgb(255, 193, 7)',
                            'rgb(220, 53, 69)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        async function fetchData() {
            try {
                const response = await fetch('/api/dashboard-data');
                const data = await response.json();
                updateDashboard(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        
        function updateDashboard(data) {
            // Update metrics
            document.getElementById('total-docs').textContent = data.metrics.total_documents;
            document.getElementById('health-score').textContent = data.metrics.health_score.toFixed(1) + '%';
            document.getElementById('active-alerts').textContent = data.metrics.active_alerts;
            document.getElementById('updated-today').textContent = data.metrics.updated_today;
            
            // Update health score color
            const scoreElement = document.getElementById('health-score');
            scoreElement.className = '';
            if (data.metrics.health_score >= 80) {
                scoreElement.classList.add('healthy');
            } else if (data.metrics.health_score >= 60) {
                scoreElement.classList.add('warning');
            } else {
                scoreElement.classList.add('critical');
            }
            
            // Update charts
            if (healthChart) {
                healthChart.data.labels = data.health_trend.labels;
                healthChart.data.datasets[0].data = data.health_trend.scores;
                healthChart.update();
            }
            
            if (statusChart) {
                statusChart.data.datasets[0].data = [
                    data.status_distribution.healthy,
                    data.status_distribution.warning,
                    data.status_distribution.critical
                ];
                statusChart.update();
            }
            
            // Update alerts
            updateAlerts(data.recent_alerts);
            
            // Update problem documents
            updateProblemDocs(data.problem_documents);
        }
        
        function updateAlerts(alerts) {
            const alertsList = document.getElementById('alerts-list');
            
            if (alerts.length === 0) {
                alertsList.innerHTML = '<p>No recent alerts</p>';
                return;
            }
            
            alertsList.innerHTML = alerts.map(alert => `
                <div class="alert-item alert-${alert.severity}">
                    <div>
                        <strong>${alert.type}</strong>: ${alert.message}
                        ${alert.file_path ? `<br><small>${alert.file_path}</small>` : ''}
                    </div>
                    <div class="timestamp">${formatTimestamp(alert.timestamp)}</div>
                </div>
            `).join('');
        }
        
        function updateProblemDocs(docs) {
            const tbody = document.getElementById('problem-docs-body');
            
            if (docs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">No problem documents found</td></tr>';
                return;
            }
            
            tbody.innerHTML = docs.map(doc => `
                <tr>
                    <td>${doc.file_path}</td>
                    <td class="${getHealthClass(doc.quality_score)}">${doc.quality_score.toFixed(1)}</td>
                    <td>${doc.issues_count} issues</td>
                    <td>${formatTimestamp(doc.last_modified)}</td>
                </tr>
            `).join('');
        }
        
        function getHealthClass(score) {
            if (score >= 80) return 'healthy';
            if (score >= 60) return 'warning';
            return 'critical';
        }
        
        function formatTimestamp(timestamp) {
            const date = new Date(timestamp * 1000);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 3600000) {
                return Math.floor(diff / 60000) + ' minutes ago';
            } else if (diff < 86400000) {
                return Math.floor(diff / 3600000) + ' hours ago';
            } else {
                return date.toLocaleDateString();
            }
        }
        
        function refreshData() {
            fetchData();
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            initCharts();
            fetchData();
            // Auto-refresh every 30 seconds
            setInterval(fetchData, 30000);
        });
    </script>
</body>
</html>
'''

@app.route('/')
def dashboard():
    """Serve the dashboard HTML"""
    return render_template_string(DASHBOARD_TEMPLATE)

@app.route('/api/dashboard-data')
def dashboard_data():
    """Get dashboard data as JSON"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get basic metrics
        metrics = get_current_metrics(cursor)
        
        # Get health trend
        health_trend = get_health_trend(cursor)
        
        # Get status distribution
        status_distribution = get_status_distribution()
        
        # Get recent alerts
        recent_alerts = get_recent_alerts(cursor)
        
        # Get problem documents
        problem_documents = get_problem_documents(cursor)
        
        conn.close()
        
        return jsonify({
            'metrics': metrics,
            'health_trend': health_trend,
            'status_distribution': status_distribution,
            'recent_alerts': recent_alerts,
            'problem_documents': problem_documents
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_current_metrics(cursor) -> Dict:
    """Get current dashboard metrics"""
    # Total documents
    cursor.execute('''
        SELECT COUNT(DISTINCT file_path) FROM document_metrics
        WHERE timestamp > ?
    ''', (time.time() - 86400,))
    total_docs = cursor.fetchone()[0] or 0
    
    # Average health score from latest report
    health_score = 75.0  # Default
    try:
        latest_report_path = os.path.join(REPORT_PATH, 'latest_report.html')
        if os.path.exists(latest_report_path):
            # Parse health score from report (simplified)
            with open(latest_report_path, 'r') as f:
                content = f.read()
                import re
                match = re.search(r'Overall Health Score: ([\d.]+)%', content)
                if match:
                    health_score = float(match.group(1))
    except:
        pass
    
    # Active alerts
    cursor.execute('''
        SELECT COUNT(*) FROM alerts
        WHERE timestamp > ?
    ''', (time.time() - 86400,))
    active_alerts = cursor.fetchone()[0] or 0
    
    # Documents updated today
    today_start = datetime.datetime.now().replace(hour=0, minute=0, second=0).timestamp()
    cursor.execute('''
        SELECT COUNT(DISTINCT file_path) FROM document_metrics
        WHERE timestamp > ?
    ''', (today_start,))
    updated_today = cursor.fetchone()[0] or 0
    
    return {
        'total_documents': total_docs,
        'health_score': health_score,
        'active_alerts': active_alerts,
        'updated_today': updated_today
    }

def get_health_trend(cursor) -> Dict:
    """Get health score trend for last 7 days"""
    import time
    
    labels = []
    scores = []
    
    for days_ago in range(6, -1, -1):
        date = datetime.datetime.now() - datetime.timedelta(days=days_ago)
        labels.append(date.strftime('%m/%d'))
        
        # For demo purposes, generate sample data
        # In production, this would read from historical reports
        scores.append(75 + (6 - days_ago) * 2)
    
    return {
        'labels': labels,
        'scores': scores
    }

def get_status_distribution() -> Dict:
    """Get document status distribution"""
    # For demo purposes, return sample data
    # In production, this would query the latest health check results
    return {
        'healthy': 45,
        'warning': 12,
        'critical': 3
    }

def get_recent_alerts(cursor) -> List[Dict]:
    """Get recent alerts"""
    cursor.execute('''
        SELECT severity, type, message, file_path, timestamp
        FROM alerts
        ORDER BY timestamp DESC
        LIMIT 10
    ''')
    
    alerts = []
    for row in cursor.fetchall():
        alerts.append({
            'severity': row[0],
            'type': row[1],
            'message': row[2],
            'file_path': row[3],
            'timestamp': row[4]
        })
    
    return alerts

def get_problem_documents(cursor) -> List[Dict]:
    """Get documents with problems"""
    # Get latest metrics for each document
    cursor.execute('''
        SELECT 
            m1.file_path,
            m1.readability_score,
            m1.last_modified,
            COUNT(CASE WHEN m1.broken_links != '[]' THEN 1 END) as issues_count
        FROM document_metrics m1
        INNER JOIN (
            SELECT file_path, MAX(timestamp) as max_timestamp
            FROM document_metrics
            GROUP BY file_path
        ) m2 ON m1.file_path = m2.file_path AND m1.timestamp = m2.max_timestamp
        WHERE m1.readability_score < 70
        GROUP BY m1.file_path
        ORDER BY m1.readability_score ASC
        LIMIT 10
    ''')
    
    problems = []
    for row in cursor.fetchall():
        problems.append({
            'file_path': os.path.basename(row[0]),
            'quality_score': row[1],
            'last_modified': row[2],
            'issues_count': row[3]
        })
    
    return problems

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Documentation Monitoring Dashboard')
    parser.add_argument('--port', type=int, default=5000, help='Port to run on')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    
    args = parser.parse_args()
    
    print(f"Starting dashboard on http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)