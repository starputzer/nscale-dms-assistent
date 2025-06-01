#!/usr/bin/env python3
"""
Test script to verify SSE streaming fix
"""
import asyncio
import aiohttp
import json
import sys


async def test_sse_streaming():
    # First login to get token
    async with aiohttp.ClientSession() as session:
        # Login
        login_data = {
            "email": "admin@nscale.com",
            "password": "admin123"
        }
        
        async with session.post('http://localhost:8000/api/auth/login', json=login_data) as resp:
            if resp.status != 200:
                print(f"Login failed: {resp.status}")
                return
            
            login_result = await resp.json()
            token = login_result['access_token']
            print(f"Login successful, token: {token[:20]}...")
        
        # Test SSE streaming
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        params = {
            'question': 'Was ist nscale?',
            'session_id': 'test-session-123'
        }
        
        print("\nTesting SSE streaming endpoint...")
        print("=" * 50)
        
        async with session.get(
            'http://localhost:8000/api/question/stream',
            headers=headers,
            params=params
        ) as resp:
            print(f"Response status: {resp.status}")
            print(f"Content-Type: {resp.headers.get('Content-Type')}")
            print("\nSSE Stream:")
            print("-" * 50)
            
            buffer = ""
            async for chunk in resp.content.iter_any():
                chunk_text = chunk.decode('utf-8')
                buffer += chunk_text
                
                # Process complete lines
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    if line.strip():
                        print(f"RAW LINE: {repr(line)}")
                        
                        # Check for double data: prefix
                        if line.startswith("data: data:"):
                            print("❌ ERROR: Double 'data:' prefix detected!")
                            print(f"   Full line: {line}")
                        elif line.startswith("data: "):
                            try:
                                data = json.loads(line[6:])
                                if 'response' in data:
                                    print(f"✅ Token: {repr(data['response'])}")
                                elif 'error' in data:
                                    print(f"⚠️  Error: {data['error']}")
                            except json.JSONDecodeError as e:
                                print(f"❌ JSON parse error: {e}")
                                print(f"   Data: {line[6:]}")
                        elif line.startswith("event:"):
                            print(f"📢 Event: {line}")


if __name__ == "__main__":
    asyncio.run(test_sse_streaming())