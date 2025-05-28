#!/usr/bin/env python3
"""
Skript zum Beheben des relativen Import-Fehlers in server.py
"""

import re
import sys
import os

def fix_imports(file_path):
    # Datei lesen
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    print(f"Bearbeite Datei: {file_path}")
    
    # Relative Imports durch absolute ersetzen
    content = re.sub(
        r'from \.(batch_handler_fix|session_handler|server_streaming_fix) import',
        r'from api.\1 import',
        content
    )
    
    print("Relativer Import ersetzt durch absoluten Import")
    
    # Datei schreiben
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(content)
    
    print(f"Änderungen in {file_path} gespeichert")
    return True

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "/opt/nscale-assist/app/api/server.py"
    
    if not os.path.exists(file_path):
        print(f"Fehler: Die Datei {file_path} existiert nicht.")
        sys.exit(1)
    
    if fix_imports(file_path):
        print("Import-Fix erfolgreich angewendet!")
        print("\nFühren Sie den Server mit folgendem Befehl aus:")
        print(f"cd /opt/nscale-assist/app && python api/server.py")