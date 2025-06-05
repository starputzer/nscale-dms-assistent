#!/usr/bin/env python3
"""Start server for testing all endpoints"""

import subprocess
import time
import os
import signal

# Kill any existing process on port 5174
try:
    result = subprocess.run(['lsof', '-t', '-i:5174'], capture_output=True, text=True)
    if result.stdout.strip():
        for pid in result.stdout.strip().split('\n'):
            os.kill(int(pid), signal.SIGKILL)
            print(f"Killed process {pid}")
        time.sleep(2)
except:
    pass

# Set port to 5175 temporarily
os.environ['PORT'] = '5175'

# Start server
print("Starting server on port 5175...")
subprocess.run(['python3', 'api/server.py'])