#!/bin/bash
# Script to periodically update the documentation dashboard

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo "📊 Updating Documentation Dashboard..."
cd "$APP_DIR"

# Run the dashboard generator
python scripts/generate_doc_dashboard.py

# Optional: Add to cron for periodic updates
# Example crontab entry (runs daily at 2 AM):
# 0 2 * * * /opt/nscale-assist/app/scripts/update_doc_dashboard.sh

echo "✅ Dashboard updated successfully!"