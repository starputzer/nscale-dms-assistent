#!/usr/bin/env python3
"""
Script to update server.py to use the new centralized routes configuration
"""

import re
import shutil
from datetime import datetime

# Create backup
shutil.copy('server.py', f'server.py.backup-{datetime.now().strftime("%Y%m%d_%H%M%S")}')

# Read the current server.py
with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for routes_config at the top
import_section = """import sys
import os

# Füge das Projektverzeichnis zum Python-Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import centralized routes configuration
from api.routes_config import (
    API_VERSION, API_BASE_VERSIONED,
    AUTH_ROUTES, SESSION_ROUTES, ADMIN_ROUTES,
    DOCUMENT_ROUTES, FEEDBACK_ROUTES, SYSTEM_ROUTES,
    build_api_url
)
"""

# Replace the import section
content = re.sub(
    r'import sys\nimport os\n\n# Füge das Projektverzeichnis zum Python-Pfad hinzu\nsys\.path\.append.*?\n',
    import_section + '\n',
    content,
    flags=re.DOTALL
)

# Replace hardcoded routes with centralized ones
replacements = [
    # Auth routes
    (r'@app\.post\("/api/v1/login"\)', f'@app.post(build_api_url(AUTH_ROUTES.LOGIN))'),
    (r'@app\.post\("/api/v1/logout"\)', f'@app.post(build_api_url(AUTH_ROUTES.LOGOUT))'),
    (r'@app\.post\("/api/v1/refresh"\)', f'@app.post(build_api_url(AUTH_ROUTES.REFRESH))'),
    
    # Session routes
    (r'@app\.get\("/api/v1/sessions"\)', f'@app.get(build_api_url(SESSION_ROUTES.LIST))'),
    (r'@app\.post\("/api/v1/sessions"\)', f'@app.post(build_api_url(SESSION_ROUTES.CREATE))'),
    (r'@app\.post\("/api/v1/ask"\)', f'@app.post(build_api_url(SESSION_ROUTES.ASK))'),
    
    # Admin user routes
    (r'@app\.get\("/api/v1/admin/users"\)', f'@app.get(build_api_url(ADMIN_ROUTES.USERS.LIST))'),
    (r'@app\.get\("/api/v1/admin/users/count"\)', f'@app.get(build_api_url(ADMIN_ROUTES.USERS.COUNT))'),
    (r'@app\.get\("/api/v1/admin/users/stats"\)', f'@app.get(build_api_url(ADMIN_ROUTES.USERS.STATS))'),
    (r'@app\.delete\("/api/v1/admin/users/\{user_id\}"\)', f'@app.delete(build_api_url(ADMIN_ROUTES.USERS.delete("{{user_id}}")))'),
    (r'@app\.patch\("/api/v1/admin/users/\{user_id\}/role"\)', f'@app.patch(build_api_url(ADMIN_ROUTES.USERS.update_role("{{user_id}}")))'),
    
    # Admin feedback routes
    (r'@app\.get\("/api/v1/admin/feedback"\)', f'@app.get(build_api_url(ADMIN_ROUTES.FEEDBACK.LIST))'),
    (r'@app\.get\("/api/v1/admin/feedback/negative"\)', f'@app.get(build_api_url(ADMIN_ROUTES.FEEDBACK.NEGATIVE))'),
    
    # System routes
    (r'@app\.get\("/api/v1/motd"\)', f'@app.get(build_api_url(SYSTEM_ROUTES.MOTD))'),
    
    # Feedback routes
    (r'@app\.post\("/api/v1/feedback"\)', f'@app.post(build_api_url(FEEDBACK_ROUTES.SUBMIT))'),
]

# Apply replacements
for old, new in replacements:
    content = re.sub(old, new, content)

# Write the updated content
with open('server_updated.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Server routes updated successfully!")
print("📄 Updated file saved as: server_updated.py")
print("📋 Original backed up as: server.py.backup-*")
print("\nTo apply changes:")
print("1. Review server_updated.py")
print("2. If everything looks good: mv server_updated.py server.py")
print("3. Restart the server")