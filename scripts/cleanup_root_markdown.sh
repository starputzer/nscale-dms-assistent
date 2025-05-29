#!/bin/bash
# cleanup_root_markdown.sh - Move markdown files to documentation directories
# This script organizes markdown files from the root directory into appropriate documentation folders
# Author: NScale Assist Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ROOT_DIR="/opt/nscale-assist/app"
DOCS_DIR="${ROOT_DIR}/docs"
BACKUP_DIR="${ROOT_DIR}/backups/markdown_cleanup_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${ROOT_DIR}/logs/cleanup_root_markdown_$(date +%Y%m%d_%H%M%S).log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

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

# Function to check if running in correct directory
check_directory() {
    if [[ ! -d "$ROOT_DIR" ]]; then
        error_exit "Root directory $ROOT_DIR does not exist"
    fi
    cd "$ROOT_DIR" || error_exit "Cannot change to directory $ROOT_DIR"
}

# Function to create backup directory
create_backup_dir() {
    info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory"
    success "Backup directory created"
}

# Function to analyze markdown files
analyze_markdown_files() {
    info "Analyzing markdown files in root directory..."
    
    # Define markdown file categories based on naming patterns
    declare -A categories=(
        ["admin"]="ADMIN_|admin_"
        ["api"]="API_|api_"
        ["auth"]="AUTH_|auth_|LOGIN_|login_"
        ["streaming"]="STREAMING_|STREAM_|streaming_|stream_"
        ["migration"]="MIGRATION_|migration_"
        ["fixes"]="FIX_|fix_|FIXES_"
        ["implementation"]="IMPLEMENTATION_|implementation_|INTEGRATION_"
        ["changelog"]="CHANGELOG|CHANGES"
        ["readme"]="README"
        ["security"]="SECURITY"
        ["contributing"]="CONTRIBUTING"
        ["planning"]="PLAN|PLANNING"
        ["documentation"]="DOC_|DOCUMENTATION_"
        ["summary"]="SUMMARY_|summary_"
        ["report"]="REPORT_|report_"
    )
    
    # Find all markdown files in root (not in subdirectories)
    mapfile -t markdown_files < <(find "$ROOT_DIR" -maxdepth 1 -name "*.md" -type f | sort)
    
    if [[ ${#markdown_files[@]} -eq 0 ]]; then
        warning "No markdown files found in root directory"
        return 0
    fi
    
    info "Found ${#markdown_files[@]} markdown files in root directory"
    echo ""
    echo -e "${CYAN}File Analysis:${NC}"
    echo "----------------------------------------"
    
    # Categorize and display files
    for file in "${markdown_files[@]}"; do
        basename_file=$(basename "$file")
        categorized=false
        
        # Check each category
        for category in "${!categories[@]}"; do
            pattern="${categories[$category]}"
            if [[ "$basename_file" =~ $pattern ]]; then
                printf "%-50s -> %s/\n" "$basename_file" "$category" | tee -a "$LOG_FILE"
                categorized=true
                break
            fi
        done
        
        if [[ "$categorized" == false ]]; then
            printf "%-50s -> %s/\n" "$basename_file" "general" | tee -a "$LOG_FILE"
        fi
    done
    echo "----------------------------------------"
}

# Function to create documentation structure
create_docs_structure() {
    info "Creating documentation directory structure..."
    
    local subdirs=(
        "admin"
        "api"
        "auth"
        "streaming"
        "migration"
        "fixes"
        "implementation"
        "project"
        "architecture"
        "guides"
        "reports"
        "summaries"
        "archived"
    )
    
    for subdir in "${subdirs[@]}"; do
        mkdir -p "$DOCS_DIR/$subdir" || warning "Failed to create $DOCS_DIR/$subdir"
    done
    
    success "Documentation directory structure created"
}

# Function to organize markdown files
organize_markdown_files() {
    info "Organizing markdown files..."
    
    local moved_count=0
    local skipped_count=0
    local special_files=0
    
    # Process each markdown file
    mapfile -t markdown_files < <(find "$ROOT_DIR" -maxdepth 1 -name "*.md" -type f | sort)
    
    for file in "${markdown_files[@]}"; do
        basename_file=$(basename "$file")
        target_subdir=""
        
        # Determine target subdirectory based on file name
        case "$basename_file" in
            README.md|CONTRIBUTING.md|SECURITY.md)
                # These stay in root
                info "Keeping in root: $basename_file"
                ((special_files++))
                continue
                ;;
            CHANGELOG*)
                target_subdir="project"
                ;;
            ADMIN_*|admin_*)
                target_subdir="admin"
                ;;
            API_*|api_*)
                target_subdir="api"
                ;;
            AUTH_*|auth_*|LOGIN_*|login_*)
                target_subdir="auth"
                ;;
            STREAMING_*|STREAM_*|streaming_*|stream_*)
                target_subdir="streaming"
                ;;
            MIGRATION_*|migration_*)
                target_subdir="migration"
                ;;
            FIX_*|fix_*|FIXES_*)
                target_subdir="fixes"
                ;;
            IMPLEMENTATION_*|implementation_*|INTEGRATION_*)
                target_subdir="implementation"
                ;;
            *SUMMARY*|*summary*)
                target_subdir="summaries"
                ;;
            *REPORT*|*report*)
                target_subdir="reports"
                ;;
            PLAN*|PLANNING*)
                target_subdir="project"
                ;;
            *GUIDE*|*guide*)
                target_subdir="guides"
                ;;
            DOC_*|DOCUMENTATION_*)
                target_subdir="guides"
                ;;
            *)
                target_subdir="project"
                ;;
        esac
        
        # Create full target path
        target_dir="$DOCS_DIR/$target_subdir"
        target_path="$target_dir/$basename_file"
        
        # Check if target file already exists
        if [[ -f "$target_path" ]]; then
            # Create unique name
            timestamp=$(date +%Y%m%d_%H%M%S)
            new_basename="${basename_file%.md}_${timestamp}.md"
            target_path="$target_dir/$new_basename"
            warning "File exists, renaming to: $new_basename"
        fi
        
        # Backup the file
        cp "$file" "$BACKUP_DIR/" || error_exit "Failed to backup $basename_file"
        
        # Move the file
        mv "$file" "$target_path" || {
            warning "Failed to move $basename_file, restoring from backup"
            cp "$BACKUP_DIR/$basename_file" "$file"
            ((skipped_count++))
            continue
        }
        
        success "Moved: $basename_file -> docs/$target_subdir/"
        ((moved_count++))
    done
    
    info "Summary: Moved $moved_count files, Skipped $skipped_count files, Kept $special_files special files"
}

# Function to create index files
create_index_files() {
    info "Creating index files for documentation directories..."
    
    # Create main index
    cat > "$DOCS_DIR/INDEX.md" << 'EOF'
# Documentation Index

This directory contains all project documentation organized by category.

## Directory Structure

- **admin/** - Admin panel related documentation
- **api/** - API documentation and integration guides
- **auth/** - Authentication and authorization documentation
- **streaming/** - Streaming functionality documentation
- **migration/** - Migration guides and plans
- **fixes/** - Bug fixes and issue resolutions
- **implementation/** - Implementation details and integration docs
- **project/** - Project-level documentation (README, CHANGELOG, etc.)
- **architecture/** - System architecture documentation
- **guides/** - How-to guides and tutorials
- **reports/** - Analysis reports and findings
- **summaries/** - Summary documents
- **archived/** - Archived/deprecated documentation

## Quick Links

- [Project README](../README.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Security Policy](../SECURITY.md)

## Documentation Standards

Please follow the [Documentation Template](templates/DOCUMENT_TEMPLATE.md) when creating new documentation.

---
*Last updated: $(date +%Y-%m-%d)*
EOF
    
    # Create index for each subdirectory
    for subdir in "$DOCS_DIR"/*; do
        if [[ -d "$subdir" && "$subdir" != "$DOCS_DIR/templates" ]]; then
            subdir_name=$(basename "$subdir")
            create_subdir_index "$subdir" "$subdir_name"
        fi
    done
    
    success "Index files created"
}

# Function to create subdirectory index
create_subdir_index() {
    local dir=$1
    local name=$2
    local index_file="$dir/README.md"
    
    # Skip if already exists
    if [[ -f "$index_file" ]]; then
        return
    fi
    
    cat > "$index_file" << EOF
# ${name^} Documentation

## Overview

This directory contains documentation related to ${name}.

## Contents

EOF
    
    # List markdown files in the directory
    for file in "$dir"/*.md; do
        if [[ -f "$file" && "$file" != "$index_file" ]]; then
            basename_file=$(basename "$file")
            echo "- [$basename_file]($basename_file)" >> "$index_file"
        fi
    done
    
    echo "" >> "$index_file"
    echo "---" >> "$index_file"
    echo "*Last updated: $(date +%Y-%m-%d)*" >> "$index_file"
}

# Function to create summary report
create_summary() {
    local summary_file="$ROOT_DIR/logs/markdown_cleanup_summary_$(date +%Y%m%d_%H%M%S).txt"
    
    info "Creating summary report..."
    
    {
        echo "Markdown Files Cleanup Summary"
        echo "=============================="
        echo "Date: $(date)"
        echo "Backup Directory: $BACKUP_DIR"
        echo ""
        echo "Files Moved:"
        echo "------------"
        grep "SUCCESS: Moved:" "$LOG_FILE" | sed 's/.*SUCCESS: Moved: /  - /' || echo "  None"
        echo ""
        echo "Files Kept in Root:"
        echo "-------------------"
        grep "Keeping in root:" "$LOG_FILE" | sed 's/.*Keeping in root: /  - /' || echo "  None"
        echo ""
        echo "Documentation Structure:"
        echo "----------------------"
        tree -d "$DOCS_DIR" 2>/dev/null || ls -la "$DOCS_DIR"
        echo ""
        echo "Full log available at: $LOG_FILE"
    } > "$summary_file"
    
    success "Summary report created: $summary_file"
    echo ""
    cat "$summary_file"
}

# Main execution
main() {
    clear
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}     Markdown Files Cleanup Script${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    
    # Change to correct directory
    check_directory
    
    # Analyze current state
    analyze_markdown_files
    
    # Ask for confirmation
    echo ""
    echo -e "${YELLOW}This script will:${NC}"
    echo "  1. Create a backup of all markdown files"
    echo "  2. Keep README.md, CONTRIBUTING.md, and SECURITY.md in root"
    echo "  3. Move other markdown files to organized subdirectories in docs/"
    echo "  4. Create index files for easy navigation"
    echo "  5. Generate a summary report"
    echo ""
    echo -e "${YELLOW}Backup will be created at: $BACKUP_DIR${NC}"
    echo ""
    read -p "Do you want to proceed? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Operation cancelled by user"
        exit 0
    fi
    
    # Create backup directory
    create_backup_dir
    
    # Create documentation structure
    create_docs_structure
    
    # Organize files
    organize_markdown_files
    
    # Create index files
    create_index_files
    
    # Create summary
    create_summary
    
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}     Cleanup completed successfully!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    info "Backup location: $BACKUP_DIR"
    info "Log file: $LOG_FILE"
    echo ""
}

# Run main function
main "$@"