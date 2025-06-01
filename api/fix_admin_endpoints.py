#!/usr/bin/env python3
"""
Script to fix admin endpoint paths in server.py
Changes /api/admin/* to /api/v1/admin/*
"""

import re
import shutil
from datetime import datetime

# Backup the current server.py
backup_name = f"server.py.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
shutil.copy("server.py", backup_name)
print(f"✅ Created backup: {backup_name}")

# Read the current content
with open("server.py", "r", encoding="utf-8") as f:
    content = f.read()

# Define replacements - fix admin endpoint paths
replacements = [
    # Admin user endpoints
    (r'@app\.get\("/api/admin/users"\)', '@app.get("/api/v1/admin/users")'),
    (r'@app\.post\("/api/admin/users"\)', '@app.post("/api/v1/admin/users")'),
    (r'@app\.delete\("/api/admin/users/\{user_id\}"\)', '@app.delete("/api/v1/admin/users/{user_id}")'),
    (r'@app\.put\("/api/admin/users/\{user_id\}/role"\)', '@app.put("/api/v1/admin/users/{user_id}/role")'),
    
    # Admin users count and stats endpoints (add them if missing)
    (r'# Admin-Benutzer-Endpunkte', '''# Admin-Benutzer-Endpunkte

@app.get("/api/v1/admin/users/count")
async def get_admin_users_count(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt die Anzahl der Benutzer nach Rolle zurück (nur für Admins)"""
    try:
        user_manager = UserManager()
        all_users = user_manager.get_all_users(user_data['user_id'])
        
        if all_users is None:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        
        # Zähle Benutzer nach Rolle
        count_by_role = {}
        for user in all_users:
            role = user.get('role', 'user')
            count_by_role[role] = count_by_role.get(role, 0) + 1
        
        return {
            "total": len(all_users),
            "by_role": count_by_role
        }
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Benutzeranzahl: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/admin/users/stats")
async def get_admin_users_stats(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt detaillierte Benutzerstatistiken zurück (nur für Admins)"""
    try:
        user_manager = UserManager()
        all_users = user_manager.get_all_users(user_data['user_id'])
        
        if all_users is None:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        
        # Berechne Statistiken
        total_users = len(all_users)
        active_today = 0
        active_week = 0
        active_month = 0
        
        now = time.time()
        day_ago = now - (24 * 60 * 60)
        week_ago = now - (7 * 24 * 60 * 60)
        month_ago = now - (30 * 24 * 60 * 60)
        
        for user in all_users:
            last_login = user.get('last_login', 0)
            if last_login > day_ago:
                active_today += 1
            if last_login > week_ago:
                active_week += 1
            if last_login > month_ago:
                active_month += 1
        
        return {
            "total_users": total_users,
            "active_today": active_today,
            "active_this_week": active_week,
            "active_this_month": active_month,
            "users_by_role": {
                "admin": sum(1 for u in all_users if u.get('role') == 'admin'),
                "user": sum(1 for u in all_users if u.get('role') == 'user')
            }
        }
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Benutzerstatistiken: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin-Benutzer-Endpunkte'''),
    
    # Other admin endpoints
    (r'@app\.post\("/api/admin/', '@app.post("/api/v1/admin/'),
    (r'@app\.get\("/api/admin/', '@app.get("/api/v1/admin/'),
    (r'@app\.put\("/api/admin/', '@app.put("/api/v1/admin/'),
    (r'@app\.delete\("/api/admin/', '@app.delete("/api/v1/admin/'),
]

# Apply replacements
modified = False
for old, new in replacements:
    if old in content or re.search(old, content):
        content = re.sub(old, new, content)
        modified = True
        print(f"✅ Fixed: {old[:50]}...")

# Save the modified content
if modified:
    with open("server.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("\n✨ Admin endpoints fixed successfully!")
    print("The following changes were made:")
    print("- /api/admin/* → /api/v1/admin/*")
    print("- Added missing /api/v1/admin/users/count endpoint")
    print("- Added missing /api/v1/admin/users/stats endpoint")
else:
    print("⚠️  No changes needed - endpoints may already be correct")

print("\nNext steps:")
print("1. Restart the Python server:")
print("   pkill -f 'python.*server.py'")
print("   python server.py > server.log 2>&1 &")