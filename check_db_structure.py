#!/usr/bin/env python3
"""
Check database structure
"""
import sqlite3
import sys
import os

# Dateipfad zur Datenbank
db_path = "/opt/nscale-assist/data/db/users.db"

if not os.path.exists(db_path):
    print(f"Datenbank nicht gefunden: {db_path}")
    sys.exit(1)

# Verbindung zur Datenbank
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Zeige Tabellenstruktur
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
    table_schema = cursor.fetchone()
    if table_schema:
        print("Tabellenstruktur 'users':")
        print(table_schema[0])
        print()
    
    # Zeige alle Spalten
    cursor.execute("PRAGMA table_info(users)")
    columns = cursor.fetchall()
    print("Spalten in 'users':")
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    print()
    
    # Zeige erste paar Benutzer
    cursor.execute("SELECT * FROM users LIMIT 5")
    users = cursor.fetchall()
    
    if users:
        # Hole Spaltennamen
        column_names = [desc[0] for desc in cursor.description]
        print("Spaltennamen:", column_names)
        print()
        
        print("Benutzer:")
        for user in users:
            for i, value in enumerate(user):
                print(f"  {column_names[i]}: {value}")
            print()
    else:
        print("Keine Benutzer gefunden.")
        
except sqlite3.Error as e:
    print(f"Datenbankfehler: {e}")
finally:
    conn.close()