#!/usr/bin/env python3
import sqlite3
import hashlib
import os

# Database path
db_path = '/opt/nscale-assist/data/db/users.db'

# User credentials
email = 'admin@example.com'
password = 'admin123'

# Hash the password
password_hash = hashlib.sha256(password.encode()).hexdigest()

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Update password
cursor.execute('''
    UPDATE users 
    SET password_hash = ? 
    WHERE email = ?
''', (password_hash, email))

# Commit changes
conn.commit()

# Verify update
cursor.execute('SELECT email, role, password_hash FROM users WHERE email = ?', (email,))
user = cursor.fetchone()

if user:
    print(f"Password updated for {user[0]}")
    print(f"Role: {user[1]}")
    print(f"Password hash: {user[2][:20]}...")
    print(f"\nYou can now login with:")
    print(f"Email: {email}")
    print(f"Password: {password}")
else:
    print(f"User {email} not found!")

conn.close()