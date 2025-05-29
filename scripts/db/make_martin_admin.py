#!/usr/bin/env python3
"""
Make martin@danglefeet.com an admin
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
    # Update martin@danglefeet.com to admin
    email = "martin@danglefeet.com"
    
    cursor.execute("UPDATE users SET role = 'admin' WHERE email = ?", (email,))
    affected_rows = cursor.rowcount
    
    if affected_rows > 0:
        conn.commit()
        print(f"Benutzer '{email}' wurde erfolgreich zum Administrator gemacht.")
    else:
        print(f"Kein Benutzer mit E-Mail '{email}' gefunden.")
    
    # Zeige den aktualisierten Benutzer
    cursor.execute("SELECT id, email, role FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if user:
        print(f"\nAktualisierter Benutzer:")
        print(f"ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")
        
except sqlite3.Error as e:
    print(f"Datenbankfehler: {e}")
    conn.rollback()
finally:
    conn.close()