#!/usr/bin/env python3
"""
Direct streaming endpoint test using Python
Tests SSE streaming without browser dependencies
"""

import json
import sys
import time
import argparse
from datetime import datetime
import requests
from typing import Optional, Iterator


def parse_sse_line(line: str) -> Optional[dict]:
    """Parse a single SSE line"""
    if line.startswith('data: '):
        try:
            return json.loads(line[6:])
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            print(f"Raw data: {line[6:]}")
    return None


def test_streaming(
    question: str = "Was ist nscale?",
    auth_token: Optional[str] = None,
    session_id: Optional[str] = None,
    api_url: str = "http://localhost:5000/api/question/stream"
) -> None:
    """Test the streaming endpoint"""
    
    print("=== Direct Streaming Test (Python) ===")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API URL: {api_url}")
    print(f"Question: {question}")
    
    if not session_id:
        session_id = f"test-session-{int(time.time())}"
    print(f"Session ID: {session_id}")
    
    # Prepare request
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
    }
    
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
        print("Auth: Token provided")
    else:
        print("Auth: No token")
    
    payload = {
        'question': question,
        'session_id': session_id,
        'context': [],
        'stream': True
    }
    
    print("\nRequest payload:")
    print(json.dumps(payload, indent=2))
    
    print("\nRequest headers:")
    for key, value in headers.items():
        print(f"  {key}: {value}")
    
    # Send request
    print("\n--- Sending request ---")
    start_time = time.time()
    event_count = 0
    token_count = 0
    full_message = ""
    
    try:
        # Use stream=True for streaming response
        response = requests.post(
            api_url,
            json=payload,
            headers=headers,
            stream=True,
            timeout=30
        )
        
        print(f"Response status: {response.status_code} {response.reason}")
        print("Response headers:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")
        
        if response.status_code != 200:
            print(f"\nError response: {response.text}")
            return
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        if 'text/event-stream' not in content_type:
            print(f"\nWarning: Expected text/event-stream, got: {content_type}")
            print(f"Response body: {response.text}")
            return
        
        print("\n--- Reading SSE stream ---")
        
        # Process SSE stream
        buffer = ""
        for chunk in response.iter_content(chunk_size=1, decode_unicode=True):
            if chunk:
                buffer += chunk
                
                # Process complete lines
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    
                    if not line:
                        continue
                    
                    if line.startswith('data: '):
                        event_count += 1
                        data = parse_sse_line(line)
                        
                        if data:
                            print(f"\nEvent {event_count}: {json.dumps(data)}")
                            
                            if 'token' in data:
                                token_count += 1
                                token = data['token']
                                full_message += token
                                print(f"Token {token_count}: {repr(token)}", end='', flush=True)
                            
                            if data.get('done'):
                                print("\n\n✅ Stream complete signal received")
                                break
                            
                            if 'error' in data:
                                print(f"\n❌ Stream error: {data['error']}")
                                break
        
        duration = time.time() - start_time
        
        print("\n\n--- Summary ---")
        print(f"Total events: {event_count}")
        print(f"Total tokens: {token_count}")
        print(f"Duration: {duration:.2f} seconds")
        print(f"Avg time per token: {duration/token_count:.3f}s" if token_count > 0 else "N/A")
        print(f"\nFull message: {repr(full_message)}")
        print(f"Message preview: {full_message[:200]}{'...' if len(full_message) > 200 else ''}")
        
    except requests.exceptions.Timeout:
        print("\n❌ Request timed out")
    except requests.exceptions.ConnectionError as e:
        print(f"\n❌ Connection error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


def test_non_streaming(
    question: str = "Was ist nscale?",
    auth_token: Optional[str] = None,
    api_url: str = "http://localhost:5000/api/question"
) -> None:
    """Test non-streaming endpoint for comparison"""
    
    print("\n=== Non-Streaming Test (for comparison) ===")
    
    headers = {
        'Content-Type': 'application/json',
    }
    
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
    
    payload = {
        'question': question,
        'session_id': f"test-session-{int(time.time())}",
        'context': [],
        'stream': False
    }
    
    try:
        start_time = time.time()
        response = requests.post(api_url, json=payload, headers=headers)
        duration = time.time() - start_time
        
        print(f"Response status: {response.status_code}")
        print(f"Duration: {duration:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if 'answer' in data:
                print(f"\nAnswer preview: {data['answer'][:200]}{'...' if len(data['answer']) > 200 else ''}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")


def main():
    parser = argparse.ArgumentParser(description='Test streaming endpoint directly')
    parser.add_argument('question', nargs='?', default='Was ist nscale?', help='Question to ask')
    parser.add_argument('--token', '-t', help='Auth token')
    parser.add_argument('--session', '-s', help='Session ID')
    parser.add_argument('--url', '-u', default='http://localhost:5000/api/question/stream', help='API URL')
    parser.add_argument('--non-streaming', '-n', action='store_true', help='Test non-streaming endpoint')
    parser.add_argument('--both', '-b', action='store_true', help='Test both streaming and non-streaming')
    
    args = parser.parse_args()
    
    if args.non_streaming:
        test_non_streaming(args.question, args.token)
    elif args.both:
        test_streaming(args.question, args.token, args.session, args.url)
        test_non_streaming(args.question, args.token)
    else:
        test_streaming(args.question, args.token, args.session, args.url)


if __name__ == '__main__':
    main()