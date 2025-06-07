import sys
import os
from datetime import datetime, timedelta
from jose import jwt

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Generate a fresh admin token
SECRET_KEY = "generate-a-secure-random-key-in-production"

# Create token that expires in 7 days
expiry = datetime.utcnow() + timedelta(days=7)
token_data = {
    "sub": "martin@danglefeet.com",
    "user_id": 1,
    "email": "martin@danglefeet.com",
    "role": "admin",
    "exp": expiry
}

token = jwt.encode(token_data, SECRET_KEY, algorithm="HS256")

print(f"Fresh Admin Token (expires {expiry}):")
print(token)