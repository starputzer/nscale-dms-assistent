#!/bin/bash
# cleanup_root_python.sh - Reorganize Python files into proper directories
# This script moves Python files from the root directory to appropriate subdirectories
# Author: NScale Assist Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ROOT_DIR="/opt/nscale-assist/app"
BACKUP_DIR="${ROOT_DIR}/backups/python_cleanup_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${ROOT_DIR}/logs/cleanup_root_python_$(date +%Y%m%d_%H%M%S).log"

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

# Function to identify Python files in root
identify_python_files() {
    info "Identifying Python files in root directory..."
    
    # Define Python file categories
    declare -A categories=(
        ["auth"]="auth|login|password|user"
        ["api"]="api|server|handler|endpoint"
        ["data"]="data|db|database"
        ["test"]="test_|_test"
        ["scripts"]="setup|create|update|fix|debug"
        ["modules"]="module|util|helper"
    )
    
    # Find all Python files in root (not in subdirectories)
    mapfile -t python_files < <(find "$ROOT_DIR" -maxdepth 1 -name "*.py" -type f | sort)
    
    if [[ ${#python_files[@]} -eq 0 ]]; then
        warning "No Python files found in root directory"
        return 0
    fi
    
    info "Found ${#python_files[@]} Python files in root directory"
    
    # Categorize files
    for file in "${python_files[@]}"; do
        basename_file=$(basename "$file")
        categorized=false
        
        # Check each category
        for category in "${!categories[@]}"; do
            pattern="${categories[$category]}"
            if [[ "$basename_file" =~ $pattern ]]; then
                echo "$basename_file -> $category/" | tee -a "$LOG_FILE"
                categorized=true
                break
            fi
        done
        
        if [[ "$categorized" == false ]]; then
            echo "$basename_file -> scripts/ (uncategorized)" | tee -a "$LOG_FILE"
        fi
    done
}

# Function to organize Python files
organize_python_files() {
    info "Organizing Python files..."
    
    local moved_count=0
    local skipped_count=0
    
    # Process each Python file
    mapfile -t python_files < <(find "$ROOT_DIR" -maxdepth 1 -name "*.py" -type f | sort)
    
    for file in "${python_files[@]}"; do
        basename_file=$(basename "$file")
        target_dir=""
        
        # Determine target directory based on file name/content
        if [[ "$basename_file" =~ (auth|login|password|user) ]]; then
            target_dir="modules/auth"
        elif [[ "$basename_file" =~ (api|server|handler|endpoint) ]]; then
            target_dir="api"
        elif [[ "$basename_file" =~ (data|db|database) ]]; then
            target_dir="data/scripts"
        elif [[ "$basename_file" =~ (test_|_test) ]]; then
            target_dir="test"
        elif [[ "$basename_file" =~ (setup|create|update|fix|debug|analyze) ]]; then
            target_dir="scripts"
        else
            # Check file content for imports to determine category
            if grep -q "from modules" "$file" 2>/dev/null; then
                target_dir="modules"
            else
                target_dir="scripts"
            fi
        fi
        
        # Create target directory if it doesn't exist
        mkdir -p "$ROOT_DIR/$target_dir"
        
        # Backup and move file
        target_path="$ROOT_DIR/$target_dir/$basename_file"
        
        # Check if target file already exists
        if [[ -f "$target_path" ]]; then
            warning "Target file already exists: $target_path"
            warning "Skipping: $basename_file"
            ((skipped_count++))
            continue
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
        
        success "Moved: $basename_file -> $target_dir/"
        ((moved_count++))
    done
    
    info "Summary: Moved $moved_count files, Skipped $skipped_count files"
}

# Function to update imports in moved files
update_imports() {
    info "Updating imports in moved Python files..."
    
    # This is a placeholder for import update logic
    # In a real scenario, you would parse and update imports
    warning "Import updates need to be done manually or with a more sophisticated tool"
    info "Consider using tools like 'isort' or '2to3' for import management"
}

# Function to create summary report
create_summary() {
    local summary_file="$ROOT_DIR/logs/python_cleanup_summary_$(date +%Y%m%d_%H%M%S).txt"
    
    info "Creating summary report..."
    
    {
        echo "Python Files Cleanup Summary"
        echo "============================"
        echo "Date: $(date)"
        echo "Backup Directory: $BACKUP_DIR"
        echo ""
        echo "Files Moved:"
        echo "------------"
        grep "SUCCESS: Moved:" "$LOG_FILE" | sed 's/.*SUCCESS: Moved: /  - /'
        echo ""
        echo "Files Skipped:"
        echo "--------------"
        grep "WARNING: Skipping:" "$LOG_FILE" | sed 's/.*WARNING: Skipping: /  - /'
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
    echo -e "${BLUE}     Python Files Cleanup Script${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    
    # Check if running as root (optional)
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root user"
    fi
    
    # Change to correct directory
    check_directory
    
    # Show current status
    info "Scanning for Python files in root directory..."
    identify_python_files
    
    # Ask for confirmation
    echo ""
    echo -e "${YELLOW}This script will:${NC}"
    echo "  1. Create a backup of all Python files"
    echo "  2. Move Python files to appropriate subdirectories"
    echo "  3. Create a summary report"
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
    
    # Organize files
    organize_python_files
    
    # Update imports (optional)
    # update_imports
    
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