#!/usr/bin/env python3
"""Test import order and Config loading"""

print("1. Before any imports")
import os
print(f"   SECRET_KEY from env (before dotenv): {os.getenv('SECRET_KEY')}")

print("\n2. Loading dotenv")
from dotenv import load_dotenv
load_dotenv()
print(f"   SECRET_KEY from env (after dotenv): {os.getenv('SECRET_KEY')}")

print("\n3. Importing Config")
from modules.core.config import Config
print(f"   Config.SECRET_KEY: {Config.SECRET_KEY}")

print("\n4. Testing if they match")
env_key = os.getenv('SECRET_KEY')
config_key = Config.SECRET_KEY
print(f"   env_key == config_key: {env_key == config_key}")

print("\n5. Server loads dotenv early, let's simulate:")
# The issue is when server.py runs, it loads Config before dotenv
import sys
# Clear the module cache
if 'modules.core.config' in sys.modules:
    del sys.modules['modules.core.config']
    
# Now import again
from modules.core.config import Config as Config2
print(f"   Config2.SECRET_KEY: {Config2.SECRET_KEY}")