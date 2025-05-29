#!/usr/bin/env python3
"""
Documentation Dashboard Generator
Generates an HTML dashboard with documentation metrics and visualizations
"""

import os
import json
import re
from datetime import datetime
from pathlib import Path
from collections import defaultdict, Counter
import subprocess

class DocumentationAnalyzer:
    def __init__(self, docs_dir="docs", output_file="docs/dashboard.html"):
        self.docs_dir = Path(docs_dir)
        self.output_file = Path(output_file)
        self.metrics = {
            "total_files": 0,
            "total_lines": 0,
            "total_words": 0,
            "categories": defaultdict(int),
            "metadata_compliance": {"compliant": 0, "non_compliant": 0},
            "link_validation": {"valid": 0, "broken": 0, "external": 0},
            "recent_changes": [],
            "component_coverage": defaultdict(int),
            "file_sizes": [],
            "last_updated": datetime.now().isoformat()
        }
        
    def analyze(self):
        """Run all analysis tasks"""
        print("🔍 Analyzing documentation...")
        self._analyze_files()
        self._check_metadata_compliance()
        self._validate_links()
        self._get_recent_changes()
        self._analyze_component_coverage()
        self._generate_dashboard()
        print(f"✅ Dashboard generated: {self.output_file}")
        
    def _analyze_files(self):
        """Analyze basic file metrics"""
        for md_file in self.docs_dir.rglob("*.md"):
            if "node_modules" in str(md_file) or ".git" in str(md_file):
                continue
                
            self.metrics["total_files"] += 1
            
            # Categorize by directory
            category = md_file.parent.name if md_file.parent != self.docs_dir else "root"
            self.metrics["categories"][category] += 1
            
            # Count lines and words
            try:
                content = md_file.read_text(encoding='utf-8')
                lines = content.splitlines()
                words = len(content.split())
                
                self.metrics["total_lines"] += len(lines)
                self.metrics["total_words"] += words
                self.metrics["file_sizes"].append({
                    "name": md_file.name,
                    "size": len(content),
                    "lines": len(lines),
                    "words": words
                })
            except Exception as e:
                print(f"⚠️  Error reading {md_file}: {e}")
                
    def _check_metadata_compliance(self):
        """Check if documents have proper metadata headers"""
        required_metadata = ["title", "date", "category", "status"]
        
        for md_file in self.docs_dir.rglob("*.md"):
            if "node_modules" in str(md_file) or ".git" in str(md_file):
                continue
                
            try:
                content = md_file.read_text(encoding='utf-8')
                has_metadata = all(
                    re.search(rf"^{field}:", content, re.MULTILINE | re.IGNORECASE)
                    for field in required_metadata
                )
                
                if has_metadata:
                    self.metrics["metadata_compliance"]["compliant"] += 1
                else:
                    self.metrics["metadata_compliance"]["non_compliant"] += 1
            except:
                pass
                
    def _validate_links(self):
        """Validate internal and external links"""
        link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
        
        for md_file in self.docs_dir.rglob("*.md"):
            if "node_modules" in str(md_file) or ".git" in str(md_file):
                continue
                
            try:
                content = md_file.read_text(encoding='utf-8')
                links = link_pattern.findall(content)
                
                for link_text, link_url in links:
                    if link_url.startswith("http"):
                        self.metrics["link_validation"]["external"] += 1
                    elif link_url.startswith("#"):
                        # Anchor link
                        self.metrics["link_validation"]["valid"] += 1
                    else:
                        # Check if file exists
                        link_path = md_file.parent / link_url
                        if link_path.exists():
                            self.metrics["link_validation"]["valid"] += 1
                        else:
                            self.metrics["link_validation"]["broken"] += 1
            except:
                pass
                
    def _get_recent_changes(self):
        """Get recently modified documents using git"""
        try:
            # Get last 10 modified markdown files
            result = subprocess.run(
                ["git", "log", "--pretty=format:%h|%ad|%s", "--date=short", "-n", "20", "--", "*.md"],
                capture_output=True,
                text=True,
                cwd=self.docs_dir.parent
            )
            
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n')[:10]:
                    if line:
                        parts = line.split('|')
                        if len(parts) >= 3:
                            self.metrics["recent_changes"].append({
                                "commit": parts[0],
                                "date": parts[1],
                                "message": parts[2]
                            })
        except:
            # If git is not available, use file modification times
            recent_files = []
            for md_file in self.docs_dir.rglob("*.md"):
                if "node_modules" in str(md_file) or ".git" in str(md_file):
                    continue
                try:
                    mtime = os.path.getmtime(md_file)
                    recent_files.append((mtime, md_file))
                except:
                    pass
                    
            recent_files.sort(reverse=True)
            for mtime, file_path in recent_files[:10]:
                self.metrics["recent_changes"].append({
                    "file": file_path.name,
                    "date": datetime.fromtimestamp(mtime).strftime("%Y-%m-%d"),
                    "path": str(file_path.relative_to(self.docs_dir.parent))
                })
                
    def _analyze_component_coverage(self):
        """Analyze which components/features are documented"""
        component_keywords = {
            "API": ["api", "endpoint", "rest", "graphql"],
            "Authentication": ["auth", "login", "security", "permission"],
            "Frontend": ["vue", "react", "component", "ui", "interface"],
            "Backend": ["server", "database", "python", "node"],
            "Testing": ["test", "spec", "e2e", "unit"],
            "Deployment": ["deploy", "docker", "kubernetes", "ci/cd"],
            "Configuration": ["config", "settings", "environment"],
            "Architecture": ["architecture", "design", "pattern", "structure"]
        }
        
        for md_file in self.docs_dir.rglob("*.md"):
            if "node_modules" in str(md_file) or ".git" in str(md_file):
                continue
                
            try:
                content = md_file.read_text(encoding='utf-8').lower()
                file_components = set()
                
                for component, keywords in component_keywords.items():
                    if any(keyword in content for keyword in keywords):
                        file_components.add(component)
                        
                for component in file_components:
                    self.metrics["component_coverage"][component] += 1
            except:
                pass
                
    def _generate_dashboard(self):
        """Generate the HTML dashboard"""
        # Calculate additional metrics
        total_files = self.metrics["total_files"]
        metadata_total = (self.metrics["metadata_compliance"]["compliant"] + 
                         self.metrics["metadata_compliance"]["non_compliant"])
        metadata_percentage = (
            (self.metrics["metadata_compliance"]["compliant"] / metadata_total * 100)
            if metadata_total > 0 else 0
        )
        
        links_total = sum(self.metrics["link_validation"].values())
        
        # Prepare data for charts
        categories_data = dict(self.metrics["categories"])
        component_data = dict(self.metrics["component_coverage"])
        
        # Sort file sizes for top 10 largest
        largest_files = sorted(
            self.metrics["file_sizes"], 
            key=lambda x: x["size"], 
            reverse=True
        )[:10]
        
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f5f7fa;
            color: #2c3e50;
            line-height: 1.6;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 0;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        
        h1 {{
            text-align: center;
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        
        .last-updated {{
            text-align: center;
            opacity: 0.9;
            font-size: 0.9em;
        }}
        
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        
        .metric-card {{
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        
        .metric-card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }}
        
        .metric-value {{
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }}
        
        .metric-label {{
            color: #718096;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .chart-container {{
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }}
        
        .chart-title {{
            font-size: 1.5em;
            margin-bottom: 20px;
            color: #2d3748;
        }}
        
        .chart-wrapper {{
            position: relative;
            height: 300px;
        }}
        
        .recent-changes {{
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }}
        
        .change-item {{
            padding: 15px;
            border-bottom: 1px solid #e2e8f0;
            transition: background-color 0.2s;
        }}
        
        .change-item:hover {{
            background-color: #f7fafc;
        }}
        
        .change-item:last-child {{
            border-bottom: none;
        }}
        
        .change-date {{
            color: #718096;
            font-size: 0.9em;
        }}
        
        .progress-bar {{
            width: 100%;
            height: 20px;
            background-color: #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 10px;
        }}
        
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.5s ease;
        }}
        
        .two-column {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }}
        
        @media (max-width: 768px) {{
            .two-column {{
                grid-template-columns: 1fr;
            }}
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        
        th, td {{
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
        }}
        
        th {{
            background-color: #f7fafc;
            font-weight: 600;
            color: #4a5568;
        }}
        
        tr:hover {{
            background-color: #f7fafc;
        }}
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>📚 Documentation Dashboard</h1>
            <div class="last-updated">Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        </div>
    </header>
    
    <div class="container">
        <!-- Key Metrics -->
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">{total_files}</div>
                <div class="metric-label">Total Documents</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">{self.metrics['total_lines']:,}</div>
                <div class="metric-label">Total Lines</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">{self.metrics['total_words']:,}</div>
                <div class="metric-label">Total Words</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">{len(categories_data)}</div>
                <div class="metric-label">Categories</div>
            </div>
        </div>
        
        <!-- Metadata Compliance -->
        <div class="chart-container">
            <h2 class="chart-title">📋 Metadata Compliance</h2>
            <div>
                <span>Compliance Rate: {metadata_percentage:.1f}%</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {metadata_percentage}%"></div>
                </div>
            </div>
            <p style="margin-top: 10px; color: #718096;">
                {self.metrics['metadata_compliance']['compliant']} compliant / 
                {self.metrics['metadata_compliance']['non_compliant']} non-compliant
            </p>
        </div>
        
        <!-- Charts Row -->
        <div class="two-column">
            <!-- Categories Chart -->
            <div class="chart-container">
                <h2 class="chart-title">📁 Documentation by Category</h2>
                <div class="chart-wrapper">
                    <canvas id="categoriesChart"></canvas>
                </div>
            </div>
            
            <!-- Component Coverage Chart -->
            <div class="chart-container">
                <h2 class="chart-title">🔧 Component Coverage</h2>
                <div class="chart-wrapper">
                    <canvas id="componentChart"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Link Validation -->
        <div class="chart-container">
            <h2 class="chart-title">🔗 Link Validation Summary</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value" style="color: #48bb78;">{self.metrics['link_validation']['valid']}</div>
                    <div class="metric-label">Valid Links</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" style="color: #f56565;">{self.metrics['link_validation']['broken']}</div>
                    <div class="metric-label">Broken Links</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" style="color: #4299e1;">{self.metrics['link_validation']['external']}</div>
                    <div class="metric-label">External Links</div>
                </div>
            </div>
        </div>
        
        <!-- Recent Changes and Largest Files -->
        <div class="two-column">
            <!-- Recent Changes -->
            <div class="recent-changes">
                <h2 class="chart-title">🕐 Recent Changes</h2>
                {self._generate_recent_changes_html()}
            </div>
            
            <!-- Largest Files -->
            <div class="recent-changes">
                <h2 class="chart-title">📊 Largest Documents</h2>
                <table>
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Lines</th>
                            <th>Words</th>
                        </tr>
                    </thead>
                    <tbody>
                        {''.join(f'''
                        <tr>
                            <td>{file['name']}</td>
                            <td>{file['lines']:,}</td>
                            <td>{file['words']:,}</td>
                        </tr>
                        ''' for file in largest_files)}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    
    <script>
        // Categories Chart
        const categoriesCtx = document.getElementById('categoriesChart').getContext('2d');
        new Chart(categoriesCtx, {{
            type: 'doughnut',
            data: {{
                labels: {list(categories_data.keys())},
                datasets: [{{
                    data: {list(categories_data.values())},
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#f5576c',
                        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
                        '#fa709a', '#fee140', '#30cfd0', '#330867'
                    ]
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{
                        position: 'right'
                    }}
                }}
            }}
        }});
        
        // Component Coverage Chart
        const componentCtx = document.getElementById('componentChart').getContext('2d');
        new Chart(componentCtx, {{
            type: 'bar',
            data: {{
                labels: {list(component_data.keys())},
                datasets: [{{
                    label: 'Documents',
                    data: {list(component_data.values())},
                    backgroundColor: '#667eea',
                    borderColor: '#5a67d8',
                    borderWidth: 1
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                scales: {{
                    y: {{
                        beginAtZero: true,
                        ticks: {{
                            stepSize: 1
                        }}
                    }}
                }},
                plugins: {{
                    legend: {{
                        display: false
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>"""
        
        # Ensure output directory exists
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Write the dashboard
        self.output_file.write_text(html_content, encoding='utf-8')
        
    def _generate_recent_changes_html(self):
        """Generate HTML for recent changes section"""
        if not self.metrics["recent_changes"]:
            return "<p style='color: #718096;'>No recent changes found</p>"
            
        html = ""
        for change in self.metrics["recent_changes"]:
            if "commit" in change:
                # Git commit format
                html += f"""
                <div class="change-item">
                    <div>{change['message']}</div>
                    <div class="change-date">{change['date']} - {change['commit']}</div>
                </div>
                """
            else:
                # File modification format
                html += f"""
                <div class="change-item">
                    <div>{change['file']}</div>
                    <div class="change-date">{change['date']} - {change['path']}</div>
                </div>
                """
        return html


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate documentation dashboard")
    parser.add_argument(
        "--docs-dir", 
        default="docs", 
        help="Documentation directory (default: docs)"
    )
    parser.add_argument(
        "--output", 
        default="docs/dashboard.html", 
        help="Output file path (default: docs/dashboard.html)"
    )
    
    args = parser.parse_args()
    
    analyzer = DocumentationAnalyzer(args.docs_dir, args.output)
    analyzer.analyze()
    
    # Print summary
    print("\n📊 Documentation Summary:")
    print(f"   Total Files: {analyzer.metrics['total_files']}")
    print(f"   Total Lines: {analyzer.metrics['total_lines']:,}")
    print(f"   Total Words: {analyzer.metrics['total_words']:,}")
    print(f"   Categories: {len(analyzer.metrics['categories'])}")
    print(f"\n✨ Dashboard saved to: {analyzer.output_file}")


if __name__ == "__main__":
    main()