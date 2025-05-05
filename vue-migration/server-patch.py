"""
Patch-Skript für server.py, um das neue Vue.js-Projekt zu integrieren.
Dieses Skript fügt die notwendigen Änderungen an der server.py-Datei hinzu,
um das neue Vue.js-Projekt zu unterstützen.
"""

import re
import shutil
from pathlib import Path
import sys

# Pfad zur server.py-Datei
SERVER_PATH = Path("api/server.py")

# Prüfen, ob die Datei existiert
if not SERVER_PATH.exists():
    print(f"Fehler: {SERVER_PATH} nicht gefunden.")
    sys.exit(1)

# Erstellen eines Backups
BACKUP_PATH = SERVER_PATH.with_suffix(SERVER_PATH.suffix + ".bak")
shutil.copy2(SERVER_PATH, BACKUP_PATH)
print(f"Backup erstellt: {BACKUP_PATH}")

# Datei lesen
with open(SERVER_PATH, "r", encoding="utf-8") as file:
    server_code = file.read()

# Änderungen durchführen

# 1. StaticFiles-Mount für Vue-Anwendung hinzufügen
static_mount_pattern = r"app\.mount\(\"/static\", StaticFiles\(directory=\"frontend\"\), name=\"static\"\)"
static_mount_replacement = """# Statische Assets aus verschiedenen Verzeichnissen bereitstellen
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Vue-Anwendung bereitstellen (falls vorhanden)
vue_static_path = Path("static")
if vue_static_path.exists() and vue_static_path.is_dir():
    logger.info(f"Vue.js-Anwendung gefunden in {vue_static_path.absolute()}")
    app.mount("/vue", StaticFiles(directory="static"), name="vue")
else:
    logger.warning(f"Vue.js-Anwendung nicht gefunden in {vue_static_path.absolute()}")"""

server_code = re.sub(static_mount_pattern, static_mount_replacement, server_code)

# 2. Route für Vue-SPA hinzufügen
root_route_pattern = r"@app\.get\(\"/\"\)\nasync def root\(\):\n    return FileResponse\(\"frontend/index\.html\"\)"
root_route_replacement = """@app.get("/")
async def root():
    # Prüfe, ob Vue-App verfügbar ist
    vue_index = Path("static/index.html")
    if vue_index.exists():
        return FileResponse("static/index.html")
    return FileResponse("frontend/index.html")
    
@app.get("/app/{path:path}")
async def vue_app(path: str):
    # SPA-Route für Vue.js (alle Pfade unter /app/ führen zur Vue-SPA)
    vue_index = Path("static/index.html")
    if vue_index.exists():
        return FileResponse("static/index.html")
    # Fallback zur alten UI
    return FileResponse("frontend/index.html")"""

server_code = re.sub(root_route_pattern, root_route_replacement, server_code)

# Code zurückschreiben
with open(SERVER_PATH, "w", encoding="utf-8") as file:
    file.write(server_code)

print(f"Änderungen erfolgreich an {SERVER_PATH} durchgeführt.")
print("Die folgenden Änderungen wurden vorgenommen:")
print("1. StaticFiles-Mount für Vue-Anwendung hinzugefügt.")
print("2. Route für Vue-SPA hinzugefügt.")
print("Um die Änderungen rückgängig zu machen, können Sie das Backup verwenden: ")
print(f"cp {BACKUP_PATH} {SERVER_PATH}")