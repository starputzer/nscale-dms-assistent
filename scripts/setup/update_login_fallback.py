#!/usr/bin/env python3
"""
Update the server's login fallback to use martin@danglefeet.com
"""
import os
import sys
from pathlib import Path

# Path to the server.py file
server_path = Path(__file__).parent / "api" / "server.py"

if not server_path.exists():
    print(f"Server file not found: {server_path}")
    sys.exit(1)

# Read the server file
with open(server_path, 'r') as f:
    server_content = f.read()

# Update the fallback email and password
fallback_email = "martin@danglefeet.com"
fallback_password = "123"

# Find the section with the fallback code
fallback_start = server_content.find("# Fallback: Verwende Test-Credentials")
if fallback_start == -1:
    print("Fallback section not found in server.py")
    sys.exit(1)

# Find the lines with the email and password settings
old_fallback_lines = server_content[fallback_start:].split('\n')
updated_fallback_lines = []

for line in old_fallback_lines:
    if 'email =' in line:
        updated_fallback_lines.append(f'        email = "{fallback_email}"')
    elif 'password =' in line and not 'empty' in line:
        updated_fallback_lines.append(f'        password = "{fallback_password}"')
    else:
        updated_fallback_lines.append(line)

# Replace the old fallback section with the new one
updated_server_content = server_content[:fallback_start] + '\n'.join(updated_fallback_lines)

# Write the updated server file
with open(server_path, 'w') as f:
    f.write(updated_server_content)

print(f"Server file {server_path} updated with fallback credentials:")
print(f"Email: {fallback_email}")
print(f"Password: {fallback_password}")

print("\nYou may need to restart the server for changes to take effect.")