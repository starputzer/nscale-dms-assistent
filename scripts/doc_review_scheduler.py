#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Documentation Review Scheduler for nscale DMS Assistant

This script tracks document ages, review dates, and generates review reminders
based on document priority. It integrates with the existing documentation
maintenance tools.

Features:
1. Track document ages and last review dates
2. Generate review reminders based on priority
3. Create review assignments
4. Generate review reports
5. Integration with existing docs_consolidation.py

Author: Claude AI
Date: 29.05.2025
"""

import os
import sys
import json
import argparse
import logging
import datetime
import hashlib
import re
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, asdict
from collections import defaultdict
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('doc_review_scheduler')

# Path configuration
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DOCS_DIR = os.path.join(ROOT_DIR, 'docs')
REVIEW_DATA_FILE = os.path.join(DOCS_DIR, '.review_data.json')
REVIEW_ASSIGNMENTS_FILE = os.path.join(DOCS_DIR, '.review_assignments.json')

# Review intervals (in days) based on priority
REVIEW_INTERVALS = {
    'critical': 30,    # Critical docs: monthly review
    'high': 60,        # High priority: bi-monthly
    'medium': 90,      # Medium priority: quarterly
    'low': 180         # Low priority: semi-annually
}

# Document priority mapping based on path and content
PRIORITY_MAPPING = {
    'critical': [
        'SETUP.md',
        'API_INTEGRATION.md',
        'SYSTEM_ARCHITEKTUR.md',
        'SECURITY.md'
    ],
    'high': [
        'ROADMAP.md',
        'KOMPONENTEN_LEITFADEN.md',
        'FEHLERBEHANDLUNG.md',
        'STATE_MANAGEMENT.md'
    ],
    'medium': [
        'MIGRATIONS_',
        'FRONTEND_ARCHITEKTUR.md',
        'BACKEND_ARCHITEKTUR.md',
        'TYPESCRIPT_TYPEN.md'
    ],
    'low': [
        'KONSOLIDIERUNG_',
        'CHANGELOG.md',
        'PROJEKT_UEBERBLICK.md'
    ]
}

@dataclass
class DocumentReviewInfo:
    """Information about a document's review status"""
    file_path: str
    last_modified: datetime.datetime
    last_reviewed: Optional[datetime.datetime]
    priority: str
    assigned_to: Optional[str]
    content_hash: str
    review_notes: List[str]

    def days_since_review(self) -> Optional[int]:
        """Calculate days since last review"""
        if self.last_reviewed:
            return (datetime.datetime.now() - self.last_reviewed).days
        return None
    
    def days_since_modified(self) -> int:
        """Calculate days since last modification"""
        return (datetime.datetime.now() - self.last_modified).days
    
    def needs_review(self) -> bool:
        """Check if document needs review based on priority and time"""
        if not self.last_reviewed:
            return True
        
        days_since = self.days_since_review()
        interval = REVIEW_INTERVALS.get(self.priority, 90)
        return days_since >= interval
    
    def review_urgency(self) -> str:
        """Determine review urgency level"""
        if not self.needs_review():
            return 'none'
        
        days_overdue = 0
        if self.last_reviewed:
            days_since = self.days_since_review()
            interval = REVIEW_INTERVALS.get(self.priority, 90)
            days_overdue = days_since - interval
        else:
            # Never reviewed documents are high urgency
            return 'high'
        
        if days_overdue > 30:
            return 'critical'
        elif days_overdue > 14:
            return 'high'
        elif days_overdue > 0:
            return 'medium'
        return 'low'

class DocumentReviewScheduler:
    """Main scheduler class for document reviews"""
    
    def __init__(self, docs_dir: str = DOCS_DIR):
        self.docs_dir = docs_dir
        self.review_data: Dict[str, DocumentReviewInfo] = {}
        self.assignments: Dict[str, List[str]] = defaultdict(list)
        self.load_review_data()
        self.load_assignments()
    
    def load_review_data(self) -> None:
        """Load existing review data from JSON file"""
        if os.path.exists(REVIEW_DATA_FILE):
            try:
                with open(REVIEW_DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for file_path, info in data.items():
                        # Convert date strings back to datetime objects
                        info['last_modified'] = datetime.datetime.fromisoformat(info['last_modified'])
                        if info.get('last_reviewed'):
                            info['last_reviewed'] = datetime.datetime.fromisoformat(info['last_reviewed'])
                        self.review_data[file_path] = DocumentReviewInfo(**info)
                logger.info(f"Loaded review data for {len(self.review_data)} documents")
            except Exception as e:
                logger.error(f"Error loading review data: {e}")
    
    def load_assignments(self) -> None:
        """Load existing review assignments"""
        if os.path.exists(REVIEW_ASSIGNMENTS_FILE):
            try:
                with open(REVIEW_ASSIGNMENTS_FILE, 'r', encoding='utf-8') as f:
                    self.assignments = json.load(f)
                logger.info(f"Loaded assignments for {len(self.assignments)} reviewers")
            except Exception as e:
                logger.error(f"Error loading assignments: {e}")
    
    def save_review_data(self) -> None:
        """Save review data to JSON file"""
        try:
            data = {}
            for file_path, info in self.review_data.items():
                info_dict = asdict(info)
                # Convert datetime objects to ISO format strings
                info_dict['last_modified'] = info.last_modified.isoformat()
                if info.last_reviewed:
                    info_dict['last_reviewed'] = info.last_reviewed.isoformat()
                data[file_path] = info_dict
            
            with open(REVIEW_DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info("Review data saved successfully")
        except Exception as e:
            logger.error(f"Error saving review data: {e}")
    
    def save_assignments(self) -> None:
        """Save review assignments to JSON file"""
        try:
            with open(REVIEW_ASSIGNMENTS_FILE, 'w', encoding='utf-8') as f:
                json.dump(dict(self.assignments), f, indent=2)
            logger.info("Assignments saved successfully")
        except Exception as e:
            logger.error(f"Error saving assignments: {e}")
    
    def calculate_file_hash(self, file_path: str) -> str:
        """Calculate MD5 hash of file content"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception as e:
            logger.error(f"Error calculating hash for {file_path}: {e}")
            return ""
    
    def determine_priority(self, file_path: str) -> str:
        """Determine document priority based on filename and path"""
        filename = os.path.basename(file_path)
        
        for priority, patterns in PRIORITY_MAPPING.items():
            for pattern in patterns:
                if pattern in filename:
                    return priority
        
        # Check if it's in a specific directory
        if '01_ARCHITEKTUR' in file_path:
            return 'high'
        elif '02_ENTWICKLUNG' in file_path:
            return 'critical'
        elif '03_MIGRATION' in file_path:
            return 'medium'
        
        return 'medium'  # Default priority
    
    def scan_documents(self) -> None:
        """Scan all documents and update review information"""
        logger.info("Scanning documents...")
        
        for root, dirs, files in os.walk(self.docs_dir):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                if not file.endswith('.md'):
                    continue
                
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, self.docs_dir)
                
                # Get file stats
                try:
                    stat = os.stat(file_path)
                    last_modified = datetime.datetime.fromtimestamp(stat.st_mtime)
                    content_hash = self.calculate_file_hash(file_path)
                    
                    # Check if file is new or modified
                    if relative_path not in self.review_data:
                        # New file
                        logger.info(f"New document found: {relative_path}")
                        self.review_data[relative_path] = DocumentReviewInfo(
                            file_path=relative_path,
                            last_modified=last_modified,
                            last_reviewed=None,
                            priority=self.determine_priority(relative_path),
                            assigned_to=None,
                            content_hash=content_hash,
                            review_notes=[]
                        )
                    else:
                        # Existing file - check if modified
                        existing = self.review_data[relative_path]
                        if existing.content_hash != content_hash:
                            logger.info(f"Document modified: {relative_path}")
                            existing.last_modified = last_modified
                            existing.content_hash = content_hash
                            # Reset review if significantly modified
                            if existing.last_reviewed and (last_modified - existing.last_reviewed).days > 1:
                                existing.last_reviewed = None
                                existing.review_notes.append(
                                    f"Content changed on {last_modified.strftime('%Y-%m-%d')}"
                                )
                
                except Exception as e:
                    logger.error(f"Error processing {file_path}: {e}")
        
        # Remove entries for deleted files
        existing_files = set()
        for root, dirs, files in os.walk(self.docs_dir):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for file in files:
                if file.endswith('.md'):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, self.docs_dir)
                    existing_files.add(relative_path)
        
        deleted_files = set(self.review_data.keys()) - existing_files
        for file_path in deleted_files:
            logger.info(f"Document deleted: {file_path}")
            del self.review_data[file_path]
        
        self.save_review_data()
    
    def generate_review_reminders(self) -> List[DocumentReviewInfo]:
        """Generate list of documents needing review"""
        reminders = []
        
        for doc_info in self.review_data.values():
            if doc_info.needs_review():
                reminders.append(doc_info)
        
        # Sort by urgency and priority
        urgency_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4}
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        
        reminders.sort(key=lambda x: (
            urgency_order.get(x.review_urgency(), 4),
            priority_order.get(x.priority, 3),
            x.days_since_review() if x.last_reviewed else 999
        ))
        
        return reminders
    
    def assign_reviews(self, reviewers: List[str], max_per_reviewer: int = 5) -> Dict[str, List[str]]:
        """Assign documents for review to available reviewers"""
        reminders = self.generate_review_reminders()
        new_assignments = defaultdict(list)
        
        # Clear existing assignments for documents that need review
        for doc in reminders:
            if doc.assigned_to:
                doc.assigned_to = None
        
        # Round-robin assignment
        reviewer_index = 0
        for doc in reminders:
            if len(new_assignments[reviewers[reviewer_index]]) >= max_per_reviewer:
                reviewer_index = (reviewer_index + 1) % len(reviewers)
                if len(new_assignments[reviewers[reviewer_index]]) >= max_per_reviewer:
                    logger.warning("All reviewers have reached maximum assignments")
                    break
            
            reviewer = reviewers[reviewer_index]
            new_assignments[reviewer].append(doc.file_path)
            doc.assigned_to = reviewer
            
            reviewer_index = (reviewer_index + 1) % len(reviewers)
        
        # Update assignments
        self.assignments = dict(new_assignments)
        self.save_assignments()
        self.save_review_data()
        
        return self.assignments
    
    def mark_reviewed(self, file_path: str, reviewer: str, notes: str = "") -> bool:
        """Mark a document as reviewed"""
        if file_path not in self.review_data:
            logger.error(f"Document not found: {file_path}")
            return False
        
        doc_info = self.review_data[file_path]
        doc_info.last_reviewed = datetime.datetime.now()
        doc_info.assigned_to = None
        
        review_note = f"Reviewed by {reviewer} on {doc_info.last_reviewed.strftime('%Y-%m-%d')}"
        if notes:
            review_note += f": {notes}"
        doc_info.review_notes.append(review_note)
        
        # Remove from assignments
        for rev, docs in self.assignments.items():
            if file_path in docs:
                docs.remove(file_path)
        
        self.save_review_data()
        self.save_assignments()
        
        logger.info(f"Document marked as reviewed: {file_path}")
        return True
    
    def generate_review_report(self, output_file: Optional[str] = None) -> str:
        """Generate comprehensive review report"""
        report_lines = [
            "# Documentation Review Report",
            "",
            f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Total documents: {len(self.review_data)}",
            "",
            "## Summary Statistics",
            ""
        ]
        
        # Calculate statistics
        total_docs = len(self.review_data)
        reviewed_docs = sum(1 for d in self.review_data.values() if d.last_reviewed)
        need_review = sum(1 for d in self.review_data.values() if d.needs_review())
        
        by_priority = defaultdict(int)
        by_urgency = defaultdict(int)
        
        for doc in self.review_data.values():
            by_priority[doc.priority] += 1
            if doc.needs_review():
                by_urgency[doc.review_urgency()] += 1
        
        report_lines.extend([
            f"- Documents reviewed: {reviewed_docs}/{total_docs} ({reviewed_docs/total_docs*100:.1f}%)",
            f"- Documents needing review: {need_review}",
            "",
            "### By Priority:",
            f"- Critical: {by_priority.get('critical', 0)}",
            f"- High: {by_priority.get('high', 0)}",
            f"- Medium: {by_priority.get('medium', 0)}",
            f"- Low: {by_priority.get('low', 0)}",
            "",
            "### Review Urgency:",
            f"- Critical: {by_urgency.get('critical', 0)}",
            f"- High: {by_urgency.get('high', 0)}",
            f"- Medium: {by_urgency.get('medium', 0)}",
            f"- Low: {by_urgency.get('low', 0)}",
            "",
            "## Documents Needing Review",
            ""
        ])
        
        # List documents needing review
        reminders = self.generate_review_reminders()
        
        if reminders:
            report_lines.append("| Document | Priority | Last Review | Days Overdue | Urgency | Assigned |")
            report_lines.append("|----------|----------|-------------|--------------|---------|----------|")
            
            for doc in reminders[:20]:  # Limit to top 20
                last_review = doc.last_reviewed.strftime('%Y-%m-%d') if doc.last_reviewed else 'Never'
                days_overdue = doc.days_since_review() - REVIEW_INTERVALS[doc.priority] if doc.last_reviewed else 'N/A'
                assigned = doc.assigned_to or 'Unassigned'
                
                report_lines.append(
                    f"| {doc.file_path} | {doc.priority} | {last_review} | "
                    f"{days_overdue} | {doc.review_urgency()} | {assigned} |"
                )
        else:
            report_lines.append("*All documents are up to date!*")
        
        # Current assignments
        if self.assignments:
            report_lines.extend([
                "",
                "## Current Review Assignments",
                ""
            ])
            
            for reviewer, docs in self.assignments.items():
                if docs:
                    report_lines.append(f"### {reviewer}")
                    for doc in docs:
                        report_lines.append(f"- {doc}")
                    report_lines.append("")
        
        # Recently reviewed
        report_lines.extend([
            "",
            "## Recently Reviewed Documents",
            ""
        ])
        
        recently_reviewed = [
            doc for doc in self.review_data.values() 
            if doc.last_reviewed and doc.days_since_review() <= 30
        ]
        recently_reviewed.sort(key=lambda x: x.last_reviewed, reverse=True)
        
        if recently_reviewed:
            report_lines.append("| Document | Reviewed Date | Reviewer |")
            report_lines.append("|----------|---------------|----------|")
            
            for doc in recently_reviewed[:10]:
                reviewer = 'Unknown'
                for note in reversed(doc.review_notes):
                    if 'Reviewed by' in note:
                        match = re.search(r'Reviewed by (\w+)', note)
                        if match:
                            reviewer = match.group(1)
                            break
                
                report_lines.append(
                    f"| {doc.file_path} | {doc.last_reviewed.strftime('%Y-%m-%d')} | {reviewer} |"
                )
        else:
            report_lines.append("*No documents reviewed in the last 30 days*")
        
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
    
    def generate_reminder_email(self, reviewer: str) -> str:
        """Generate email reminder for a specific reviewer"""
        if reviewer not in self.assignments or not self.assignments[reviewer]:
            return f"No documents assigned to {reviewer}"
        
        email_lines = [
            f"Subject: Documentation Review Reminder for {reviewer}",
            "",
            f"Hello {reviewer},",
            "",
            "You have the following documents assigned for review:",
            ""
        ]
        
        for doc_path in self.assignments[reviewer]:
            if doc_path in self.review_data:
                doc = self.review_data[doc_path]
                urgency = doc.review_urgency()
                priority = doc.priority
                
                email_lines.append(
                    f"- {doc_path} (Priority: {priority}, Urgency: {urgency})"
                )
        
        email_lines.extend([
            "",
            "Please complete your reviews as soon as possible.",
            "",
            "To mark a document as reviewed, run:",
            f"python doc_review_scheduler.py --mark-reviewed <file_path> --reviewer {reviewer}",
            "",
            "Thank you for helping maintain our documentation quality!",
            "",
            "Best regards,",
            "Documentation Review System"
        ])
        
        return '\n'.join(email_lines)

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Documentation Review Scheduler')
    parser.add_argument('--scan', action='store_true', help='Scan documents and update review data')
    parser.add_argument('--report', action='store_true', help='Generate review report')
    parser.add_argument('--assign', nargs='+', metavar='REVIEWER', help='Assign reviews to specified reviewers')
    parser.add_argument('--mark-reviewed', metavar='FILE', help='Mark a document as reviewed')
    parser.add_argument('--reviewer', help='Reviewer name (for mark-reviewed)')
    parser.add_argument('--notes', help='Review notes (for mark-reviewed)')
    parser.add_argument('--reminder', metavar='REVIEWER', help='Generate reminder for specific reviewer')
    parser.add_argument('--output', '-o', help='Output file for reports')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    scheduler = DocumentReviewScheduler()
    
    if args.scan:
        scheduler.scan_documents()
        logger.info("Document scan completed")
    
    if args.report:
        report = scheduler.generate_review_report(args.output)
        if not args.output:
            print(report)
    
    if args.assign:
        scheduler.scan_documents()  # Ensure data is current
        assignments = scheduler.assign_reviews(args.assign)
        logger.info(f"Reviews assigned to {len(assignments)} reviewers")
        for reviewer, docs in assignments.items():
            logger.info(f"  {reviewer}: {len(docs)} documents")
    
    if args.mark_reviewed:
        if not args.reviewer:
            logger.error("--reviewer is required when marking documents as reviewed")
            sys.exit(1)
        
        success = scheduler.mark_reviewed(args.mark_reviewed, args.reviewer, args.notes or "")
        if not success:
            sys.exit(1)
    
    if args.reminder:
        reminder = scheduler.generate_reminder_email(args.reminder)
        print(reminder)
    
    # If no action specified, show help
    if not any([args.scan, args.report, args.assign, args.mark_reviewed, args.reminder]):
        parser.print_help()

if __name__ == "__main__":
    main()