#!/usr/bin/env python3
"""
Update ADMIN_EMAILS environment variable to include martin@danglefeet.com
"""
import os
import sys
from pathlib import Path

# Find the .env file in the current or parent directories
env_path = None
current_dir = Path.cwd()
max_depth = 3
depth = 0

while depth < max_depth:
    potential_path = current_dir / '.env'
    if potential_path.exists():
        env_path = potential_path
        break
    current_dir = current_dir.parent
    depth += 1

if not env_path:
    # Create a new .env file in the current directory
    env_path = Path.cwd() / '.env'
    print(f"No .env file found. Creating a new one at {env_path}")

# Read the existing .env file if it exists
env_content = {}
if env_path.exists():
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                try:
                    key, value = line.split('=', 1)
                    env_content[key.strip()] = value.strip()
                except ValueError:
                    print(f"Warning: Could not parse line: {line}")

# Update the ADMIN_EMAILS variable
admin_emails = env_content.get('ADMIN_EMAILS', '')
admin_emails_list = [email.strip() for email in admin_emails.split(',') if email.strip()]

# Add martin@danglefeet.com if not already in the list
if 'martin@danglefeet.com' not in admin_emails_list:
    admin_emails_list.append('martin@danglefeet.com')
    
# Join the list back to a string
env_content['ADMIN_EMAILS'] = ','.join(admin_emails_list)

print(f"Updating ADMIN_EMAILS to: {env_content['ADMIN_EMAILS']}")

# Write the updated .env file
with open(env_path, 'w') as f:
    for key, value in env_content.items():
        f.write(f"{key}={value}\n")

print(f"Successfully updated {env_path}")