#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Documentation Quality Score System for nscale DMS Assistant

This script calculates quality scores for documentation, checks for completeness,
examples, diagrams, and identifies improvement areas. It integrates with the
existing documentation maintenance tools.

Features:
1. Calculate quality scores for each document
2. Check for completeness, examples, diagrams
3. Identify improvement areas
4. Generate quality reports
5. Integration with doc_review_scheduler.py

Author: Claude AI
Date: 29.05.2025
"""

import os
import sys
import re
import json
import argparse
import logging
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, asdict
from collections import defaultdict
import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Try to import review scheduler for integration
try:
    from doc_review_scheduler import DocumentReviewScheduler, DocumentReviewInfo
    HAS_SCHEDULER = True
except ImportError:
    HAS_SCHEDULER = False
    logger.warning("doc_review_scheduler not available - running in standalone mode")

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('doc_quality_score')

# Path configuration
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DOCS_DIR = os.path.join(ROOT_DIR, 'docs')
QUALITY_DATA_FILE = os.path.join(DOCS_DIR, '.quality_scores.json')

# Quality criteria weights
QUALITY_WEIGHTS = {
    'structure': 0.20,      # Document structure and organization
    'completeness': 0.20,   # Content completeness
    'examples': 0.15,       # Code examples and usage
    'clarity': 0.15,        # Writing clarity and readability
    'formatting': 0.10,     # Proper markdown formatting
    'diagrams': 0.10,       # Visual aids and diagrams
    'references': 0.10      # Links and references
}

# Minimum requirements for different document types
DOC_TYPE_REQUIREMENTS = {
    'setup': ['prerequisites', 'installation', 'configuration', 'troubleshooting'],
    'api': ['endpoints', 'parameters', 'responses', 'examples', 'errors'],
    'architecture': ['overview', 'components', 'interactions', 'diagrams'],
    'guide': ['introduction', 'steps', 'examples', 'best practices'],
    'reference': ['overview', 'details', 'examples', 'related']
}

@dataclass
class QualityMetrics:
    """Detailed quality metrics for a document"""
    file_path: str
    total_score: float
    structure_score: float
    completeness_score: float
    examples_score: float
    clarity_score: float
    formatting_score: float
    diagrams_score: float
    references_score: float
    word_count: int
    line_count: int
    code_blocks: int
    diagrams_count: int
    links_count: int
    headers_count: Dict[int, int]  # Header level -> count
    issues: List[str]
    suggestions: List[str]
    last_analyzed: datetime.datetime

    def get_grade(self) -> str:
        """Convert score to letter grade"""
        if self.total_score >= 90:
            return 'A'
        elif self.total_score >= 80:
            return 'B'
        elif self.total_score >= 70:
            return 'C'
        elif self.total_score >= 60:
            return 'D'
        else:
            return 'F'
    
    def needs_improvement(self) -> bool:
        """Check if document needs improvement"""
        return self.total_score < 70 or len(self.issues) > 3

class DocumentQualityAnalyzer:
    """Main analyzer class for document quality"""
    
    def __init__(self, docs_dir: str = DOCS_DIR):
        self.docs_dir = docs_dir
        self.quality_data: Dict[str, QualityMetrics] = {}
        self.load_quality_data()
        
        # Integration with review scheduler if available
        self.scheduler = None
        if HAS_SCHEDULER:
            try:
                self.scheduler = DocumentReviewScheduler(docs_dir)
                logger.info("Integrated with document review scheduler")
            except Exception as e:
                logger.warning(f"Could not integrate with scheduler: {e}")
    
    def load_quality_data(self) -> None:
        """Load existing quality data from JSON file"""
        if os.path.exists(QUALITY_DATA_FILE):
            try:
                with open(QUALITY_DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for file_path, metrics in data.items():
                        # Convert date string back to datetime
                        metrics['last_analyzed'] = datetime.datetime.fromisoformat(metrics['last_analyzed'])
                        self.quality_data[file_path] = QualityMetrics(**metrics)
                logger.info(f"Loaded quality data for {len(self.quality_data)} documents")
            except Exception as e:
                logger.error(f"Error loading quality data: {e}")
    
    def save_quality_data(self) -> None:
        """Save quality data to JSON file"""
        try:
            data = {}
            for file_path, metrics in self.quality_data.items():
                metrics_dict = asdict(metrics)
                # Convert datetime to ISO format string
                metrics_dict['last_analyzed'] = metrics.last_analyzed.isoformat()
                data[file_path] = metrics_dict
            
            with open(QUALITY_DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info("Quality data saved successfully")
        except Exception as e:
            logger.error(f"Error saving quality data: {e}")
    
    def determine_doc_type(self, file_path: str, content: str) -> str:
        """Determine document type based on path and content"""
        filename = os.path.basename(file_path).lower()
        content_lower = content.lower()
        
        if 'setup' in filename or 'installation' in content_lower[:500]:
            return 'setup'
        elif 'api' in filename or 'endpoint' in content_lower[:500]:
            return 'api'
        elif 'architektur' in filename or 'architecture' in filename:
            return 'architecture'
        elif 'guide' in filename or 'anleitung' in filename:
            return 'guide'
        else:
            return 'reference'
    
    def analyze_structure(self, content: str) -> Tuple[float, Dict[int, int], List[str]]:
        """Analyze document structure and organization"""
        issues = []
        headers = defaultdict(int)
        
        lines = content.split('\n')
        has_title = False
        has_toc = False
        section_count = 0
        
        for line in lines:
            # Check headers
            if match := re.match(r'^(#+)\s+(.+)$', line):
                level = len(match.group(1))
                headers[level] += 1
                if level == 1 and not has_title:
                    has_title = True
                elif level == 2:
                    section_count += 1
            
            # Check for TOC
            if 'table of contents' in line.lower() or 'inhaltsverzeichnis' in line.lower():
                has_toc = True
        
        # Calculate score
        score = 100
        
        if not has_title:
            score -= 20
            issues.append("Missing main title (# Header)")
        
        if section_count < 2:
            score -= 15
            issues.append("Document lacks proper sections")
        
        if len(lines) > 200 and not has_toc:
            score -= 10
            issues.append("Long document without table of contents")
        
        # Check header hierarchy
        if headers[1] > 1:
            score -= 10
            issues.append("Multiple H1 headers found")
        
        if headers[3] > 0 and headers[2] == 0:
            score -= 5
            issues.append("H3 headers without H2 headers")
        
        return max(0, score), dict(headers), issues
    
    def analyze_completeness(self, content: str, doc_type: str) -> Tuple[float, List[str], List[str]]:
        """Analyze content completeness based on document type"""
        issues = []
        suggestions = []
        content_lower = content.lower()
        
        requirements = DOC_TYPE_REQUIREMENTS.get(doc_type, [])
        found_requirements = 0
        
        for req in requirements:
            if req in content_lower:
                found_requirements += 1
            else:
                issues.append(f"Missing section: {req}")
                suggestions.append(f"Add a section about {req}")
        
        # Calculate score
        if requirements:
            score = (found_requirements / len(requirements)) * 100
        else:
            score = 80  # Default score for unknown types
        
        # Check for common missing elements
        if 'example' not in content_lower and 'beispiel' not in content_lower:
            score -= 10
            suggestions.append("Add practical examples")
        
        if len(content) < 500:
            score -= 20
            issues.append("Document is too short")
        
        return max(0, score), issues, suggestions
    
    def analyze_examples(self, content: str) -> Tuple[float, int, List[str]]:
        """Analyze code examples and usage"""
        issues = []
        code_blocks = 0
        
        # Count code blocks
        code_blocks = len(re.findall(r'```[\s\S]*?```', content))
        inline_code = len(re.findall(r'`[^`]+`', content))
        
        # Calculate score
        score = 100
        
        if code_blocks == 0:
            score -= 30
            issues.append("No code blocks found")
        elif code_blocks < 2:
            score -= 15
            issues.append("Few code examples")
        
        if inline_code == 0:
            score -= 10
            issues.append("No inline code formatting")
        
        # Check for language specification in code blocks
        unspecified_blocks = len(re.findall(r'```\s*\n', content))
        if unspecified_blocks > 0:
            score -= 5
            issues.append(f"{unspecified_blocks} code blocks without language specification")
        
        return max(0, score), code_blocks, issues
    
    def analyze_clarity(self, content: str) -> Tuple[float, int, List[str]]:
        """Analyze writing clarity and readability"""
        issues = []
        words = content.split()
        word_count = len(words)
        
        # Average sentence length
        sentences = re.split(r'[.!?]+', content)
        avg_sentence_length = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
        
        score = 100
        
        # Check sentence complexity
        if avg_sentence_length > 25:
            score -= 15
            issues.append("Sentences are too long on average")
        
        # Check paragraph structure
        paragraphs = content.split('\n\n')
        long_paragraphs = sum(1 for p in paragraphs if len(p.split()) > 150)
        if long_paragraphs > 2:
            score -= 10
            issues.append(f"{long_paragraphs} paragraphs are too long")
        
        # Check for unclear language patterns
        unclear_patterns = [
            (r'\b(etc|usw)\b', "Avoid vague terms like 'etc'"),
            (r'\b(somehow|irgendwie)\b', "Avoid unclear terms"),
            (r'[.!?]\s*[a-z]', "Sentences should start with capital letters")
        ]
        
        for pattern, message in unclear_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                score -= 5
                issues.append(message)
        
        return max(0, score), word_count, issues
    
    def analyze_formatting(self, content: str) -> Tuple[float, List[str]]:
        """Analyze markdown formatting quality"""
        issues = []
        score = 100
        
        lines = content.split('\n')
        
        # Check for formatting issues
        formatting_checks = [
            (r'^- [a-z]', "List items should start with capital letters"),
            (r'^\d+\.[a-z]', "Numbered list items should start with capital letters"),
            (r'#+\s*$', "Empty headers found"),
            (r'^\s+[-*]\s', "Inconsistent list indentation"),
            (r'\*\*\*', "Avoid triple asterisks"),
            (r'http[s]?://(?![^\s]*\))', "Bare URLs should be formatted as links")
        ]
        
        for pattern, message in formatting_checks:
            for line in lines:
                if re.match(pattern, line):
                    score -= 5
                    if message not in issues:
                        issues.append(message)
                    break
        
        # Check spacing
        consecutive_blank = 0
        max_consecutive_blank = 0
        for line in lines:
            if line.strip() == '':
                consecutive_blank += 1
                max_consecutive_blank = max(max_consecutive_blank, consecutive_blank)
            else:
                consecutive_blank = 0
        
        if max_consecutive_blank > 2:
            score -= 10
            issues.append("Too many consecutive blank lines")
        
        return max(0, score), issues
    
    def analyze_diagrams(self, content: str) -> Tuple[float, int, List[str]]:
        """Analyze visual aids and diagrams"""
        issues = []
        diagrams_count = 0
        
        # Count images
        images = len(re.findall(r'!\[.*?\]\(.*?\)', content))
        
        # Count ASCII diagrams
        ascii_diagrams = len(re.findall(r'```(?:diagram|ascii|txt)[\s\S]*?```', content))
        
        # Count mermaid diagrams
        mermaid_diagrams = len(re.findall(r'```mermaid[\s\S]*?```', content))
        
        diagrams_count = images + ascii_diagrams + mermaid_diagrams
        
        # Calculate score
        score = 100
        
        if diagrams_count == 0:
            score -= 40
            issues.append("No visual aids or diagrams")
        elif diagrams_count == 1:
            score -= 20
            issues.append("Only one visual element")
        
        # Check for broken images
        broken_images = re.findall(r'!\[.*?\]\(([^)]+)\)', content)
        for img_path in broken_images:
            if not img_path.startswith('http') and not os.path.exists(os.path.join(self.docs_dir, img_path)):
                score -= 10
                issues.append(f"Broken image link: {img_path}")
                break
        
        return max(0, score), diagrams_count, issues
    
    def analyze_references(self, content: str) -> Tuple[float, int, List[str]]:
        """Analyze links and references"""
        issues = []
        
        # Count different types of links
        internal_links = len(re.findall(r'\[.*?\]\((?!http)[^)]+\)', content))
        external_links = len(re.findall(r'\[.*?\]\(https?://[^)]+\)', content))
        anchor_links = len(re.findall(r'\[.*?\]\(#[^)]+\)', content))
        
        total_links = internal_links + external_links + anchor_links
        
        # Calculate score
        score = 100
        
        if total_links == 0:
            score -= 30
            issues.append("No links or references found")
        elif total_links < 3:
            score -= 15
            issues.append("Few links or references")
        
        # Check for link quality
        bare_urls = len(re.findall(r'(?<!\()https?://[^\s\)]+(?!\))', content))
        if bare_urls > 0:
            score -= 10
            issues.append(f"{bare_urls} bare URLs should be formatted as markdown links")
        
        # Check for broken internal links
        internal_link_paths = re.findall(r'\[.*?\]\((?!http)([^#)]+)\)', content)
        for link_path in internal_link_paths[:5]:  # Check first 5 to avoid performance issues
            full_path = os.path.join(os.path.dirname(os.path.join(self.docs_dir, link_path)), link_path)
            if not os.path.exists(full_path):
                score -= 5
                issues.append(f"Broken internal link: {link_path}")
        
        return max(0, score), total_links, issues
    
    def analyze_document(self, file_path: str) -> QualityMetrics:
        """Perform complete quality analysis on a document"""
        full_path = os.path.join(self.docs_dir, file_path) if not file_path.startswith(self.docs_dir) else file_path
        relative_path = os.path.relpath(full_path, self.docs_dir)
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Error reading {file_path}: {e}")
            return None
        
        # Determine document type
        doc_type = self.determine_doc_type(file_path, content)
        
        # Analyze each aspect
        structure_score, headers, structure_issues = self.analyze_structure(content)
        completeness_score, completeness_issues, suggestions = self.analyze_completeness(content, doc_type)
        examples_score, code_blocks, examples_issues = self.analyze_examples(content)
        clarity_score, word_count, clarity_issues = self.analyze_clarity(content)
        formatting_score, formatting_issues = self.analyze_formatting(content)
        diagrams_score, diagrams_count, diagrams_issues = self.analyze_diagrams(content)
        references_score, links_count, references_issues = self.analyze_references(content)
        
        # Combine all issues
        all_issues = (
            structure_issues + completeness_issues + examples_issues +
            clarity_issues + formatting_issues + diagrams_issues + references_issues
        )
        
        # Calculate total score
        total_score = (
            structure_score * QUALITY_WEIGHTS['structure'] +
            completeness_score * QUALITY_WEIGHTS['completeness'] +
            examples_score * QUALITY_WEIGHTS['examples'] +
            clarity_score * QUALITY_WEIGHTS['clarity'] +
            formatting_score * QUALITY_WEIGHTS['formatting'] +
            diagrams_score * QUALITY_WEIGHTS['diagrams'] +
            references_score * QUALITY_WEIGHTS['references']
        )
        
        # Create metrics object
        metrics = QualityMetrics(
            file_path=relative_path,
            total_score=round(total_score, 2),
            structure_score=structure_score,
            completeness_score=completeness_score,
            examples_score=examples_score,
            clarity_score=clarity_score,
            formatting_score=formatting_score,
            diagrams_score=diagrams_score,
            references_score=references_score,
            word_count=word_count,
            line_count=len(content.split('\n')),
            code_blocks=code_blocks,
            diagrams_count=diagrams_count,
            links_count=links_count,
            headers_count=dict(headers),
            issues=all_issues,
            suggestions=suggestions,
            last_analyzed=datetime.datetime.now()
        )
        
        return metrics
    
    def analyze_all_documents(self) -> None:
        """Analyze all documents in the docs directory"""
        logger.info("Analyzing all documents...")
        
        analyzed_count = 0
        for root, dirs, files in os.walk(self.docs_dir):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                if not file.endswith('.md'):
                    continue
                
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, self.docs_dir)
                
                logger.debug(f"Analyzing: {relative_path}")
                metrics = self.analyze_document(file_path)
                
                if metrics:
                    self.quality_data[relative_path] = metrics
                    analyzed_count += 1
        
        self.save_quality_data()
        logger.info(f"Analyzed {analyzed_count} documents")
    
    def generate_quality_report(self, output_file: Optional[str] = None) -> str:
        """Generate comprehensive quality report"""
        report_lines = [
            "# Documentation Quality Report",
            "",
            f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Total documents analyzed: {len(self.quality_data)}",
            "",
            "## Overall Statistics",
            ""
        ]
        
        if not self.quality_data:
            report_lines.append("*No documents analyzed yet. Run with --analyze first.*")
            return '\n'.join(report_lines)
        
        # Calculate overall statistics
        total_score = sum(m.total_score for m in self.quality_data.values()) / len(self.quality_data)
        
        grade_distribution = defaultdict(int)
        needs_improvement = []
        
        for metrics in self.quality_data.values():
            grade_distribution[metrics.get_grade()] += 1
            if metrics.needs_improvement():
                needs_improvement.append(metrics)
        
        report_lines.extend([
            f"- Average quality score: {total_score:.1f}/100",
            f"- Documents needing improvement: {len(needs_improvement)}",
            "",
            "### Grade Distribution:",
            f"- A (90-100): {grade_distribution['A']}",
            f"- B (80-89): {grade_distribution['B']}",
            f"- C (70-79): {grade_distribution['C']}",
            f"- D (60-69): {grade_distribution['D']}",
            f"- F (0-59): {grade_distribution['F']}",
            "",
            "### Average Scores by Category:"
        ])
        
        # Calculate average scores by category
        category_scores = {
            'Structure': sum(m.structure_score for m in self.quality_data.values()) / len(self.quality_data),
            'Completeness': sum(m.completeness_score for m in self.quality_data.values()) / len(self.quality_data),
            'Examples': sum(m.examples_score for m in self.quality_data.values()) / len(self.quality_data),
            'Clarity': sum(m.clarity_score for m in self.quality_data.values()) / len(self.quality_data),
            'Formatting': sum(m.formatting_score for m in self.quality_data.values()) / len(self.quality_data),
            'Diagrams': sum(m.diagrams_score for m in self.quality_data.values()) / len(self.quality_data),
            'References': sum(m.references_score for m in self.quality_data.values()) / len(self.quality_data)
        }
        
        for category, score in sorted(category_scores.items(), key=lambda x: x[1]):
            report_lines.append(f"- {category}: {score:.1f}/100")
        
        # Top performing documents
        top_docs = sorted(self.quality_data.values(), key=lambda x: x.total_score, reverse=True)[:5]
        
        report_lines.extend([
            "",
            "## Top Quality Documents",
            "",
            "| Document | Score | Grade |",
            "|----------|-------|-------|"
        ])
        
        for doc in top_docs:
            report_lines.append(f"| {doc.file_path} | {doc.total_score:.1f} | {doc.get_grade()} |")
        
        # Documents needing improvement
        if needs_improvement:
            report_lines.extend([
                "",
                "## Documents Needing Improvement",
                "",
                "| Document | Score | Grade | Major Issues |",
                "|----------|-------|-------|--------------|"
            ])
            
            for doc in sorted(needs_improvement, key=lambda x: x.total_score)[:10]:
                major_issues = ', '.join(doc.issues[:3])
                if len(doc.issues) > 3:
                    major_issues += f" (+{len(doc.issues)-3} more)"
                report_lines.append(
                    f"| {doc.file_path} | {doc.total_score:.1f} | {doc.get_grade()} | {major_issues} |"
                )
        
        # Common issues
        issue_counter = defaultdict(int)
        for metrics in self.quality_data.values():
            for issue in metrics.issues:
                issue_counter[issue] += 1
        
        if issue_counter:
            report_lines.extend([
                "",
                "## Most Common Issues",
                ""
            ])
            
            for issue, count in sorted(issue_counter.items(), key=lambda x: x[1], reverse=True)[:10]:
                percentage = (count / len(self.quality_data)) * 100
                report_lines.append(f"- {issue}: {count} documents ({percentage:.1f}%)")
        
        # Integration with review scheduler
        if self.scheduler and HAS_SCHEDULER:
            report_lines.extend([
                "",
                "## Review Priority Recommendations",
                "",
                "Based on quality scores and review schedule:",
                ""
            ])
            
            # Get documents needing both review and quality improvement
            self.scheduler.scan_documents()
            review_needed = self.scheduler.generate_review_reminders()
            
            priority_docs = []
            for doc_info in review_needed:
                if doc_info.file_path in self.quality_data:
                    metrics = self.quality_data[doc_info.file_path]
                    if metrics.needs_improvement():
                        priority_docs.append((doc_info, metrics))
            
            if priority_docs:
                report_lines.append("| Document | Quality Score | Review Priority | Days Since Review |")
                report_lines.append("|----------|---------------|-----------------|-------------------|")
                
                for doc_info, metrics in sorted(priority_docs, key=lambda x: x[1].total_score)[:10]:
                    days_since = doc_info.days_since_review() if doc_info.last_reviewed else "Never"
                    report_lines.append(
                        f"| {doc_info.file_path} | {metrics.total_score:.1f} | "
                        f"{doc_info.priority} | {days_since} |"
                    )
            else:
                report_lines.append("*No documents require both quality improvement and review.*")
        
        # Detailed analysis for worst performers
        worst_docs = sorted(self.quality_data.values(), key=lambda x: x.total_score)[:3]
        
        if worst_docs:
            report_lines.extend([
                "",
                "## Detailed Analysis: Documents Requiring Immediate Attention",
                ""
            ])
            
            for doc in worst_docs:
                report_lines.extend([
                    f"### {doc.file_path}",
                    "",
                    f"**Overall Score:** {doc.total_score:.1f}/100 (Grade: {doc.get_grade()})",
                    "",
                    "**Scores by Category:**",
                    f"- Structure: {doc.structure_score:.0f}",
                    f"- Completeness: {doc.completeness_score:.0f}",
                    f"- Examples: {doc.examples_score:.0f}",
                    f"- Clarity: {doc.clarity_score:.0f}",
                    f"- Formatting: {doc.formatting_score:.0f}",
                    f"- Diagrams: {doc.diagrams_score:.0f}",
                    f"- References: {doc.references_score:.0f}",
                    "",
                    "**Issues:**"
                ])
                
                for issue in doc.issues:
                    report_lines.append(f"- {issue}")
                
                if doc.suggestions:
                    report_lines.extend([
                        "",
                        "**Suggestions:**"
                    ])
                    for suggestion in doc.suggestions:
                        report_lines.append(f"- {suggestion}")
                
                report_lines.append("")
        
        report = '\n'.join(report_lines)
        
        # Save report if output file specified
        if output_file:
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(report)
                logger.info(f"Report saved to: {output_file}")
            except Exception as e:
                logger.error(f"Error saving report: {e}")
        
        return report
    
    def export_improvement_checklist(self, file_path: str, output_file: Optional[str] = None) -> str:
        """Export a detailed improvement checklist for a specific document"""
        if file_path not in self.quality_data:
            return f"No quality data found for {file_path}. Run --analyze first."
        
        metrics = self.quality_data[file_path]
        
        checklist_lines = [
            f"# Improvement Checklist: {file_path}",
            "",
            f"Current Score: {metrics.total_score:.1f}/100 (Grade: {metrics.get_grade()})",
            f"Last Analyzed: {metrics.last_analyzed.strftime('%Y-%m-%d %H:%M')}",
            "",
            "## Priority Actions",
            ""
        ]
        
        # Create prioritized action items based on lowest scores
        actions = []
        
        if metrics.structure_score < 70:
            actions.append(("High", "Improve document structure", [
                "Add a clear main title",
                "Organize content into logical sections",
                "Add table of contents for long documents"
            ]))
        
        if metrics.completeness_score < 70:
            actions.append(("High", "Complete missing content", metrics.suggestions))
        
        if metrics.examples_score < 70:
            actions.append(("High", "Add code examples", [
                "Include at least 2-3 code examples",
                "Add language specification to code blocks",
                "Use inline code formatting for technical terms"
            ]))
        
        if metrics.clarity_score < 70:
            actions.append(("Medium", "Improve clarity", [
                "Shorten long sentences (aim for < 25 words)",
                "Break up long paragraphs",
                "Remove vague terms"
            ]))
        
        if metrics.formatting_score < 70:
            actions.append(("Medium", "Fix formatting issues", [
                "Ensure consistent list formatting",
                "Remove excessive blank lines",
                "Format bare URLs as markdown links"
            ]))
        
        if metrics.diagrams_score < 70:
            actions.append(("Low", "Add visual aids", [
                "Include architecture diagrams where relevant",
                "Add screenshots for UI documentation",
                "Consider ASCII diagrams for simple illustrations"
            ]))
        
        if metrics.references_score < 70:
            actions.append(("Low", "Improve references", [
                "Add links to related documentation",
                "Include external references where appropriate",
                "Fix any broken links"
            ]))
        
        # Sort by priority
        priority_order = {"High": 0, "Medium": 1, "Low": 2}
        actions.sort(key=lambda x: priority_order[x[0]])
        
        for priority, category, items in actions:
            checklist_lines.append(f"### [{priority}] {category}")
            for item in items:
                checklist_lines.append(f"- [ ] {item}")
            checklist_lines.append("")
        
        # Add specific issues
        if metrics.issues:
            checklist_lines.extend([
                "## Specific Issues to Address",
                ""
            ])
            for issue in metrics.issues:
                checklist_lines.append(f"- [ ] Fix: {issue}")
        
        # Add metrics summary
        checklist_lines.extend([
            "",
            "## Current Metrics",
            "",
            f"- Word count: {metrics.word_count}",
            f"- Code blocks: {metrics.code_blocks}",
            f"- Diagrams: {metrics.diagrams_count}",
            f"- Links: {metrics.links_count}",
            ""
        ])
        
        checklist = '\n'.join(checklist_lines)
        
        if output_file:
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(checklist)
                logger.info(f"Checklist saved to: {output_file}")
            except Exception as e:
                logger.error(f"Error saving checklist: {e}")
        
        return checklist

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Documentation Quality Score System')
    parser.add_argument('--analyze', action='store_true', help='Analyze all documents')
    parser.add_argument('--analyze-file', metavar='FILE', help='Analyze specific document')
    parser.add_argument('--report', action='store_true', help='Generate quality report')
    parser.add_argument('--checklist', metavar='FILE', help='Generate improvement checklist for file')
    parser.add_argument('--threshold', type=int, default=70, help='Quality threshold (default: 70)')
    parser.add_argument('--output', '-o', help='Output file for reports')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    analyzer = DocumentQualityAnalyzer()
    
    if args.analyze:
        analyzer.analyze_all_documents()
    
    if args.analyze_file:
        logger.info(f"Analyzing single document: {args.analyze_file}")
        metrics = analyzer.analyze_document(args.analyze_file)
        if metrics:
            analyzer.quality_data[metrics.file_path] = metrics
            analyzer.save_quality_data()
            print(f"Quality Score: {metrics.total_score:.1f}/100 (Grade: {metrics.get_grade()})")
            if metrics.issues:
                print("\nIssues found:")
                for issue in metrics.issues:
                    print(f"  - {issue}")
        else:
            logger.error("Failed to analyze document")
    
    if args.report:
        report = analyzer.generate_quality_report(args.output)
        if not args.output:
            print(report)
    
    if args.checklist:
        checklist = analyzer.export_improvement_checklist(args.checklist, args.output)
        if not args.output:
            print(checklist)
    
    # Show documents below threshold
    if not any([args.analyze, args.analyze_file, args.report, args.checklist]):
        if analyzer.quality_data:
            below_threshold = [
                m for m in analyzer.quality_data.values() 
                if m.total_score < args.threshold
            ]
            
            if below_threshold:
                print(f"\nDocuments below quality threshold ({args.threshold}):")
                for doc in sorted(below_threshold, key=lambda x: x.total_score):
                    print(f"  - {doc.file_path}: {doc.total_score:.1f}/100 ({doc.get_grade()})")
            else:
                print(f"\nAll documents meet the quality threshold ({args.threshold})")
        else:
            print("No quality data found. Run with --analyze first.")

if __name__ == "__main__":
    main()