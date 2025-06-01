#!/bin/bash
"""
doc_maintenance.sh - Run all documentation maintenance checks

This script runs all documentation quality checks and maintenance tasks:
1. Check metadata headers in all markdown files
2. Validate internal links
3. Generate/update index files

Usage:
    ./doc_maintenance.sh [options] [directory]
    
Options:
    -h, --help          Show this help message
    -q, --quiet         Suppress non-error output
    -f, --fix           Attempt to fix issues (generate indices)
    -r, --recursive     Generate indices recursively for subdirectories
    --no-metadata       Skip metadata check
    --no-links          Skip link validation
    --no-index          Skip index generation
    
Examples:
    ./doc_maintenance.sh                    # Run all checks on default directories
    ./doc_maintenance.sh /path/to/docs      # Run checks on specific directory
    ./doc_maintenance.sh -f                 # Run checks and generate indices
    ./doc_maintenance.sh --no-links -q      # Run only metadata check quietly
"""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default settings
QUIET=false
FIX_MODE=false
RECURSIVE=false
RUN_METADATA=true
RUN_LINKS=true
RUN_INDEX=true
TARGET_DIR=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            grep '^"""' "$0" | sed 's/"""//g'
            exit 0
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -f|--fix)
            FIX_MODE=true
            shift
            ;;
        -r|--recursive)
            RECURSIVE=true
            shift
            ;;
        --no-metadata)
            RUN_METADATA=false
            shift
            ;;
        --no-links)
            RUN_LINKS=false
            shift
            ;;
        --no-index)
            RUN_INDEX=false
            shift
            ;;
        *)
            TARGET_DIR="$1"
            shift
            ;;
    esac
done

# Function to print colored output
print_header() {
    if [ "$QUIET" = false ]; then
        echo -e "\n${BLUE}===================================================${NC}"
        echo -e "${BLUE}$1${NC}"
        echo -e "${BLUE}===================================================${NC}\n"
    fi
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    if [ "$QUIET" = false ]; then
        echo -e "${YELLOW}⚠️  $1${NC}"
    fi
}

print_info() {
    if [ "$QUIET" = false ]; then
        echo -e "$1"
    fi
}

# Main execution
print_header "Documentation Maintenance Tool"
print_info "Starting documentation quality checks..."
print_info "Script directory: $SCRIPT_DIR"

# Track overall status
OVERALL_STATUS=0

# Make scripts executable if needed
for script in "$SCRIPT_DIR/check_doc_metadata.py" "$SCRIPT_DIR/check_doc_links.py" "$SCRIPT_DIR/generate_doc_index.py"; do
    if [ -f "$script" ] && [ ! -x "$script" ]; then
        chmod +x "$script"
        print_info "Made $script executable"
    fi
done

# 1. Check metadata headers
if [ "$RUN_METADATA" = true ]; then
    print_header "1. Checking Metadata Headers"
    
    if [ -f "$SCRIPT_DIR/check_doc_metadata.py" ]; then
        if [ -n "$TARGET_DIR" ]; then
            python3 "$SCRIPT_DIR/check_doc_metadata.py" "$TARGET_DIR"
        else
            python3 "$SCRIPT_DIR/check_doc_metadata.py"
        fi
        METADATA_STATUS=$?
        
        if [ $METADATA_STATUS -eq 0 ]; then
            print_success "All files have proper metadata headers"
        else
            print_error "Some files have metadata issues"
            OVERALL_STATUS=1
        fi
    else
        print_error "check_doc_metadata.py not found!"
        OVERALL_STATUS=1
    fi
fi

# 2. Validate internal links
if [ "$RUN_LINKS" = true ]; then
    print_header "2. Validating Internal Links"
    
    if [ -f "$SCRIPT_DIR/check_doc_links.py" ]; then
        if [ -n "$TARGET_DIR" ]; then
            python3 "$SCRIPT_DIR/check_doc_links.py" "$TARGET_DIR"
        else
            python3 "$SCRIPT_DIR/check_doc_links.py"
        fi
        LINKS_STATUS=$?
        
        if [ $LINKS_STATUS -eq 0 ]; then
            print_success "All internal links are valid"
        else
            print_error "Some broken links found"
            OVERALL_STATUS=1
        fi
    else
        print_error "check_doc_links.py not found!"
        OVERALL_STATUS=1
    fi
fi

# 3. Generate/update index files
if [ "$RUN_INDEX" = true ] && [ "$FIX_MODE" = true ]; then
    print_header "3. Generating Index Files"
    
    if [ -f "$SCRIPT_DIR/generate_doc_index.py" ]; then
        INDEX_ARGS=""
        if [ "$RECURSIVE" = true ]; then
            INDEX_ARGS="--recursive"
        fi
        
        if [ -n "$TARGET_DIR" ]; then
            python3 "$SCRIPT_DIR/generate_doc_index.py" "$TARGET_DIR" $INDEX_ARGS
        else
            python3 "$SCRIPT_DIR/generate_doc_index.py" $INDEX_ARGS
        fi
        INDEX_STATUS=$?
        
        if [ $INDEX_STATUS -eq 0 ]; then
            print_success "Index files generated successfully"
        else
            print_error "Error generating index files"
            OVERALL_STATUS=1
        fi
    else
        print_error "generate_doc_index.py not found!"
        OVERALL_STATUS=1
    fi
elif [ "$RUN_INDEX" = true ]; then
    print_warning "Skipping index generation (use -f flag to generate)"
fi

# Summary
print_header "Maintenance Summary"

if [ $OVERALL_STATUS -eq 0 ]; then
    print_success "All documentation checks passed!"
else
    print_error "Some documentation issues found"
    print_info ""
    print_info "To fix issues:"
    print_info "  - For metadata issues: Add proper headers to markdown files"
    print_info "  - For broken links: Update or remove invalid links"
    print_info "  - To generate indices: Run with -f flag"
fi

# Exit with overall status
exit $OVERALL_STATUS