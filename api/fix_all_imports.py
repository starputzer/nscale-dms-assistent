#!/usr/bin/env python3
"""
Skript zum Beheben aller relativen Import-Fehler in server.py
"""

import re
import sys
import os

def fix_all_imports(file_path):
    # Datei lesen
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    print(f"Bearbeite Datei: {file_path}")
    
    # Alle relativen Imports durch absolute ersetzen
    original_content = content
    
    # Ersetze alle from .<module> import ... Muster
    content = re.sub(
        r'from \.([\w_]+) import',
        r'from api.\1 import',
        content
    )
    
    # Ersetze auch verschachtelte Imports wie from .utils.helper import ...
    content = re.sub(
        r'from \.([\w_]+)\.([\w_]+) import',
        r'from api.\1.\2 import',
        content
    )
    
    # Suche nach weiteren Mustern von relativen Imports
    relative_imports = re.findall(r'from \.[.\w_]+ import', content)
    if relative_imports:
        print("Warnung: Einige relative Imports könnten nicht korrekt ersetzt worden sein:")
        for imp in relative_imports:
            print(f"  - {imp}")
    
    if content != original_content:
        print("Relative Imports wurden durch absolute Imports ersetzt")
        
        # Datei schreiben
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(content)
        
        print(f"Änderungen in {file_path} gespeichert")
        return True
    else:
        print("Keine Änderungen vorgenommen - keine relativen Imports gefunden")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "/opt/nscale-assist/app/api/server.py"
    
    if not os.path.exists(file_path):
        print(f"Fehler: Die Datei {file_path} existiert nicht.")
        sys.exit(1)
    
    if fix_all_imports(file_path):
        print("\nImport-Fix erfolgreich angewendet!")
        print("\nFühren Sie den Server mit folgendem Befehl aus:")
        print(f"cd /opt/nscale-assist/app && python api/server.py")
    else:
        print("\nKeine Änderungen vorgenommen.")