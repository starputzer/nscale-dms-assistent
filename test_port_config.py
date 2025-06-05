#!/usr/bin/env python3
"""Test port configuration after standardization"""

import os
import sys
import importlib.util

print("=" * 60)
print("PORT CONFIGURATION TEST")
print("=" * 60)

# Change to app directory
os.chdir('/opt/nscale-assist/app')
sys.path.insert(0, '/opt/nscale-assist/app')

# Test 1: Check Python config
print("\n1. Testing Python Backend Configuration:")
print("-" * 40)
try:
    from modules.core.config import Config
    print(f"✅ Config.PORT = {Config.PORT}")
    print(f"✅ Config.HOST = {Config.HOST}")
    assert Config.PORT == 8000, f"Expected PORT=8000, got {Config.PORT}"
    print("✅ Python backend correctly configured for port 8000")
except Exception as e:
    print(f"❌ Error loading config: {e}")

# Test 2: Check environment files
print("\n2. Testing Environment Files:")
print("-" * 40)
env_files = ['.env', '.env.development', '.env.production']
for env_file in env_files:
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            content = f.read()
            if 'VITE_API_URL' in content:
                for line in content.split('\n'):
                    if 'VITE_API_URL' in line and not line.strip().startswith('#'):
                        print(f"   {env_file}: {line.strip()}")
                        if ':8000' in line:
                            print(f"   ✅ Correctly points to port 8000")
                        else:
                            print(f"   ⚠️  May need update")

# Test 3: Check vite.config.ts
print("\n3. Testing Vite Configuration:")
print("-" * 40)
if os.path.exists('vite.config.ts'):
    with open('vite.config.ts', 'r') as f:
        content = f.read()
        if 'server:' in content and 'port:' in content:
            # Find the port configuration
            import re
            port_match = re.search(r'port:\s*(\d+)', content)
            proxy_match = re.search(r'target:.*?(\d{4})', content)
            
            if port_match:
                vite_port = port_match.group(1)
                print(f"   Vite dev server port: {vite_port}")
                if vite_port == "5173":
                    print("   ✅ Correctly set to 5173")
                else:
                    print(f"   ⚠️  Expected 5173, found {vite_port}")
            
            if proxy_match:
                proxy_port = proxy_match.group(1)
                print(f"   Proxy target port: {proxy_port}")
                if proxy_port == "8000":
                    print("   ✅ Correctly proxies to port 8000")
                else:
                    print(f"   ⚠️  Expected 8000, found {proxy_port}")

# Test 4: Summary
print("\n" + "=" * 60)
print("CONFIGURATION SUMMARY:")
print("=" * 60)
print("Backend (Python/FastAPI): Port 8000")
print("Frontend (Vite):         Port 5173")
print("\nTo start development servers:")
print("  Option 1: ./start-dev.sh")
print("  Option 2: python api/server.py & npm run dev")
print("=" * 60)