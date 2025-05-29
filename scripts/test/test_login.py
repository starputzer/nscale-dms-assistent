#!/usr/bin/env python3
"""
Test login for martin@danglefeet.com
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.auth.user_model import UserManager

# Initialize the user manager
user_manager = UserManager()

# Try logging in
email = "martin@danglefeet.com"
password = "123"

token = user_manager.authenticate(email, password)

if token:
    print(f"Authentication successful for {email}!")
    print(f"Token: {token[:30]}...")
    
    # Get user details
    user = user_manager.get_user_by_email(email)
    if user:
        print(f"\nUser details:")
        print(f"ID: {user.get('id')}")
        print(f"Email: {user.get('email')}")
        print(f"Role: {user.get('role')}")
        print(f"Created at: {user.get('created_at')}")
        print(f"Last login: {user.get('last_login')}")
else:
    print(f"Authentication failed for {email} with password {password}")
    
    # Try with other passwords for debugging
    test_passwords = ["test", "admin", "123456", "password"]
    for test_password in test_passwords:
        token = user_manager.authenticate(email, test_password)
        if token:
            print(f"But authentication succeeded with password: {test_password}")
            break