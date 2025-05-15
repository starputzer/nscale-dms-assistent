#!/usr/bin/env python3
"""
Update user role to admin
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
    # Zeige alle Benutzer
    cursor.execute("SELECT id, email, roles FROM users")
    users = cursor.fetchall()
    
    print("Aktuelle Benutzer:")
    for user in users:
        print(f"ID: {user[0]}, Email: {user[1]}, Roles: {user[2]}")
    
    # Update the user's role to admin
    # Assuming you want to update the first user or a specific email
    email = input("\nGeben Sie die E-Mail-Adresse des Benutzers ein, der Admin werden soll: ")
    
    cursor.execute("UPDATE users SET roles = 'admin' WHERE email = ?", (email,))
    affected_rows = cursor.rowcount
    
    if affected_rows > 0:
        conn.commit()
        print(f"\nBenutzer '{email}' wurde erfolgreich zum Administrator gemacht.")
    else:
        print(f"\nKein Benutzer mit E-Mail '{email}' gefunden.")
    
    # Zeige die aktualisierten Benutzer
    cursor.execute("SELECT id, email, roles FROM users")
    users = cursor.fetchall()
    
    print("\nAktualisierte Benutzer:")
    for user in users:
        print(f"ID: {user[0]}, Email: {user[1]}, Roles: {user[2]}")
        
except sqlite3.Error as e:
    print(f"Datenbankfehler: {e}")
    conn.rollback()
finally:
    conn.close()