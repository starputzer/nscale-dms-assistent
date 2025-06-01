#!/bin/bash
# Script to push GitHub issues created by create-github-issues.sh
# Date: 2025-05-30

set -e

echo "🚀 Pushing GitHub Issues to Repository"
echo "===================================="

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "   Please install it with: sudo apt install gh"
    echo "   Then authenticate with: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub."
    echo "   Please run: gh auth login"
    exit 1
fi

# Get current repository
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Repository: $REPO"
echo ""

# Counter for created issues
CREATED=0

# Function to create issue from JSON file
create_github_issue() {
    local json_file="$1"
    
    if [[ ! -f "$json_file" ]]; then
        echo "❌ File not found: $json_file"
        return 1
    fi
    
    # Extract fields from JSON
    title=$(jq -r '.title' "$json_file")
    body=$(jq -r '.body' "$json_file")
    labels=$(jq -r '.labels | join(",")' "$json_file")
    milestone=$(jq -r '.milestone // empty' "$json_file")
    
    echo "Creating issue: $title"
    
    # Build gh command
    gh_cmd="gh issue create --title \"$title\" --body \"$body\""
    
    if [[ -n "$labels" ]]; then
        gh_cmd="$gh_cmd --label \"$labels\""
    fi
    
    if [[ -n "$milestone" && "$milestone" != "null" ]]; then
        gh_cmd="$gh_cmd --milestone \"$milestone\""
    fi
    
    # Execute command
    if eval "$gh_cmd"; then
        echo "✅ Issue created successfully"
        ((CREATED++))
    else
        echo "❌ Failed to create issue"
    fi
    
    echo ""
}

# Process all issue JSON files
for json_file in issue_*.json; do
    if [[ -f "$json_file" ]]; then
        create_github_issue "$json_file"
        # Clean up JSON file after successful creation
        rm -f "$json_file"
    fi
done

echo "===================================="
echo "✅ Created $CREATED issues successfully!"
echo ""
echo "View issues at: https://github.com/$REPO/issues"