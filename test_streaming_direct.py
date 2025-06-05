#!/usr/bin/env python3
"""
Direct test of streaming functionality
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8000"
TOKEN = None
SESSION_ID = None

def get_token():
    """Login and get token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "martin@danglefeet.com",
        "password": "123"
    })
    
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def create_session(token):
    """Create a new session"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"{BASE_URL}/api/chat/sessions", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        return data.get("id")
    else:
        print(f"Session creation failed: {response.status_code} - {response.text}")
        return None

def test_streaming(token, session_id):
    """Test streaming endpoint"""
    print("\n=== Testing Streaming Endpoint ===")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "text/event-stream"
    }
    
    params = {
        "question": "Hallo, kannst du mir in einem kurzen Satz antworten?",
        "session_id": session_id
    }
    
    try:
        with requests.get(
            f"{BASE_URL}/api/chat/message/stream",
            headers=headers,
            params=params,
            stream=True
        ) as response:
            
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            
            if response.status_code != 200:
                print(f"Error response: {response.text}")
                return
            
            print("\nStreaming response:")
            print("-" * 50)
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith("data: "):
                        data_str = line_str[6:]
                        if data_str == "[DONE]":
                            print("\n[DONE]")
                            break
                        try:
                            data = json.loads(data_str)
                            if data.get("type") == "content":
                                print(data.get("content", ""), end="", flush=True)
                            elif data.get("type") == "done":
                                print(f"\n\nCompleted! Message ID: {data.get('messageId')}")
                            elif data.get("type") == "error":
                                print(f"\nError: {data.get('error')}")
                        except json.JSONDecodeError as e:
                            print(f"\nJSON decode error: {e}")
                            print(f"Raw data: {data_str}")
            
            print("-" * 50)
            
    except Exception as e:
        print(f"Streaming error: {e}")

def test_non_streaming(token, session_id):
    """Test non-streaming endpoint"""
    print("\n=== Testing Non-Streaming Endpoint ===")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "message": "Dies ist ein Test ohne Streaming.",
        "sessionId": session_id,
        "model": "llama3:8b-instruct-q4_1"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/chat",
            headers=headers,
            json=data,
            stream=True  # Still need to stream the SSE response
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error response: {response.text}")
            return
        
        print("\nResponse:")
        print("-" * 50)
        
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith("data: "):
                    data_str = line_str[6:]
                    try:
                        data = json.loads(data_str)
                        if data.get("type") == "content":
                            print(data.get("content", ""), end="", flush=True)
                        elif data.get("type") == "done":
                            print(f"\n\nCompleted! Message ID: {data.get('messageId')}")
                    except json.JSONDecodeError:
                        pass
        
        print("-" * 50)
        
    except Exception as e:
        print(f"Non-streaming error: {e}")

def test_get_messages(token, session_id):
    """Test getting messages"""
    print("\n=== Testing Get Messages ===")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(
        f"{BASE_URL}/api/chat/sessions/{session_id}/messages",
        headers=headers
    )
    
    print(f"Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Total messages: {data.get('total', 0)}")
        messages = data.get('messages', [])
        for msg in messages:
            print(f"- [{msg.get('role')}]: {msg.get('content', '')[:50]}...")
    else:
        print(f"Error: {response.text}")

def main():
    print("=== Streaming Test Script ===\n")
    
    # Get token
    print("1. Logging in...")
    token = get_token()
    if not token:
        print("Failed to get token!")
        return
    print(f"Token received: {token[:20]}...")
    
    # Create session
    print("\n2. Creating session...")
    session_id = create_session(token)
    if not session_id:
        print("Failed to create session!")
        return
    print(f"Session created: {session_id}")
    
    # Test streaming
    print("\n3. Testing streaming...")
    test_streaming(token, session_id)
    
    # Small delay
    time.sleep(1)
    
    # Test non-streaming
    print("\n4. Testing non-streaming...")
    test_non_streaming(token, session_id)
    
    # Small delay
    time.sleep(1)
    
    # Get messages
    print("\n5. Getting messages...")
    test_get_messages(token, session_id)

if __name__ == "__main__":
    main()