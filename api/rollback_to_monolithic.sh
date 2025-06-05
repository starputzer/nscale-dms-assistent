#!/bin/bash
# Rollback to monolithic server

echo "Rolling back to monolithic server..."

# Check if monolithic version exists
if [ -f "server_monolithic.py" ]; then
    # Backup current clean version
    cp server.py server_clean_backup.py
    
    # Restore monolithic version
    cp server_monolithic.py server.py
    
    echo "✅ Rollback complete!"
    echo "   - Clean version backed up to: server_clean_backup.py"
    echo "   - Monolithic version restored to: server.py"
else
    echo "❌ Error: server_monolithic.py not found!"
    echo "   Looking for other backups..."
    
    # List available backups
    ls -la server*.py | grep -v "server.py$"
fi