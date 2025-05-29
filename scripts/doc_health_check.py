#!/usr/bin/env python3
"""
Documentation Health Check System
Performs comprehensive health checks on documentation
"""

import os
import sys
import json
import time
import logging
import sqlite3
import hashlib
import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, asdict
from collections import defaultdict

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/opt/nscale-assist/logs/doc_health_check.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class DocumentHealth:
    """Document health assessment"""
    file_path: str
    last_updated: float
    days_since_update: int
    is_orphaned: bool
    missing_references: List[str]
    duplicate_content: List[str]
    consistency_issues: List[str]
    quality_score: float
    health_status: str  # 'healthy', 'warning', 'critical'
    recommendations: List[str]


@dataclass
class HealthReport:
    """Overall health report"""
    timestamp: float
    total_documents: int
    healthy_documents: int
    warning_documents: int
    critical_documents: int
    orphaned_documents: List[str]
    outdated_documents: List[str]
    inconsistent_documents: List[str]
    duplicate_documents: List[Tuple[str, str]]
    overall_health_score: float
    top_issues: List[Dict]
    recommendations: List[str]


class DocumentHealthChecker:
    """Performs comprehensive health checks on documentation"""
    
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.docs_paths = self.config.get('docs_paths', ['/opt/nscale-assist/docs'])
        self.file_patterns = self.config.get('file_patterns', ['*.md', '*.rst', '*.txt'])
        self.health_results: Dict[str, DocumentHealth] = {}
        self.content_hashes: Dict[str, List[str]] = defaultdict(list)
        self.reference_graph: Dict[str, Set[str]] = defaultdict(set)
        
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Return default configuration"""
        return {
            'docs_paths': ['/opt/nscale-assist/docs'],
            'file_patterns': ['*.md', '*.rst', '*.txt'],
            'health_thresholds': {
                'max_days_without_update': 180,
                'min_quality_score': 60,
                'max_duplicate_similarity': 0.8,
                'min_word_count': 50,
                'max_broken_references': 2
            },
            'check_settings': {
                'check_orphaned': True,
                'check_duplicates': True,
                'check_consistency': True,
                'check_references': True,
                'check_formatting': True
            },
            'report_settings': {
                'output_format': 'json',
                'output_path': '/opt/nscale-assist/logs/health_reports',
                'keep_reports': 30
            }
        }
    
    def run_health_check(self) -> HealthReport:
        """Run comprehensive health check on all documentation"""
        logger.info("Starting documentation health check...")
        
        # Collect all documents
        documents = self._collect_documents()
        logger.info(f"Found {len(documents)} documents to check")
        
        # Analyze each document
        for doc_path in documents:
            try:
                health = self._check_document_health(doc_path)
                self.health_results[doc_path] = health
            except Exception as e:
                logger.error(f"Failed to check {doc_path}: {e}")
        
        # Build reference graph
        self._build_reference_graph()
        
        # Check for orphaned documents
        if self.config.get('check_settings', {}).get('check_orphaned', True):
            self._check_orphaned_documents()
        
        # Check for duplicates
        if self.config.get('check_settings', {}).get('check_duplicates', True):
            self._check_duplicate_content()
        
        # Check consistency
        if self.config.get('check_settings', {}).get('check_consistency', True):
            self._check_consistency()
        
        # Generate report
        report = self._generate_report()
        
        # Save report
        self._save_report(report)
        
        # Clean old reports
        self._clean_old_reports()
        
        logger.info("Health check completed")
        return report
    
    def _collect_documents(self) -> List[str]:
        """Collect all documents to check"""
        documents = []
        
        for docs_path in self.docs_paths:
            if not os.path.exists(docs_path):
                logger.warning(f"Path not found: {docs_path}")
                continue
            
            path = Path(docs_path)
            for pattern in self.file_patterns:
                documents.extend([str(p) for p in path.rglob(pattern)])
        
        return sorted(list(set(documents)))
    
    def _check_document_health(self, doc_path: str) -> DocumentHealth:
        """Check health of a single document"""
        # Get basic file info
        stat = os.stat(doc_path)
        last_updated = stat.st_mtime
        days_since_update = (time.time() - last_updated) / (24 * 3600)
        
        # Read content
        with open(doc_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Calculate content hash for duplicate detection
        content_hash = hashlib.md5(content.encode()).hexdigest()
        self.content_hashes[content_hash].append(doc_path)
        
        # Initialize health assessment
        issues = []
        recommendations = []
        quality_score = 100.0
        
        # Check age
        thresholds = self.config.get('health_thresholds', {})
        max_days = thresholds.get('max_days_without_update', 180)
        if days_since_update > max_days:
            issues.append(f"Document hasn't been updated in {days_since_update:.0f} days")
            recommendations.append("Review and update content")
            quality_score -= 20
        
        # Check content quality
        word_count = len(content.split())
        min_words = thresholds.get('min_word_count', 50)
        if word_count < min_words:
            issues.append(f"Low word count: {word_count}")
            recommendations.append("Add more detailed content")
            quality_score -= 15
        
        # Check for missing sections
        if not self._has_proper_structure(content):
            issues.append("Missing proper document structure")
            recommendations.append("Add headers and organize content")
            quality_score -= 10
        
        # Extract references
        references = self._extract_references(content, doc_path)
        self.reference_graph[doc_path] = references
        
        # Check for broken references
        missing_refs = self._check_references(references, doc_path)
        if missing_refs:
            issues.append(f"Found {len(missing_refs)} broken references")
            recommendations.append("Fix broken links and references")
            quality_score -= 5 * len(missing_refs)
        
        # Determine health status
        if quality_score >= 80:
            health_status = 'healthy'
        elif quality_score >= 60:
            health_status = 'warning'
        else:
            health_status = 'critical'
        
        return DocumentHealth(
            file_path=doc_path,
            last_updated=last_updated,
            days_since_update=int(days_since_update),
            is_orphaned=False,  # Will be determined later
            missing_references=missing_refs,
            duplicate_content=[],  # Will be determined later
            consistency_issues=issues,
            quality_score=max(0, quality_score),
            health_status=health_status,
            recommendations=recommendations
        )
    
    def _has_proper_structure(self, content: str) -> bool:
        """Check if document has proper structure"""
        lines = content.strip().split('\n')
        
        # Check for title
        has_title = any(line.strip().startswith('# ') for line in lines[:5])
        
        # Check for sections
        has_sections = content.count('\n## ') >= 2 or content.count('\n### ') >= 2
        
        return has_title and has_sections
    
    def _extract_references(self, content: str, base_path: str) -> Set[str]:
        """Extract all references from document"""
        import re
        references = set()
        base_dir = os.path.dirname(base_path)
        
        # Extract markdown links
        links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
        for _, link in links:
            if not link.startswith(('http://', 'https://', '#')):
                # Resolve relative paths
                if link.startswith('/'):
                    references.add(link)
                else:
                    resolved = os.path.normpath(os.path.join(base_dir, link))
                    references.add(resolved)
        
        # Extract include/import statements
        includes = re.findall(r'(?:include|import)\s+["\']([^"\']+)["\']', content)
        references.update(includes)
        
        return references
    
    def _check_references(self, references: Set[str], base_path: str) -> List[str]:
        """Check which references are missing"""
        missing = []
        
        for ref in references:
            if ref.startswith('/'):
                # Absolute path
                if not os.path.exists(ref):
                    missing.append(ref)
            else:
                # Already resolved in extract_references
                if not os.path.exists(ref):
                    missing.append(ref)
        
        return missing
    
    def _build_reference_graph(self):
        """Build graph of document references"""
        # Graph is already being built in _check_document_health
        pass
    
    def _check_orphaned_documents(self):
        """Identify orphaned documents (not referenced by any other document)"""
        # Get all referenced documents
        referenced = set()
        for doc, refs in self.reference_graph.items():
            for ref in refs:
                if ref in self.health_results:
                    referenced.add(ref)
        
        # Find orphaned documents
        for doc_path in self.health_results:
            if doc_path not in referenced:
                # Check if it's a top-level document (index, readme, etc.)
                basename = os.path.basename(doc_path).lower()
                if basename not in ['readme.md', 'index.md', 'index.rst', '00_index.md']:
                    self.health_results[doc_path].is_orphaned = True
                    self.health_results[doc_path].consistency_issues.append("Document is orphaned (not referenced)")
                    self.health_results[doc_path].recommendations.append("Link this document from other pages or consider removing")
    
    def _check_duplicate_content(self):
        """Check for duplicate content across documents"""
        duplicates = []
        
        # Find exact duplicates
        for content_hash, doc_paths in self.content_hashes.items():
            if len(doc_paths) > 1:
                for i in range(len(doc_paths)):
                    for j in range(i + 1, len(doc_paths)):
                        duplicates.append((doc_paths[i], doc_paths[j]))
                        
                        # Update health results
                        for doc in doc_paths:
                            if doc in self.health_results:
                                self.health_results[doc].duplicate_content = [
                                    d for d in doc_paths if d != doc
                                ]
                                self.health_results[doc].consistency_issues.append(
                                    "Exact duplicate content found"
                                )
                                self.health_results[doc].recommendations.append(
                                    "Consolidate duplicate content or differentiate documents"
                                )
                                self.health_results[doc].quality_score -= 20
        
        # Could also implement fuzzy matching for similar content
        # but keeping it simple for now
    
    def _check_consistency(self):
        """Check for consistency issues across documentation"""
        # Collect common terms and their variations
        term_variations = defaultdict(set)
        
        for doc_path, health in self.health_results.items():
            try:
                with open(doc_path, 'r', encoding='utf-8') as f:
                    content = f.read().lower()
                
                # Check for inconsistent terminology
                # This is a simplified check - could be expanded
                terms = [
                    ('n-scale', 'nscale', 'n scale'),
                    ('plugin', 'plug-in', 'addon', 'add-on'),
                    ('setup', 'set up', 'set-up'),
                    ('login', 'log in', 'log-in'),
                    ('email', 'e-mail')
                ]
                
                for term_group in terms:
                    found_terms = [t for t in term_group if t in content]
                    if len(found_terms) > 1:
                        health.consistency_issues.append(
                            f"Inconsistent terminology: {', '.join(found_terms)}"
                        )
                        health.recommendations.append(
                            f"Use consistent terminology (recommend: {term_group[0]})"
                        )
                        health.quality_score -= 5
                
                # Check for consistent formatting
                if '```' in content and '~~~' in content:
                    health.consistency_issues.append("Mixed code block delimiters")
                    health.recommendations.append("Use consistent code block delimiters (```)")
                    health.quality_score -= 5
                
            except Exception as e:
                logger.error(f"Failed to check consistency for {doc_path}: {e}")
    
    def _generate_report(self) -> HealthReport:
        """Generate comprehensive health report"""
        # Categorize documents by health status
        healthy = []
        warning = []
        critical = []
        orphaned = []
        outdated = []
        inconsistent = []
        
        thresholds = self.config.get('health_thresholds', {})
        max_days = thresholds.get('max_days_without_update', 180)
        
        for doc_path, health in self.health_results.items():
            if health.health_status == 'healthy':
                healthy.append(doc_path)
            elif health.health_status == 'warning':
                warning.append(doc_path)
            else:
                critical.append(doc_path)
            
            if health.is_orphaned:
                orphaned.append(doc_path)
            
            if health.days_since_update > max_days:
                outdated.append(doc_path)
            
            if health.consistency_issues:
                inconsistent.append(doc_path)
        
        # Find duplicate pairs
        duplicate_pairs = []
        seen = set()
        for doc_path, health in self.health_results.items():
            if health.duplicate_content:
                for dup in health.duplicate_content:
                    pair = tuple(sorted([doc_path, dup]))
                    if pair not in seen:
                        duplicate_pairs.append(pair)
                        seen.add(pair)
        
        # Calculate overall health score
        total_docs = len(self.health_results)
        if total_docs > 0:
            overall_score = sum(h.quality_score for h in self.health_results.values()) / total_docs
        else:
            overall_score = 0
        
        # Identify top issues
        issue_counts = defaultdict(int)
        for health in self.health_results.values():
            for issue in health.consistency_issues:
                # Extract issue type
                if 'broken reference' in issue:
                    issue_counts['Broken References'] += 1
                elif 'orphaned' in issue:
                    issue_counts['Orphaned Documents'] += 1
                elif 'duplicate' in issue:
                    issue_counts['Duplicate Content'] += 1
                elif 'updated' in issue:
                    issue_counts['Outdated Content'] += 1
                else:
                    issue_counts['Other Issues'] += 1
        
        top_issues = [
            {'issue': issue, 'count': count}
            for issue, count in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
        # Generate recommendations
        recommendations = []
        
        if len(outdated) > total_docs * 0.3:
            recommendations.append(f"Review and update {len(outdated)} outdated documents")
        
        if len(orphaned) > 0:
            recommendations.append(f"Address {len(orphaned)} orphaned documents")
        
        if duplicate_pairs:
            recommendations.append(f"Consolidate {len(duplicate_pairs)} duplicate documents")
        
        if overall_score < 70:
            recommendations.append("Overall documentation health needs attention")
        
        return HealthReport(
            timestamp=time.time(),
            total_documents=total_docs,
            healthy_documents=len(healthy),
            warning_documents=len(warning),
            critical_documents=len(critical),
            orphaned_documents=orphaned,
            outdated_documents=outdated,
            inconsistent_documents=inconsistent,
            duplicate_documents=duplicate_pairs,
            overall_health_score=overall_score,
            top_issues=top_issues,
            recommendations=recommendations
        )
    
    def _save_report(self, report: HealthReport):
        """Save health report to file"""
        report_settings = self.config.get('report_settings', {})
        output_path = report_settings.get('output_path', '/opt/nscale-assist/logs/health_reports')
        output_format = report_settings.get('output_format', 'json')
        
        # Create output directory
        os.makedirs(output_path, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.datetime.fromtimestamp(report.timestamp)
        filename = f"health_report_{timestamp.strftime('%Y%m%d_%H%M%S')}.{output_format}"
        filepath = os.path.join(output_path, filename)
        
        # Save report
        if output_format == 'json':
            with open(filepath, 'w') as f:
                json.dump(asdict(report), f, indent=2, default=str)
        elif output_format == 'html':
            html_content = self._generate_html_report(report)
            with open(filepath, 'w') as f:
                f.write(html_content)
        else:
            # Default to text
            with open(filepath, 'w') as f:
                f.write(self._generate_text_report(report))
        
        logger.info(f"Report saved to {filepath}")
        
        # Also save latest report symlink
        latest_path = os.path.join(output_path, f"latest_report.{output_format}")
        if os.path.exists(latest_path):
            os.remove(latest_path)
        os.symlink(filename, latest_path)
    
    def _generate_html_report(self, report: HealthReport) -> str:
        """Generate HTML report"""
        timestamp = datetime.datetime.fromtimestamp(report.timestamp)
        
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Documentation Health Report - {timestamp.strftime('%Y-%m-%d %H:%M')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
        .metric {{ display: inline-block; margin: 10px; padding: 15px; border-radius: 5px; }}
        .healthy {{ background-color: #d4edda; color: #155724; }}
        .warning {{ background-color: #fff3cd; color: #856404; }}
        .critical {{ background-color: #f8d7da; color: #721c24; }}
        .section {{ margin: 20px 0; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .score {{ font-size: 48px; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Documentation Health Report</h1>
        <p>Generated: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}</p>
        <div class="score">Overall Health Score: {report.overall_health_score:.1f}%</div>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <div class="metric healthy">Healthy: {report.healthy_documents}</div>
        <div class="metric warning">Warning: {report.warning_documents}</div>
        <div class="metric critical">Critical: {report.critical_documents}</div>
        <div class="metric">Total: {report.total_documents}</div>
    </div>
    
    <div class="section">
        <h2>Top Issues</h2>
        <table>
            <tr><th>Issue</th><th>Count</th></tr>
            {''.join(f"<tr><td>{issue['issue']}</td><td>{issue['count']}</td></tr>" for issue in report.top_issues)}
        </table>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            {''.join(f"<li>{rec}</li>" for rec in report.recommendations)}
        </ul>
    </div>
    
    <div class="section">
        <h2>Problem Documents</h2>
        <h3>Outdated Documents ({len(report.outdated_documents)})</h3>
        <ul>
            {''.join(f"<li>{doc}</li>" for doc in report.outdated_documents[:10])}
            {'<li>... and more</li>' if len(report.outdated_documents) > 10 else ''}
        </ul>
        
        <h3>Orphaned Documents ({len(report.orphaned_documents)})</h3>
        <ul>
            {''.join(f"<li>{doc}</li>" for doc in report.orphaned_documents[:10])}
            {'<li>... and more</li>' if len(report.orphaned_documents) > 10 else ''}
        </ul>
    </div>
</body>
</html>"""
        
        return html
    
    def _generate_text_report(self, report: HealthReport) -> str:
        """Generate text report"""
        timestamp = datetime.datetime.fromtimestamp(report.timestamp)
        
        lines = [
            "=" * 80,
            f"Documentation Health Report - {timestamp.strftime('%Y-%m-%d %H:%M:%S')}",
            "=" * 80,
            "",
            f"Overall Health Score: {report.overall_health_score:.1f}%",
            "",
            "Summary:",
            f"  Total Documents: {report.total_documents}",
            f"  Healthy: {report.healthy_documents}",
            f"  Warning: {report.warning_documents}",
            f"  Critical: {report.critical_documents}",
            "",
            "Top Issues:"
        ]
        
        for issue in report.top_issues:
            lines.append(f"  - {issue['issue']}: {issue['count']}")
        
        lines.extend([
            "",
            "Recommendations:"
        ])
        
        for rec in report.recommendations:
            lines.append(f"  - {rec}")
        
        if report.outdated_documents:
            lines.extend([
                "",
                f"Outdated Documents ({len(report.outdated_documents)}):"
            ])
            for doc in report.outdated_documents[:10]:
                lines.append(f"  - {doc}")
            if len(report.outdated_documents) > 10:
                lines.append("  ... and more")
        
        if report.orphaned_documents:
            lines.extend([
                "",
                f"Orphaned Documents ({len(report.orphaned_documents)}):"
            ])
            for doc in report.orphaned_documents[:10]:
                lines.append(f"  - {doc}")
            if len(report.orphaned_documents) > 10:
                lines.append("  ... and more")
        
        return '\n'.join(lines)
    
    def _clean_old_reports(self):
        """Clean up old report files"""
        report_settings = self.config.get('report_settings', {})
        output_path = report_settings.get('output_path', '/opt/nscale-assist/logs/health_reports')
        keep_reports = report_settings.get('keep_reports', 30)
        
        if not os.path.exists(output_path):
            return
        
        # Get all report files
        report_files = []
        for filename in os.listdir(output_path):
            if filename.startswith('health_report_') and not filename.startswith('latest_'):
                filepath = os.path.join(output_path, filename)
                mtime = os.path.getmtime(filepath)
                report_files.append((filepath, mtime))
        
        # Sort by modification time
        report_files.sort(key=lambda x: x[1], reverse=True)
        
        # Remove old reports
        for filepath, _ in report_files[keep_reports:]:
            try:
                os.remove(filepath)
                logger.info(f"Removed old report: {filepath}")
            except Exception as e:
                logger.error(f"Failed to remove {filepath}: {e}")
    
    def get_document_details(self, doc_path: str) -> Optional[DocumentHealth]:
        """Get detailed health information for a specific document"""
        if doc_path in self.health_results:
            return self.health_results[doc_path]
        
        # If not in cache, check single document
        try:
            return self._check_document_health(doc_path)
        except Exception as e:
            logger.error(f"Failed to check document {doc_path}: {e}")
            return None


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Documentation Health Check System')
    parser.add_argument('--config', default='/opt/nscale-assist/app/scripts/doc_monitor_config.json',
                       help='Path to configuration file')
    parser.add_argument('--output-format', choices=['json', 'html', 'text'],
                       help='Output format for report')
    parser.add_argument('--check-document', help='Check health of specific document')
    
    args = parser.parse_args()
    
    # Initialize checker
    checker = DocumentHealthChecker(args.config)
    
    if args.check_document:
        # Check single document
        health = checker.get_document_details(args.check_document)
        if health:
            print(json.dumps(asdict(health), indent=2, default=str))
        else:
            print(f"Failed to check document: {args.check_document}")
    else:
        # Run full health check
        if args.output_format:
            # Override config output format
            checker.config['report_settings']['output_format'] = args.output_format
        
        report = checker.run_health_check()
        
        # Print summary
        print(f"\nHealth Check Complete!")
        print(f"Overall Score: {report.overall_health_score:.1f}%")
        print(f"Total Documents: {report.total_documents}")
        print(f"Healthy: {report.healthy_documents}")
        print(f"Warning: {report.warning_documents}")
        print(f"Critical: {report.critical_documents}")
        
        if report.recommendations:
            print("\nTop Recommendations:")
            for rec in report.recommendations[:3]:
                print(f"  - {rec}")


if __name__ == '__main__':
    main()