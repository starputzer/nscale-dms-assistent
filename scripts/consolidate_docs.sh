#!/bin/bash
# consolidate_docs.sh - Reorganize and consolidate documentation structure
# This script consolidates duplicate documentation, removes redundancy, and creates a clean structure
# Author: NScale Assist Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
ROOT_DIR="/opt/nscale-assist/app"
DOCS_DIR="${ROOT_DIR}/docs"
KONSOLIDIERT_DIR="${DOCS_DIR}/00_KONSOLIDIERTE_DOKUMENTATION"
BACKUP_DIR="${ROOT_DIR}/backups/docs_consolidation_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${ROOT_DIR}/logs/consolidate_docs_$(date +%Y%m%d_%H%M%S).log"
DUPLICATE_REPORT="${ROOT_DIR}/logs/duplicate_docs_report_$(date +%Y%m%d_%H%M%S).txt"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Statistics
declare -A stats=(
    [total_files]=0
    [duplicates_found]=0
    [files_consolidated]=0
    [directories_created]=0
    [files_archived]=0
)

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    log "ERROR: $1"
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}✓ $1${NC}"
    log "SUCCESS: $1"
}

# Warning message
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    log "WARNING: $1"
}

# Info message
info() {
    echo -e "${BLUE}ℹ $1${NC}"
    log "INFO: $1"
}

# Section header
section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "SECTION: $1"
}

# Function to check if running in correct directory
check_directory() {
    if [[ ! -d "$ROOT_DIR" ]]; then
        error_exit "Root directory $ROOT_DIR does not exist"
    fi
    cd "$ROOT_DIR" || error_exit "Cannot change to directory $ROOT_DIR"
}

# Function to create backup
create_backup() {
    section "Creating Backup"
    
    info "Creating backup of entire docs directory..."
    mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory"
    
    if [[ -d "$DOCS_DIR" ]]; then
        cp -r "$DOCS_DIR" "$BACKUP_DIR/" || error_exit "Failed to backup docs directory"
        success "Backup created at: $BACKUP_DIR"
    else
        warning "No docs directory found to backup"
    fi
}

# Function to analyze current documentation structure
analyze_current_structure() {
    section "Analyzing Current Documentation Structure"
    
    info "Scanning documentation files..."
    
    # Count total documentation files
    stats[total_files]=$(find "$DOCS_DIR" -type f -name "*.md" 2>/dev/null | wc -l)
    
    info "Total markdown files found: ${stats[total_files]}"
    
    # Show directory structure
    echo ""
    echo -e "${MAGENTA}Current Directory Structure:${NC}"
    tree -d "$DOCS_DIR" 2>/dev/null || ls -la "$DOCS_DIR"
}

# Function to find duplicate content
find_duplicates() {
    section "Finding Duplicate Documentation"
    
    info "Searching for duplicate files by content hash..."
    
    {
        echo "Duplicate Documentation Report"
        echo "=============================="
        echo "Generated: $(date)"
        echo ""
        echo "Duplicate Files Found:"
        echo "---------------------"
    } > "$DUPLICATE_REPORT"
    
    # Find duplicates using md5sum
    local temp_hashes="/tmp/doc_hashes_$$.txt"
    find "$DOCS_DIR" -type f -name "*.md" -exec md5sum {} \; | sort > "$temp_hashes"
    
    # Find files with same hash
    local last_hash=""
    local duplicate_groups=0
    
    while IFS=' ' read -r hash file; do
        if [[ "$hash" == "$last_hash" ]]; then
            echo "  - $file" >> "$DUPLICATE_REPORT"
            ((stats[duplicates_found]++))
        elif [[ -n "$last_hash" ]] && grep -c "^$last_hash" "$temp_hashes" > /dev/null; then
            if [[ $(grep -c "^$last_hash" "$temp_hashes") -gt 1 ]]; then
                echo "" >> "$DUPLICATE_REPORT"
                echo "Group $((++duplicate_groups)):" >> "$DUPLICATE_REPORT"
                grep "^$last_hash" "$temp_hashes" | cut -d' ' -f2- | sed 's/^/  - /' >> "$DUPLICATE_REPORT"
            fi
        fi
        last_hash="$hash"
    done < "$temp_hashes"
    
    rm -f "$temp_hashes"
    
    info "Found ${stats[duplicates_found]} duplicate files"
    
    # Find similar file names
    echo "" >> "$DUPLICATE_REPORT"
    echo "Similar File Names:" >> "$DUPLICATE_REPORT"
    echo "------------------" >> "$DUPLICATE_REPORT"
    
    find "$DOCS_DIR" -type f -name "*.md" -printf "%f\n" | sort | uniq -d | while read -r filename; do
        echo "$filename appears in:" >> "$DUPLICATE_REPORT"
        find "$DOCS_DIR" -name "$filename" -type f | sed 's/^/  - /' >> "$DUPLICATE_REPORT"
        echo "" >> "$DUPLICATE_REPORT"
    done
}

# Function to create new documentation structure
create_new_structure() {
    section "Creating New Documentation Structure"
    
    info "Creating organized directory structure..."
    
    # Define the new structure
    local new_dirs=(
        "$DOCS_DIR/01_PROJEKT"
        "$DOCS_DIR/01_PROJEKT/README_CHANGELOG"
        "$DOCS_DIR/01_PROJEKT/PLANUNG"
        "$DOCS_DIR/02_KOMPONENTEN"
        "$DOCS_DIR/02_KOMPONENTEN/ADMIN"
        "$DOCS_DIR/02_KOMPONENTEN/API"
        "$DOCS_DIR/02_KOMPONENTEN/AUTH"
        "$DOCS_DIR/02_KOMPONENTEN/CHAT"
        "$DOCS_DIR/02_KOMPONENTEN/STREAMING"
        "$DOCS_DIR/02_KOMPONENTEN/DOCUMENT_CONVERTER"
        "$DOCS_DIR/03_IMPLEMENTIERUNG"
        "$DOCS_DIR/03_IMPLEMENTIERUNG/MIGRATION"
        "$DOCS_DIR/03_IMPLEMENTIERUNG/INTEGRATION"
        "$DOCS_DIR/03_IMPLEMENTIERUNG/FIXES"
        "$DOCS_DIR/04_BERICHTE"
        "$DOCS_DIR/04_BERICHTE/ZUSAMMENFASSUNGEN"
        "$DOCS_DIR/04_BERICHTE/ANALYSEN"
        "$DOCS_DIR/04_BERICHTE/ISSUES"
        "$DOCS_DIR/05_ANLEITUNGEN"
        "$DOCS_DIR/05_ANLEITUNGEN/ENTWICKLUNG"
        "$DOCS_DIR/05_ANLEITUNGEN/DEPLOYMENT"
        "$DOCS_DIR/05_ANLEITUNGEN/TROUBLESHOOTING"
        "$DOCS_DIR/06_ARCHIV"
        "$DOCS_DIR/06_ARCHIV/VERALTET"
        "$DOCS_DIR/06_ARCHIV/BACKUP"
        "$DOCS_DIR/templates"
    )
    
    for dir in "${new_dirs[@]}"; do
        if mkdir -p "$dir"; then
            ((stats[directories_created]++))
        fi
    done
    
    success "Created ${stats[directories_created]} directories"
}

# Function to consolidate files
consolidate_files() {
    section "Consolidating Documentation Files"
    
    info "Moving and organizing documentation files..."
    
    # Define file mapping rules
    declare -A file_mappings=(
        ["README*.md"]="01_PROJEKT/README_CHANGELOG"
        ["CHANGELOG*.md"]="01_PROJEKT/README_CHANGELOG"
        ["CONTRIBUTING*.md"]="01_PROJEKT/README_CHANGELOG"
        ["SECURITY*.md"]="01_PROJEKT/README_CHANGELOG"
        ["PLAN*.md"]="01_PROJEKT/PLANUNG"
        ["MIGRATION*.md"]="03_IMPLEMENTIERUNG/MIGRATION"
        ["*ADMIN*.md"]="02_KOMPONENTEN/ADMIN"
        ["*API*.md"]="02_KOMPONENTEN/API"
        ["*AUTH*.md"]="02_KOMPONENTEN/AUTH"
        ["*LOGIN*.md"]="02_KOMPONENTEN/AUTH"
        ["*CHAT*.md"]="02_KOMPONENTEN/CHAT"
        ["*STREAMING*.md"]="02_KOMPONENTEN/STREAMING"
        ["*STREAM*.md"]="02_KOMPONENTEN/STREAMING"
        ["*CONVERTER*.md"]="02_KOMPONENTEN/DOCUMENT_CONVERTER"
        ["*FIX*.md"]="03_IMPLEMENTIERUNG/FIXES"
        ["*IMPLEMENTATION*.md"]="03_IMPLEMENTIERUNG/INTEGRATION"
        ["*INTEGRATION*.md"]="03_IMPLEMENTIERUNG/INTEGRATION"
        ["*SUMMARY*.md"]="04_BERICHTE/ZUSAMMENFASSUNGEN"
        ["*REPORT*.md"]="04_BERICHTE/ANALYSEN"
        ["*ISSUE*.md"]="04_BERICHTE/ISSUES"
        ["*GUIDE*.md"]="05_ANLEITUNGEN/ENTWICKLUNG"
        ["*TROUBLESHOOTING*.md"]="05_ANLEITUNGEN/TROUBLESHOOTING"
    )
    
    # Process files based on patterns
    for pattern in "${!file_mappings[@]}"; do
        target_dir="${DOCS_DIR}/${file_mappings[$pattern]}"
        
        # Find files matching pattern
        while IFS= read -r -d '' file; do
            if [[ -f "$file" ]]; then
                basename_file=$(basename "$file")
                target_path="$target_dir/$basename_file"
                
                # Check if file already exists in target
                if [[ -f "$target_path" ]]; then
                    # Compare content
                    if cmp -s "$file" "$target_path"; then
                        # Files are identical, archive the duplicate
                        mv "$file" "$DOCS_DIR/06_ARCHIV/VERALTET/${basename_file}.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
                        warning "Archived duplicate: $basename_file"
                        ((stats[files_archived]++))
                    else
                        # Files differ, keep both with timestamp
                        new_name="${basename_file%.md}_$(date +%Y%m%d_%H%M%S).md"
                        mv "$file" "$target_dir/$new_name" 2>/dev/null || true
                        warning "Renamed to avoid conflict: $new_name"
                    fi
                else
                    # Move file to target
                    mv "$file" "$target_path" 2>/dev/null || true
                    ((stats[files_consolidated]++))
                fi
            fi
        done < <(find "$DOCS_DIR" -maxdepth 2 -name "$pattern" -type f -print0 2>/dev/null)
    done
    
    info "Consolidated ${stats[files_consolidated]} files"
    info "Archived ${stats[files_archived]} duplicate files"
}

# Function to integrate konsolidierte documentation
integrate_konsolidierte() {
    section "Integrating Konsolidierte Documentation"
    
    if [[ -d "$KONSOLIDIERT_DIR" ]]; then
        info "Found konsolidierte documentation directory"
        
        # Move konsolidierte docs to appropriate locations
        if [[ -d "$KONSOLIDIERT_DIR/02_KOMPONENTEN" ]]; then
            info "Moving component documentation..."
            cp -r "$KONSOLIDIERT_DIR/02_KOMPONENTEN"/* "$DOCS_DIR/02_KOMPONENTEN/" 2>/dev/null || true
        fi
        
        # Keep the konsolidierte directory for reference
        mv "$KONSOLIDIERT_DIR" "$DOCS_DIR/00_KONSOLIDIERTE_REFERENZ" 2>/dev/null || true
        success "Integrated konsolidierte documentation"
    else
        warning "No konsolidierte documentation found"
    fi
}

# Function to create master index
create_master_index() {
    section "Creating Master Documentation Index"
    
    cat > "$DOCS_DIR/README.md" << 'EOF'
# NScale Assist Documentation

Welcome to the NScale Assist documentation. This directory contains all project documentation organized by category.

## 📁 Documentation Structure

### 01_PROJEKT - Project Documentation
Core project files including README, CHANGELOG, and planning documents.
- [README & Changelog](01_PROJEKT/README_CHANGELOG/)
- [Planning Documents](01_PROJEKT/PLANUNG/)

### 02_KOMPONENTEN - Component Documentation
Technical documentation for each system component.
- [Admin Panel](02_KOMPONENTEN/ADMIN/)
- [API](02_KOMPONENTEN/API/)
- [Authentication](02_KOMPONENTEN/AUTH/)
- [Chat Interface](02_KOMPONENTEN/CHAT/)
- [Streaming](02_KOMPONENTEN/STREAMING/)
- [Document Converter](02_KOMPONENTEN/DOCUMENT_CONVERTER/)

### 03_IMPLEMENTIERUNG - Implementation Details
Implementation guides, migration plans, and fixes.
- [Migration Guides](03_IMPLEMENTIERUNG/MIGRATION/)
- [Integration Documentation](03_IMPLEMENTIERUNG/INTEGRATION/)
- [Bug Fixes & Solutions](03_IMPLEMENTIERUNG/FIXES/)

### 04_BERICHTE - Reports & Analysis
Project reports, summaries, and analysis documents.
- [Summaries](04_BERICHTE/ZUSAMMENFASSUNGEN/)
- [Analysis Reports](04_BERICHTE/ANALYSEN/)
- [Issue Tracking](04_BERICHTE/ISSUES/)

### 05_ANLEITUNGEN - Guides & Tutorials
How-to guides for development, deployment, and troubleshooting.
- [Development Guides](05_ANLEITUNGEN/ENTWICKLUNG/)
- [Deployment Guides](05_ANLEITUNGEN/DEPLOYMENT/)
- [Troubleshooting](05_ANLEITUNGEN/TROUBLESHOOTING/)

### 06_ARCHIV - Archives
Archived and deprecated documentation.
- [Deprecated Docs](06_ARCHIV/VERALTET/)
- [Backups](06_ARCHIV/BACKUP/)

## 🔍 Quick Links

- [Project Overview](../README.md)
- [Contributing Guidelines](01_PROJEKT/README_CHANGELOG/CONTRIBUTING.md)
- [Security Policy](01_PROJEKT/README_CHANGELOG/SECURITY.md)
- [API Documentation](02_KOMPONENTEN/API/)
- [Troubleshooting Guide](05_ANLEITUNGEN/TROUBLESHOOTING/)

## 📝 Documentation Standards

When creating new documentation, please use the appropriate template:
- [General Document Template](templates/DOCUMENT_TEMPLATE.md)
- [TypeScript Documentation Template](templates/TYPESCRIPT_TEMPLATE.md)

## 🔄 Recent Updates

Check the [konsolidierte documentation reference](00_KONSOLIDIERTE_REFERENZ/) for the latest consolidation efforts.

---
*Last updated: $(date +%Y-%m-%d)*
*Total documents: $(find "$DOCS_DIR" -name "*.md" -type f | wc -l)*
EOF
    
    success "Created master documentation index"
}

# Function to create subdirectory indexes
create_subdirectory_indexes() {
    info "Creating index files for all subdirectories..."
    
    # Create index for each major directory
    for dir in "$DOCS_DIR"/0[1-6]_*; do
        if [[ -d "$dir" ]]; then
            create_directory_index "$dir"
            
            # Create indexes for subdirectories
            for subdir in "$dir"/*; do
                if [[ -d "$subdir" ]]; then
                    create_directory_index "$subdir"
                fi
            done
        fi
    done
}

# Function to create directory index
create_directory_index() {
    local dir=$1
    local index_file="$dir/README.md"
    local dir_name=$(basename "$dir")
    local parent_name=$(basename "$(dirname "$dir")")
    
    # Skip if index already exists
    if [[ -f "$index_file" ]]; then
        return
    fi
    
    # Create appropriate header based on directory
    case "$dir_name" in
        01_PROJEKT)
            cat > "$index_file" << 'EOF'
# Project Documentation

Core project documentation including README, CHANGELOG, and planning documents.

## Contents
EOF
            ;;
        02_KOMPONENTEN)
            cat > "$index_file" << 'EOF'
# Component Documentation

Technical documentation for all system components.

## Components
EOF
            ;;
        03_IMPLEMENTIERUNG)
            cat > "$index_file" << 'EOF'
# Implementation Documentation

Implementation guides, migration documentation, and integration details.

## Categories
EOF
            ;;
        04_BERICHTE)
            cat > "$index_file" << 'EOF'
# Reports and Analysis

Project reports, summaries, and analysis documents.

## Report Types
EOF
            ;;
        05_ANLEITUNGEN)
            cat > "$index_file" << 'EOF'
# Guides and Tutorials

How-to guides for development, deployment, and troubleshooting.

## Guide Categories
EOF
            ;;
        06_ARCHIV)
            cat > "$index_file" << 'EOF'
# Archived Documentation

Deprecated and archived documentation for historical reference.

## Archive Categories
EOF
            ;;
        *)
            echo "# $dir_name Documentation" > "$index_file"
            echo "" >> "$index_file"
            echo "## Contents" >> "$index_file"
            ;;
    esac
    
    echo "" >> "$index_file"
    
    # List subdirectories
    local has_subdirs=false
    for subdir in "$dir"/*/; do
        if [[ -d "$subdir" ]] && [[ "$subdir" != "$dir/*/" ]]; then
            has_subdirs=true
            subdir_name=$(basename "$subdir")
            echo "- [$subdir_name]($subdir_name/)" >> "$index_file"
        fi
    done
    
    if [[ "$has_subdirs" == true ]]; then
        echo "" >> "$index_file"
        echo "## Documents" >> "$index_file"
        echo "" >> "$index_file"
    fi
    
    # List markdown files
    local file_count=0
    for file in "$dir"/*.md; do
        if [[ -f "$file" ]] && [[ "$file" != "$index_file" ]]; then
            basename_file=$(basename "$file")
            echo "- [$basename_file]($basename_file)" >> "$index_file"
            ((file_count++))
        fi
    done
    
    if [[ $file_count -eq 0 ]] && [[ "$has_subdirs" == false ]]; then
        echo "*No documents in this directory yet.*" >> "$index_file"
    fi
    
    echo "" >> "$index_file"
    echo "---" >> "$index_file"
    echo "*Last updated: $(date +%Y-%m-%d)*" >> "$index_file"
}

# Function to clean up empty directories
cleanup_empty_dirs() {
    section "Cleaning Up Empty Directories"
    
    info "Removing empty directories..."
    
    # Find and remove empty directories
    find "$DOCS_DIR" -type d -empty -delete 2>/dev/null || true
    
    success "Cleaned up empty directories"
}

# Function to generate final report
generate_final_report() {
    section "Generating Final Report"
    
    local report_file="$ROOT_DIR/logs/consolidation_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Documentation Consolidation Report"
        echo "================================="
        echo "Date: $(date)"
        echo "Backup Location: $BACKUP_DIR"
        echo ""
        echo "Statistics:"
        echo "-----------"
        echo "Total files processed: ${stats[total_files]}"
        echo "Duplicate files found: ${stats[duplicates_found]}"
        echo "Files consolidated: ${stats[files_consolidated]}"
        echo "Files archived: ${stats[files_archived]}"
        echo "Directories created: ${stats[directories_created]}"
        echo ""
        echo "New Documentation Structure:"
        echo "---------------------------"
        tree "$DOCS_DIR" -d -L 3 2>/dev/null || ls -la "$DOCS_DIR"
        echo ""
        echo "Documentation Summary:"
        echo "---------------------"
        for dir in "$DOCS_DIR"/0[1-6]_*; do
            if [[ -d "$dir" ]]; then
                dir_name=$(basename "$dir")
                file_count=$(find "$dir" -name "*.md" -type f | wc -l)
                printf "%-30s: %3d files\n" "$dir_name" "$file_count"
            fi
        done
        echo ""
        echo "Duplicate files report: $DUPLICATE_REPORT"
        echo "Full log file: $LOG_FILE"
    } > "$report_file"
    
    success "Final report generated: $report_file"
    echo ""
    cat "$report_file"
}

# Main execution
main() {
    clear
    echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║          Documentation Consolidation Script                  ║${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Check directory
    check_directory
    
    # Analyze current structure
    analyze_current_structure
    
    # Show what will be done
    echo ""
    echo -e "${YELLOW}This script will:${NC}"
    echo "  1. Create a complete backup of the docs directory"
    echo "  2. Find and report duplicate documentation"
    echo "  3. Create a new organized directory structure"
    echo "  4. Consolidate files into appropriate categories"
    echo "  5. Archive duplicate files"
    echo "  6. Create comprehensive index files"
    echo "  7. Generate a detailed report"
    echo ""
    echo -e "${YELLOW}Backup location: $BACKUP_DIR${NC}"
    echo ""
    echo -e "${RED}⚠️  WARNING: This will reorganize your entire documentation structure!${NC}"
    echo ""
    read -p "Do you want to proceed? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Operation cancelled by user"
        exit 0
    fi
    
    # Execute consolidation steps
    create_backup
    find_duplicates
    create_new_structure
    consolidate_files
    integrate_konsolidierte
    create_master_index
    create_subdirectory_indexes
    cleanup_empty_dirs
    generate_final_report
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║        Documentation consolidation completed!                ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    info "Backup location: $BACKUP_DIR"
    info "Duplicate report: $DUPLICATE_REPORT"
    info "Full log: $LOG_FILE"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Review the duplicate report to identify redundant content"
    echo "  2. Check the new structure in $DOCS_DIR"
    echo "  3. Update any broken links in the codebase"
    echo "  4. Consider archiving old documentation in 06_ARCHIV"
    echo ""
}

# Run main function
main "$@"