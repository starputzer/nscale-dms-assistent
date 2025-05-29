#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.auth.user_model import UserManager

# Initialize UserManager
user_manager = UserManager()

# Set password for admin@example.com
email = "admin@example.com"
new_password = "admin123"

# Update password
success = user_manager.update_password(email, new_password)

if success:
    print(f"Password updated successfully for {email}")
    print(f"New password: {new_password}")
    
    # Verify login works
    user = user_manager.authenticate_user(email, new_password)
    if user:
        print(f"Login verification successful! User role: {user['role']}")
    else:
        print("Login verification failed!")
else:
    print(f"Failed to update password for {email}")